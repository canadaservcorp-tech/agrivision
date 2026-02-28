"""
Camera Receiver Service
HTTP server that accepts JPEG images from ESP32-S3 camera nodes.
Each image is saved locally and queued for AI processing.
"""

import logging
import shutil
from pathlib import Path
from datetime import datetime
from aiohttp import web

logger = logging.getLogger("hub.camera")


class CameraReceiver:
    """HTTP server to receive images from camera nodes"""

    def __init__(self, settings, storage):
        self.settings = settings
        self.storage = storage
        self.app = web.Application(client_max_size=settings.MAX_IMAGE_SIZE_MB * 1024 * 1024)
        self._setup_routes()

    def _setup_routes(self):
        self.app.router.add_post("/api/image", self.receive_image)
        self.app.router.add_post("/api/upload", self.receive_image)  # Alias for production firmware
        self.app.router.add_post("/api/heartbeat", self.receive_heartbeat)
        self.app.router.add_get("/api/node-config", self.get_node_config)

        # Central unit management API (for desktop/web/mobile dashboards)
        self.app.router.add_get("/api/storage/status", self.get_storage_status)
        self.app.router.add_get("/api/mode", self.get_mode)
        self.app.router.add_post("/api/mode", self.set_mode)

        self.app.router.add_get("/api/status", self.get_status)
        self.app.router.add_get("/health", self.health_check)

    async def start(self):
        """Start HTTP server"""
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, self.settings.RECEIVER_HOST, self.settings.RECEIVER_PORT)
        await site.start()
        logger.info(f"📷 Camera receiver listening on :{self.settings.RECEIVER_PORT}")

        # Keep running
        while True:
            import asyncio
            await asyncio.sleep(3600)

    async def receive_image(self, request):
        """
        POST /api/image
        Receives JPEG image from ESP32 camera node.
        Headers: X-Node-Serial, X-Battery, X-WiFi-RSSI
        Body: raw JPEG bytes
        """
        try:
            # Extract metadata from headers
            serial = request.headers.get("X-Node-Serial", "unknown")
            battery = request.headers.get("X-Battery", "0")
            rssi = request.headers.get("X-WiFi-RSSI", "0")
            firmware = request.headers.get("X-Firmware", "unknown")
            captures = request.headers.get("X-Captures-Today", "0")

            # Read image data
            image_data = await request.read()
            if not image_data:
                return web.json_response({"error": "Empty image"}, status=400)

            # Validate JPEG
            if image_data[:2] != b'\xff\xd8':
                return web.json_response({"error": "Invalid JPEG"}, status=400)

            # Generate filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            date_dir = datetime.utcnow().strftime("%Y-%m-%d")
            save_dir = self.settings.IMAGES_DIR / serial / date_dir
            save_dir.mkdir(parents=True, exist_ok=True)
            filename = f"{serial}_{timestamp}.jpg"
            filepath = save_dir / filename

            # Save image
            filepath.write_bytes(image_data)

            # Record metadata
            metadata = {
                "camera_serial": serial,
                "battery": float(battery),
                "rssi": int(rssi),
                "firmware": firmware,
                "captures_today": int(captures),
                "file_size": len(image_data),
                "filepath": str(filepath),
                "received_at": datetime.utcnow().isoformat(),
            }
            self.storage.save_image_metadata(filepath, metadata)

            # Update fleet manager
            self.storage.update_camera_status(serial, {
                "online": True,
                "battery": float(battery),
                "rssi": int(rssi),
                "last_image": str(filepath),
                "last_contact": datetime.utcnow().isoformat(),
            })

            logger.info(
                f"📸 {serial}: {len(image_data)/1024:.0f}KB | "
                f"🔋{battery}V | 📶{rssi}dBm | #{captures}"
            )

            # Response — can include commands for the node
            response = {"status": "ok", "received": filename}

            # Check if node needs config update
            node_config = self.storage.get_pending_node_commands(serial)
            if node_config:
                response.update(node_config)

            return web.json_response(response)

        except Exception as e:
            logger.error(f"Image receive error: {e}")
            return web.json_response({"error": str(e)}, status=500)

    async def receive_heartbeat(self, request):
        """
        POST /api/heartbeat
        Receives periodic health status from production ESP32 camera nodes.
        Returns pending commands (if any).
        """
        try:
            import json as _json
            body = await request.read()
            data = _json.loads(body) if body else {}

            serial = data.get("serial", request.headers.get("X-Node-Serial", "unknown"))
            battery_pct = data.get("battery_pct", 0)
            rssi = data.get("rssi", 0)
            firmware = data.get("firmware", "unknown")
            power_profile = data.get("power_profile", "unknown")
            sd_available = data.get("sd_available", False)
            sd_buffered = data.get("sd_buffered", 0)
            images_today = data.get("images_today", 0)
            uptime_sec = data.get("uptime_sec", 0)

            # Update fleet manager with heartbeat data
            self.storage.update_camera_status(serial, {
                "online": True,
                "battery_pct": battery_pct,
                "rssi": rssi,
                "firmware": firmware,
                "power_profile": power_profile,
                "sd_available": sd_available,
                "sd_buffered": sd_buffered,
                "images_today": images_today,
                "uptime_sec": uptime_sec,
                "last_contact": datetime.utcnow().isoformat(),
            })

            logger.info(
                f"💓 {serial}: 🔋{battery_pct}% | 📶{rssi}dBm | "
                f"📸{images_today} | SD:{sd_buffered} | {power_profile}"
            )

            # Build response with any pending commands
            response = {"status": "ok", "server_time": datetime.utcnow().isoformat()}
            commands = self.storage.get_pending_node_commands(serial)
            if commands:
                response.update(commands)

            return web.json_response(response)

        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
            return web.json_response({"error": str(e)}, status=500)

    async def get_node_config(self, request):
        """
        GET /api/node-config?serial=CAM-001
        Camera node requests its configuration on boot.
        """
        serial = request.query.get("serial", "")
        if not serial:
            return web.json_response({"error": "serial required"}, status=400)

        config = {
            "hub_serial": self.settings.HUB_SERIAL,
            "capture_interval": 15,  # minutes
            "flash_enabled": False,
            "autofocus_enabled": True,
            "image_quality": 10,
            "frame_size": 13,  # QSXGA
            "server_time": datetime.utcnow().isoformat(),
        }

        # Check for pending commands for this node
        commands = self.storage.get_pending_node_commands(serial)
        if commands:
            config.update(commands)

        logger.info(f"📋 Config requested by {serial}")
        return web.json_response(config)

    async def get_storage_status(self, request):
        """GET /api/storage/status — external HDD + storage paths"""
        paths = self.settings.get_storage_paths()
        hdd_mounted = self.settings.is_hdd_mounted()

        try:
            total, used, free = shutil.disk_usage(Path(paths["root"]))
            disk = {
                "total_gb": round(total / (1024 ** 3), 1),
                "used_gb": round(used / (1024 ** 3), 1),
                "free_gb": round(free / (1024 ** 3), 1),
                "used_pct": round((used / total) * 100, 1) if total else 0,
            }
        except Exception:
            disk = {}

        return web.json_response({
            "hdd_mounted": hdd_mounted,
            "hdd_mount_path": str(self.settings.HDD_MOUNT_PATH),
            "active_root": paths["root"],
            "paths": paths,
            "disk": disk,
        })

    async def get_mode(self, request):
        """GET /api/mode — current system mode + constraints"""
        hdd_mounted = self.settings.is_hdd_mounted()
        mode = self.storage.get_state("system_mode", self.settings.DEFAULT_MODE)
        if mode not in ("monitoring", "cctv"):
            mode = self.settings.DEFAULT_MODE

        # Enforce: CCTV requires HDD
        if mode == "cctv" and not hdd_mounted:
            mode = "monitoring"
            self.storage.set_state("system_mode", mode)

        return web.json_response({
            "mode": mode,
            "allowed_modes": ["monitoring", "cctv"],
            "cctv_allowed": hdd_mounted,
            "hdd_required_for_cctv": True,
        })

    async def set_mode(self, request):
        """POST /api/mode — set system mode"""
        try:
            import json as _json
            body = await request.read()
            data = _json.loads(body) if body else {}
            mode = data.get("mode")

            if mode not in ("monitoring", "cctv"):
                return web.json_response({"error": "mode must be 'monitoring' or 'cctv'"}, status=400)

            if mode == "cctv" and not self.settings.is_hdd_mounted():
                return web.json_response({"error": "CCTV mode requires HDD mounted at /mnt/hdd"}, status=400)

            self.storage.set_state("system_mode", mode)
            return web.json_response({"status": "ok", "mode": mode})

        except Exception as e:
            logger.error(f"Set mode error: {e}")
            return web.json_response({"error": str(e)}, status=500)

    async def get_status(self, request):
        """GET /api/status — Hub status overview"""
        mode = self.storage.get_state("system_mode", self.settings.DEFAULT_MODE)
        return web.json_response({
            "hub_serial": self.settings.HUB_SERIAL,
            "firmware": self.settings.FIRMWARE_VERSION,
            "mode": mode,
            "hdd_mounted": self.settings.is_hdd_mounted(),
            "uptime": "TODO",
            "storage_used_gb": self.storage.get_used_gb(),
            "images_today": self.storage.get_today_image_count(),
            "detections_today": self.storage.get_today_detection_count(),
        })

    async def health_check(self, request):
        """GET /health"""
        return web.json_response({"status": "ok"})

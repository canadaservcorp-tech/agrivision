"""
Fleet Manager Service
Tracks all camera nodes connected to this hub.
Monitors health, detects offline nodes, sends alerts.
"""

import asyncio
import logging
from datetime import datetime, timedelta

logger = logging.getLogger("hub.fleet")


class CameraNodeStatus:
    def __init__(self, serial):
        self.serial = serial
        self.online = False
        self.battery = 0.0
        self.rssi = 0
        self.last_image = None
        self.last_contact = None
        self.images_today = 0
        self.firmware = "unknown"
        self.registered_at = datetime.utcnow()


class FleetManager:
    """Manages the fleet of camera nodes connected to this hub"""

    def __init__(self, settings, storage):
        self.settings = settings
        self.storage = storage
        self.cameras: dict[str, CameraNodeStatus] = {}

    async def start(self):
        """Start fleet monitoring loop"""
        logger.info(f"🛰️ Fleet manager started (max {self.settings.MAX_CAMERAS} cameras)")

        while True:
            self._check_camera_health()
            await asyncio.sleep(60)  # Check every minute

    def register_camera(self, serial: str, metadata: dict = None):
        """Register or update a camera node"""
        if serial not in self.cameras:
            self.cameras[serial] = CameraNodeStatus(serial)
            logger.info(f"📷 New camera registered: {serial}")

        cam = self.cameras[serial]
        cam.online = True
        cam.last_contact = datetime.utcnow()

        if metadata:
            cam.battery = metadata.get("battery", cam.battery)
            cam.rssi = metadata.get("rssi", cam.rssi)
            cam.last_image = metadata.get("last_image", cam.last_image)
            cam.firmware = metadata.get("firmware", cam.firmware)

    def _check_camera_health(self):
        """Check for offline or unhealthy cameras"""
        timeout = timedelta(seconds=self.settings.CAMERA_TIMEOUT_SEC)
        now = datetime.utcnow()

        for serial, cam in self.cameras.items():
            if cam.online and cam.last_contact:
                if now - cam.last_contact > timeout:
                    cam.online = False
                    logger.warning(f"⚠️ Camera {serial} went OFFLINE (no contact for {self.settings.CAMERA_TIMEOUT_SEC}s)")

                # Battery warning
                if cam.battery < 15 and cam.battery > 0:
                    logger.warning(f"🔋 Camera {serial} LOW BATTERY: {cam.battery}%")

    def get_online_cameras(self) -> list:
        """Return list of online camera serials"""
        return [s for s, c in self.cameras.items() if c.online]

    def get_fleet_status(self) -> dict:
        """Full fleet status report"""
        return {
            "total": len(self.cameras),
            "online": len([c for c in self.cameras.values() if c.online]),
            "offline": len([c for c in self.cameras.values() if not c.online]),
            "cameras": [{
                "serial": c.serial,
                "online": c.online,
                "battery": c.battery,
                "rssi": c.rssi,
                "last_contact": c.last_contact.isoformat() if c.last_contact else None,
                "last_image": c.last_image,
            } for c in self.cameras.values()]
        }

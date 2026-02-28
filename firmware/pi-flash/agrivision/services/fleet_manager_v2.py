"""
AgriVision Enhanced Fleet Manager v3.0
======================================
Manages multiple camera nodes with:
- mDNS auto-discovery of new cameras
- OTA firmware update distribution
- Health scoring (battery, signal, uptime, image quality)
- Capture scheduling to avoid simultaneous uploads
- Camera grouping by zone
- Automatic failover and redundancy

© 2026 PCTA S.A.
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger("fleet_manager_v2")

# ============================================================
# DATA MODELS
# ============================================================

@dataclass
class CameraNode:
    serial: str
    mac_address: str = ""
    firmware_version: str = "0.0.0"
    
    # Status
    online: bool = False
    last_contact: float = 0
    last_image: float = 0
    boot_count: int = 0
    
    # Health metrics
    battery_mv: int = 0
    battery_percent: int = 100
    rssi: int = 0
    signal_quality: str = "good"  # good, fair, poor, critical
    
    # SD card
    sd_available: bool = False
    sd_buffered: int = 0
    sd_total_mb: int = 0
    sd_used_mb: int = 0
    
    # Performance
    images_today: int = 0
    images_total: int = 0
    detections_today: int = 0
    upload_failures: int = 0
    avg_upload_ms: int = 0
    
    # Configuration
    capture_interval: int = 900  # seconds
    flash_enabled: bool = False
    autofocus_enabled: bool = True
    zone: str = "default"
    
    # OTA
    ota_pending: bool = False
    ota_version: str = ""
    
    # Calculated
    health_score: int = 100
    uptime_hours: float = 0
    
    # Pending commands for next check-in
    pending_commands: list = field(default_factory=list)


@dataclass
class CameraZone:
    name: str
    cameras: list = field(default_factory=list)
    coverage_radius: int = 35
    priority: str = "normal"  # low, normal, high, critical


# ============================================================
# FLEET MANAGER
# ============================================================

class EnhancedFleetManager:
    """Manages the camera fleet with health monitoring, OTA, and auto-discovery."""
    
    def __init__(self, settings, local_storage=None):
        self.settings = settings
        self.storage = local_storage
        self.cameras: dict[str, CameraNode] = {}
        self.zones: dict[str, CameraZone] = {"default": CameraZone(name="default")}
        self.firmware_path: Optional[Path] = None
        self.latest_firmware: str = "1.0.0"
        
        # Discovery
        self._discovery_running = False
        
        # Scheduling
        self._schedule: dict[str, int] = {}  # serial -> next_capture_time
        
    # ============================================================
    # CAMERA REGISTRATION & UPDATES
    # ============================================================
    
    def register_camera(self, serial: str, **kwargs) -> CameraNode:
        """Register or update a camera node."""
        if serial not in self.cameras:
            self.cameras[serial] = CameraNode(serial=serial)
            logger.info(f"New camera registered: {serial}")
        
        cam = self.cameras[serial]
        cam.online = True
        cam.last_contact = time.time()
        
        # Update fields from kwargs
        for key, value in kwargs.items():
            if hasattr(cam, key):
                setattr(cam, key, value)
        
        # Calculate battery percent from mV
        if cam.battery_mv > 0:
            cam.battery_percent = self._mv_to_percent(cam.battery_mv)
        
        # Signal quality
        cam.signal_quality = self._rssi_to_quality(cam.rssi)
        
        # Health score
        cam.health_score = self._calculate_health(cam)
        
        # Assign to zone if not set
        if cam.zone not in self.zones:
            self.zones[cam.zone] = CameraZone(name=cam.zone)
        if serial not in self.zones[cam.zone].cameras:
            self.zones[cam.zone].cameras.append(serial)
        
        # Check OTA
        if cam.firmware_version != self.latest_firmware and self.firmware_path:
            cam.ota_pending = True
            cam.ota_version = self.latest_firmware
        
        return cam
    
    def update_image_stats(self, serial: str, detection: bool = False):
        """Update stats after image received."""
        if serial in self.cameras:
            cam = self.cameras[serial]
            cam.images_today += 1
            cam.images_total += 1
            cam.last_image = time.time()
            if detection:
                cam.detections_today += 1
    
    # ============================================================
    # HEALTH SCORING
    # ============================================================
    
    def _calculate_health(self, cam: CameraNode) -> int:
        """
        Health score 0-100 based on:
        - Battery (30 points)
        - Signal (25 points)
        - Upload success rate (25 points)
        - Firmware currency (10 points)
        - SD card health (10 points)
        """
        score = 0
        
        # Battery (30 pts)
        if cam.battery_percent >= 80: score += 30
        elif cam.battery_percent >= 50: score += 22
        elif cam.battery_percent >= 25: score += 12
        elif cam.battery_percent >= 10: score += 5
        
        # Signal (25 pts)
        if cam.rssi >= -50: score += 25
        elif cam.rssi >= -65: score += 20
        elif cam.rssi >= -75: score += 12
        elif cam.rssi >= -85: score += 5
        
        # Upload success (25 pts)
        total = cam.images_total + cam.upload_failures
        if total > 0:
            success_rate = cam.images_total / total
            score += int(success_rate * 25)
        else:
            score += 25  # No data = assume good
        
        # Firmware (10 pts)
        if cam.firmware_version == self.latest_firmware:
            score += 10
        elif not cam.ota_pending:
            score += 5
        
        # SD card (10 pts)
        if cam.sd_available:
            if cam.sd_buffered == 0: score += 10
            elif cam.sd_buffered < 20: score += 6
            else: score += 2  # Many buffered = sync issues
        else:
            score += 7  # No SD = no offline buffer, mild concern
        
        return min(100, score)
    
    def _mv_to_percent(self, mv: int) -> int:
        """LiFePO4 voltage to percent (3.0V=0%, 3.35V=100%)."""
        if mv >= 3350: return 100
        if mv <= 3000: return 0
        return int((mv - 3000) / 3.5)
    
    def _rssi_to_quality(self, rssi: int) -> str:
        if rssi >= -50: return "excellent"
        if rssi >= -65: return "good"
        if rssi >= -75: return "fair"
        if rssi >= -85: return "poor"
        return "critical"
    
    # ============================================================
    # FLEET STATUS & HEALTH CHECKS
    # ============================================================
    
    async def health_check_loop(self, interval: int = 60):
        """Periodic health check for all cameras."""
        while True:
            await asyncio.sleep(interval)
            now = time.time()
            timeout = self.settings.get("CAMERA_TIMEOUT", 1800)
            
            for serial, cam in self.cameras.items():
                was_online = cam.online
                
                # Mark offline if no contact
                if now - cam.last_contact > timeout:
                    cam.online = False
                    if was_online:
                        logger.warning(f"Camera {serial} went offline (no contact for {int(now - cam.last_contact)}s)")
                
                # Battery warnings
                if cam.online and cam.battery_percent < 15:
                    logger.warning(f"Camera {serial} low battery: {cam.battery_percent}%")
                    cam.pending_commands.append({
                        "cmd": "update_interval",
                        "value": cam.capture_interval * 2  # Double interval to save battery
                    })
                
                # SD sync warnings
                if cam.sd_buffered > 50:
                    logger.warning(f"Camera {serial} has {cam.sd_buffered} buffered images!")
                
                # Recalculate health
                cam.health_score = self._calculate_health(cam)
            
            # Reset daily counters at midnight
            current_hour = datetime.now().hour
            if current_hour == 0:
                for cam in self.cameras.values():
                    cam.images_today = 0
                    cam.detections_today = 0
    
    def get_fleet_status(self) -> dict:
        """Complete fleet status report."""
        cams = list(self.cameras.values())
        online = [c for c in cams if c.online]
        
        return {
            "total_cameras": len(cams),
            "online": len(online),
            "offline": len(cams) - len(online),
            "avg_health": int(sum(c.health_score for c in cams) / max(len(cams), 1)),
            "avg_battery": int(sum(c.battery_percent for c in online) / max(len(online), 1)),
            "total_images_today": sum(c.images_today for c in cams),
            "total_detections_today": sum(c.detections_today for c in cams),
            "sd_buffered_total": sum(c.sd_buffered for c in cams),
            "cameras_needing_ota": len([c for c in cams if c.ota_pending]),
            "cameras_low_battery": len([c for c in online if c.battery_percent < 20]),
            "cameras_poor_signal": len([c for c in online if c.rssi < -80]),
            "zones": {name: {
                "cameras": len(zone.cameras),
                "online": len([s for s in zone.cameras if self.cameras.get(s, CameraNode("")).online]),
            } for name, zone in self.zones.items()},
            "cameras": [{
                "serial": c.serial,
                "online": c.online,
                "health": c.health_score,
                "battery": c.battery_percent,
                "rssi": c.rssi,
                "signal": c.signal_quality,
                "images_today": c.images_today,
                "detections_today": c.detections_today,
                "sd_buffered": c.sd_buffered,
                "firmware": c.firmware_version,
                "ota_pending": c.ota_pending,
                "zone": c.zone,
                "last_contact_ago": int(time.time() - c.last_contact) if c.last_contact else None,
            } for c in sorted(cams, key=lambda x: x.serial)],
        }
    
    # ============================================================
    # COMMANDS FOR CAMERA NODES
    # ============================================================
    
    def get_pending_commands(self, serial: str) -> list:
        """Get and clear pending commands for a camera."""
        if serial not in self.cameras:
            return []
        cam = self.cameras[serial]
        commands = cam.pending_commands.copy()
        cam.pending_commands.clear()
        return commands
    
    def send_command(self, serial: str, cmd: str, value=None):
        """Queue a command for a camera's next check-in."""
        if serial in self.cameras:
            self.cameras[serial].pending_commands.append({"cmd": cmd, "value": value})
            logger.info(f"Command queued for {serial}: {cmd}={value}")
    
    def broadcast_command(self, cmd: str, value=None, zone: str = None):
        """Send command to all cameras (or all in a zone)."""
        targets = self.cameras.values()
        if zone and zone in self.zones:
            serials = self.zones[zone].cameras
            targets = [self.cameras[s] for s in serials if s in self.cameras]
        
        for cam in targets:
            cam.pending_commands.append({"cmd": cmd, "value": value})
        
        logger.info(f"Broadcast: {cmd}={value} to {len(list(targets))} cameras")
    
    # ============================================================
    # OTA FIRMWARE UPDATES
    # ============================================================
    
    def set_firmware(self, firmware_path: str, version: str):
        """Set new firmware for OTA distribution."""
        self.firmware_path = Path(firmware_path)
        self.latest_firmware = version
        
        # Mark cameras needing update
        for cam in self.cameras.values():
            if cam.firmware_version != version:
                cam.ota_pending = True
                cam.ota_version = version
                cam.pending_commands.append({"cmd": "ota_update", "value": version})
        
        outdated = len([c for c in self.cameras.values() if c.ota_pending])
        logger.info(f"OTA firmware set: v{version}. {outdated} cameras need update.")
    
    def get_firmware_binary(self) -> Optional[bytes]:
        """Return firmware binary for HTTP OTA endpoint."""
        if self.firmware_path and self.firmware_path.exists():
            return self.firmware_path.read_bytes()
        return None
    
    # ============================================================
    # CAPTURE SCHEDULING
    # ============================================================
    
    def schedule_captures(self, interval: int = 900):
        """
        Stagger capture times across cameras to avoid WiFi congestion.
        Example: 10 cameras, 15min interval → each camera offset by 90s.
        """
        online_cameras = [c for c in self.cameras.values() if c.online]
        if not online_cameras:
            return
        
        offset = interval // max(len(online_cameras), 1)
        now = int(time.time())
        
        for i, cam in enumerate(sorted(online_cameras, key=lambda x: x.serial)):
            next_capture = now + (i * offset)
            self._schedule[cam.serial] = next_capture
            cam.pending_commands.append({
                "cmd": "set_capture_time",
                "value": next_capture
            })
        
        logger.info(f"Scheduled {len(online_cameras)} cameras with {offset}s offset")
    
    # ============================================================
    # AUTO-DISCOVERY (mDNS)
    # ============================================================
    
    async def discovery_loop(self, interval: int = 300):
        """
        Listen for new cameras announcing via mDNS.
        Cameras broadcast: _agrivision._tcp.local
        """
        self._discovery_running = True
        logger.info("Camera auto-discovery started")
        
        while self._discovery_running:
            try:
                # In production, use zeroconf library:
                # from zeroconf import Zeroconf, ServiceBrowser
                # browser = ServiceBrowser(zc, "_agrivision._tcp.local.", handlers=[on_found])
                
                # For now, check connected WiFi clients
                import subprocess
                result = subprocess.run(
                    ["iw", "dev", "wlan0", "station", "dump"],
                    capture_output=True, text=True, timeout=5
                )
                
                for line in result.stdout.split("\n"):
                    if "Station" in line:
                        mac = line.split()[1]
                        # Check if this is a known camera
                        known = any(c.mac_address == mac for c in self.cameras.values())
                        if not known:
                            logger.info(f"New device detected: {mac}")
                            
            except Exception as e:
                logger.debug(f"Discovery scan error: {e}")
            
            await asyncio.sleep(interval)
    
    def stop_discovery(self):
        self._discovery_running = False

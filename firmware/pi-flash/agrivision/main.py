"""
AgriVision Central Hub v3.0
===========================
Runs on Raspberry Pi 4B
Receives images from ESP32 camera nodes via WiFi
Runs TFLite AI disease detection locally
Syncs results + sensor data to cloud API via MQTT/HTTP

© 2026 Performance Cristal Technologies Avancées S.A.
"""

import asyncio
import logging
import signal
import sys
from pathlib import Path
from datetime import datetime

from config.settings import HubSettings
from services.wifi_ap import WiFiAPManager
from services.camera_receiver import CameraReceiver
from services.ai_detector import DiseaseDetector
from services.sensor_reader import SensorReader
from services.cloud_sync import CloudSync
from services.fleet_manager import FleetManager
from services.fleet_manager_v2 import EnhancedFleetManager
from services.local_storage import LocalStorage

# Optional services (graceful import)
try:
    from services.whatsapp_and_reports import WhatsAppService, PdfReportService
    HAS_WHATSAPP = True
except ImportError:
    HAS_WHATSAPP = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-18s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("hub.main")

# ============================================================
# ASCII Banner
# ============================================================
BANNER = """
╔══════════════════════════════════════════════╗
║     🌱 AgriVision Central Hub v3.0          ║
║     AI-Powered Agricultural Monitoring      ║
║     © 2026 PCTA S.A.                        ║
╚══════════════════════════════════════════════╝
"""


class AgriVisionHub:
    """Main hub orchestrator"""

    def __init__(self):
        self.settings = HubSettings()
        self.running = False

        # Core services
        self.storage = LocalStorage(self.settings)
        self.wifi_ap = WiFiAPManager(self.settings)
        self.camera_receiver = CameraReceiver(self.settings, self.storage)
        self.ai_detector = DiseaseDetector(self.settings)
        self.sensor_reader = SensorReader(self.settings)
        self.cloud_sync = CloudSync(self.settings)
        self.fleet_manager = FleetManager(self.settings, self.storage)

        # Enhanced fleet manager (auto-discovery, OTA, health scoring)
        self.fleet_v2 = EnhancedFleetManager(self.settings, self.storage)

        # Optional: WhatsApp alerts
        self.whatsapp = WhatsAppService() if HAS_WHATSAPP else None
        self.pdf_reports = PdfReportService() if HAS_WHATSAPP else None
        if self.whatsapp and self.whatsapp.enabled:
            logger.info("📱 WhatsApp alerts enabled")
        if self.pdf_reports and self.pdf_reports.available:
            logger.info("📄 PDF report generation enabled")

    async def start(self):
        """Start all hub services"""
        print(BANNER)
        logger.info(f"Hub Serial: {self.settings.HUB_SERIAL}")
        logger.info(f"Farm ID: {self.settings.FARM_ID}")
        logger.info(f"Cloud API: {self.settings.CLOUD_API_URL}")

        self.running = True

        # Initialize storage
        self.storage.initialize()
        logger.info("✅ Local storage ready")

        # Load AI model
        await self.ai_detector.load_model()
        logger.info("✅ AI model loaded")

        # Setup WiFi AP for camera nodes
        self.wifi_ap.setup()
        logger.info("✅ WiFi AP active")

        # Start all services concurrently
        tasks = [
            asyncio.create_task(self.camera_receiver.start(), name="camera-receiver"),
            asyncio.create_task(self.process_images_loop(), name="ai-processor"),
            asyncio.create_task(self.sensor_reader.start(), name="sensor-reader"),
            asyncio.create_task(self.cloud_sync.start(), name="cloud-sync"),
            asyncio.create_task(self.heartbeat_loop(), name="heartbeat"),
            asyncio.create_task(self.fleet_manager.start(), name="fleet-manager"),
        ]

        logger.info("🚀 All services started — hub is operational")
        logger.info(f"📷 Listening for camera nodes on port {self.settings.RECEIVER_PORT}")

        # Wait for all tasks
        try:
            await asyncio.gather(*tasks)
        except asyncio.CancelledError:
            logger.info("Services cancelled — shutting down")

    async def process_images_loop(self):
        """Process new images through AI detection"""
        logger.info("🧠 AI processing loop started")

        while self.running:
            # Check for unprocessed images
            pending = self.storage.get_pending_images()

            for image_path, metadata in pending:
                try:
                    # Run AI detection
                    result = await self.ai_detector.detect(image_path)

                    if result and result["confidence"] > self.settings.DETECTION_THRESHOLD:
                        logger.info(
                            f"🔬 DETECTION: {result['disease']} "
                            f"({result['confidence']*100:.0f}%) "
                            f"Severity: {result['severity']} "
                            f"Camera: {metadata.get('camera_serial', 'unknown')}"
                        )

                        # Save detection
                        detection = {
                            "disease_name": result["disease"],
                            "confidence": result["confidence"],
                            "severity": result["severity"],
                            "camera_serial": metadata.get("camera_serial"),
                            "image_path": str(image_path),
                            "annotated_path": result.get("annotated_path"),
                            "treatment": result.get("treatment", ""),
                            "detected_at": datetime.utcnow().isoformat(),
                        }
                        self.storage.save_detection(detection)

                        # Queue for cloud sync
                        self.cloud_sync.queue_detection(detection)
                    else:
                        logger.debug(f"No disease detected in {image_path.name}")

                    # Mark image as processed
                    self.storage.mark_processed(image_path)

                except Exception as e:
                    logger.error(f"AI processing error: {e}")

            # Wait before checking again
            await asyncio.sleep(5)

    async def heartbeat_loop(self):
        """Send periodic status to cloud"""
        logger.info("💓 Heartbeat loop started")

        while self.running:
            try:
                status = {
                    "hub_serial": self.settings.HUB_SERIAL,
                    "battery_level": self.sensor_reader.get_battery_level(),
                    "temperature": self.sensor_reader.get_hub_temperature(),
                    "signal_strength": self.wifi_ap.get_signal_strength(),
                    "storage_used_gb": self.storage.get_used_gb(),
                    "cameras_online": self.fleet_manager.get_online_cameras(),
                    "firmware_version": self.settings.FIRMWARE_VERSION,
                }

                await self.cloud_sync.send_heartbeat(status)
                logger.debug(f"💓 Heartbeat sent — {len(status['cameras_online'])} cameras online")

            except Exception as e:
                logger.warning(f"Heartbeat failed: {e}")

            await asyncio.sleep(self.settings.HEARTBEAT_INTERVAL_SEC)

    async def stop(self):
        """Graceful shutdown"""
        logger.info("🛑 Shutting down hub...")
        self.running = False
        await self.cloud_sync.flush()
        self.storage.close()
        logger.info("Hub stopped")


# ============================================================
# ENTRY POINT
# ============================================================

async def main():
    hub = AgriVisionHub()

    # Handle signals for clean shutdown
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(hub.stop()))

    await hub.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Hub stopped by user")
    except Exception as e:
        logger.critical(f"Fatal error: {e}")
        sys.exit(1)

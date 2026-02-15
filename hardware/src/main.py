#!/usr/bin/env python3
"""Agrivision Hardware Module — Raspberry Pi CM4 Orchestrator"""
import asyncio, json, logging, time
from datetime import datetime
from camera import CameraModule
from sensors import SensorModule
from disease_detector import DiseaseDetector
from uploader import DataUploader
from cache_manager import CacheManager
from health_monitor import HealthMonitor
from config import Config

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
log = logging.getLogger('agrivision')

class AgrivisionDevice:
    def __init__(self):
        self.config = Config()
        self.camera = CameraModule(self.config)
        self.sensors = SensorModule(self.config)
        self.detector = DiseaseDetector(self.config)
        self.uploader = DataUploader(self.config)
        self.cache = CacheManager(self.config)
        self.health = HealthMonitor(self.config)

    async def run_cycle(self):
        """Single monitoring cycle: capture → detect → read sensors → upload"""
        log.info("=== Starting monitoring cycle ===")
        try:
            # 1. Capture image
            image_path = self.camera.capture()
            log.info(f"Captured: {image_path}")

            # 2. Run disease detection
            predictions = self.detector.predict(image_path)
            top = predictions[0] if predictions else None
            if top and top['confidence'] > self.config.ALERT_THRESHOLD:
                log.warning(f"Disease detected: {top['disease']} ({top['confidence']:.1%})")

            # 3. Read sensors
            sensor_data = self.sensors.read_all()
            log.info(f"Sensors: temp={sensor_data.get('temperature')}°C, humidity={sensor_data.get('humidity')}%, soil={sensor_data.get('soil_moisture')}%")

            # 4. Get device health
            health_data = self.health.check()

            # 5. Build payload
            payload = {
                'device_uuid': self.config.DEVICE_UUID,
                'timestamp': datetime.utcnow().isoformat(),
                'sensor_data': sensor_data,
                'detections': predictions[:3] if predictions else [],
                'health': health_data,
                'image_path': image_path
            }

            # 6. Upload or cache
            success = await self.uploader.send(payload)
            if not success:
                self.cache.store(payload)
                log.warning("Upload failed — cached locally")
            else:
                # Flush any cached data
                cached = self.cache.get_pending()
                for item in cached:
                    if await self.uploader.send(item):
                        self.cache.mark_sent(item['id'])
                log.info("Cycle complete — data uploaded")

        except Exception as e:
            log.error(f"Cycle error: {e}")

    async def run(self):
        """Main loop"""
        log.info(f"Agrivision device {self.config.DEVICE_UUID} starting...")
        self.uploader.heartbeat()
        while True:
            await self.run_cycle()
            await asyncio.sleep(self.config.CAPTURE_INTERVAL)

if __name__ == '__main__':
    device = AgrivisionDevice()
    asyncio.run(device.run())

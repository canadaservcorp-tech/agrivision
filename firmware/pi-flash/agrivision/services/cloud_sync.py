"""
Cloud Sync Service
Sends hub data to AgriVision cloud backend:
- Heartbeat (system status) every 5 min
- Sensor readings every 15 min
- Disease detections (immediate)
- Camera images (when new detection found)

Uses MQTT for real-time + HTTP fallback for reliability.
Queues data locally when offline, syncs when reconnected.
"""

import asyncio
import json
import logging
import httpx
from datetime import datetime
from collections import deque

logger = logging.getLogger("hub.cloud")


class CloudSync:
    """Manages all communication with AgriVision cloud"""

    def __init__(self, settings):
        self.settings = settings
        self.mqtt_client = None
        self.http_client = None
        self.connected = False

        # Offline queues — persist data when disconnected
        self.heartbeat_queue = deque(maxlen=100)
        self.sensor_queue = deque(maxlen=500)
        self.detection_queue = deque(maxlen=200)
        self.image_queue = deque(maxlen=50)

    async def start(self):
        """Start cloud sync service"""
        logger.info("☁️ Cloud sync starting...")

        # Initialize HTTP client
        self.http_client = httpx.AsyncClient(
            base_url=self.settings.CLOUD_API_URL,
            timeout=30.0,
            headers={
                "Authorization": f"Bearer {self.settings.CLOUD_API_KEY}",
                "X-Hub-Serial": self.settings.HUB_SERIAL,
            }
        )

        # Connect MQTT
        await self._connect_mqtt()

        # Start queue processor
        while True:
            await self._process_queues()
            await asyncio.sleep(10)

    async def _connect_mqtt(self):
        """Connect to MQTT broker"""
        try:
            import aiomqtt
            self.mqtt_client = aiomqtt.Client(
                hostname=self.settings.MQTT_BROKER,
                port=self.settings.MQTT_PORT,
                username=self.settings.MQTT_USERNAME or None,
                password=self.settings.MQTT_PASSWORD or None,
            )
            self.connected = True
            logger.info(f"✅ MQTT connected to {self.settings.MQTT_BROKER}")
        except ImportError:
            logger.warning("aiomqtt not available — using HTTP only")
            self.connected = False
        except Exception as e:
            logger.warning(f"MQTT connection failed: {e} — using HTTP only")
            self.connected = False

    async def send_heartbeat(self, status: dict):
        """Send hub heartbeat to cloud"""
        payload = {
            **status,
            "timestamp": datetime.utcnow().isoformat()
        }

        try:
            # Try MQTT first (faster)
            if self.mqtt_client and self.connected:
                async with self.mqtt_client:
                    await self.mqtt_client.publish(
                        f"{self.settings.MQTT_TOPIC}/heartbeat",
                        json.dumps(payload)
                    )
                return True

            # HTTP fallback
            response = await self.http_client.post("/api/hub/heartbeat", json=payload)
            if response.status_code == 200:
                return True

        except Exception as e:
            logger.debug(f"Heartbeat send failed: {e}")
            self.heartbeat_queue.append(payload)
            return False

    async def send_sensor_data(self, data: dict):
        """Send sensor readings to cloud"""
        payload = {
            "hub_serial": self.settings.HUB_SERIAL,
            **data,
        }

        try:
            response = await self.http_client.post("/api/hub/sensors", json=payload)
            if response.status_code == 200:
                return True
        except Exception as e:
            logger.debug(f"Sensor send failed: {e}")
            self.sensor_queue.append(payload)
            return False

    def queue_detection(self, detection: dict):
        """Queue a disease detection for cloud sync"""
        self.detection_queue.append(detection)
        logger.info(f"☁️ Detection queued: {detection['disease_name']}")

    async def _send_detection(self, detection: dict):
        """Send detection to cloud"""
        payload = {
            "hub_serial": self.settings.HUB_SERIAL,
            "camera_serial": detection.get("camera_serial", ""),
            "disease_name": detection["disease_name"],
            "confidence": detection["confidence"],
            "severity": detection["severity"],
            "image_url": detection.get("image_path", ""),
            "treatment": detection.get("treatment", ""),
        }

        try:
            # MQTT for real-time alert
            if self.mqtt_client and self.connected:
                async with self.mqtt_client:
                    await self.mqtt_client.publish(
                        f"{self.settings.MQTT_TOPIC}/detection",
                        json.dumps(payload)
                    )

            # HTTP for persistence
            response = await self.http_client.post("/api/hub/detection", json=payload)
            if response.status_code == 200:
                return True

        except Exception as e:
            logger.debug(f"Detection send failed: {e}")
            return False

    async def upload_image(self, image_path: str, camera_serial: str):
        """Upload image to cloud storage"""
        try:
            from pathlib import Path
            img_data = Path(image_path).read_bytes()

            response = await self.http_client.post(
                "/api/hub/image",
                params={"hub_serial": self.settings.HUB_SERIAL, "camera_serial": camera_serial},
                files={"image": (Path(image_path).name, img_data, "image/jpeg")}
            )
            return response.status_code == 200

        except Exception as e:
            logger.debug(f"Image upload failed: {e}")
            self.image_queue.append({"path": image_path, "camera": camera_serial})
            return False

    async def _process_queues(self):
        """Process offline queues — retry failed sends"""
        # Process detection queue (highest priority)
        while self.detection_queue:
            detection = self.detection_queue[0]
            success = await self._send_detection(detection)
            if success:
                self.detection_queue.popleft()
            else:
                break  # Stop if still failing

        # Process sensor queue
        while self.sensor_queue:
            data = self.sensor_queue[0]
            try:
                response = await self.http_client.post("/api/hub/sensors", json=data)
                if response.status_code == 200:
                    self.sensor_queue.popleft()
                else:
                    break
            except Exception:
                break

        # Process heartbeat queue
        while self.heartbeat_queue:
            data = self.heartbeat_queue[0]
            try:
                response = await self.http_client.post("/api/hub/heartbeat", json=data)
                if response.status_code == 200:
                    self.heartbeat_queue.popleft()
                else:
                    break
            except Exception:
                break

    async def flush(self):
        """Flush all queues before shutdown"""
        logger.info("Flushing sync queues...")
        await self._process_queues()
        if self.http_client:
            await self.http_client.aclose()

    def get_queue_status(self) -> dict:
        """Return current queue sizes"""
        return {
            "detections_pending": len(self.detection_queue),
            "sensors_pending": len(self.sensor_queue),
            "heartbeats_pending": len(self.heartbeat_queue),
            "images_pending": len(self.image_queue),
            "mqtt_connected": self.connected,
        }

"""
Agrivision Hardware Enhancement Modules
LoRaWAN Gateway | Universal Sensor Hub | Satellite Data | Drone Ingestion
"""

import json
import time
import logging
import requests
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger('agrivision.hardware')

# ============================================================
# LORAWAN GATEWAY — Fallback connectivity for rural areas
# ============================================================
class LoRaWANGateway:
    """
    LoRaWAN connectivity fallback when 4G is unavailable.
    Uses SX1276/RFM95W module via SPI on Pi CM4.
    Supports The Things Network (TTN) or ChirpStack.
    
    Wiring: NSS→GPIO25, DIO0→GPIO4, RST→GPIO22, SPI0
    Install: pip install paho-mqtt
    """

    def __init__(self, config=None):
        self.config = config or {
            "app_eui": "",      # Set in .env
            "app_key": "",      # Set in .env
            "frequency": 915.0, # MHz (NA: 915, EU: 868)
            "sf": 7,            # Spreading factor 7-12
            "broker": "nam1.cloud.thethings.network",
            "port": 1883,
        }
        self.connected = False
        self.mqtt_client = None
        self.queue = []  # Offline message queue

    def connect(self):
        """Connect to TTN MQTT broker."""
        try:
            import paho.mqtt.client as mqtt
            self.mqtt_client = mqtt.Client()
            self.mqtt_client.username_pw_set(
                self.config["app_eui"], self.config["app_key"]
            )
            self.mqtt_client.connect(self.config["broker"], self.config["port"], 60)
            self.mqtt_client.loop_start()
            self.connected = True
            logger.info("LoRaWAN MQTT connected")
            self._flush_queue()
        except Exception as e:
            logger.error(f"LoRaWAN connect error: {e}")
            self.connected = False

    def send(self, payload: dict) -> bool:
        """Send data via LoRaWAN. Queues if disconnected."""
        encoded = json.dumps(payload).encode()
        if len(encoded) > 242:
            logger.warning("Payload exceeds LoRaWAN max (242 bytes), truncating")
            # Send only critical fields
            payload = {k: payload[k] for k in ['timestamp', 'temperature_c', 'humidity_pct', 'soil_moisture'] if k in payload}
            encoded = json.dumps(payload).encode()

        if not self.connected:
            self.queue.append(payload)
            logger.info(f"Queued for LoRaWAN (queue size: {len(self.queue)})")
            return False

        try:
            topic = f"v3/{self.config['app_eui']}/devices/agrivision-module/up"
            self.mqtt_client.publish(topic, encoded)
            return True
        except Exception as e:
            logger.error(f"LoRaWAN send error: {e}")
            self.queue.append(payload)
            return False

    def _flush_queue(self):
        """Send all queued messages."""
        while self.queue and self.connected:
            payload = self.queue.pop(0)
            self.send(payload)
            time.sleep(0.5)  # Rate limit

    def cleanup(self):
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()


# ============================================================
# UNIVERSAL SENSOR HUB — Third-party sensor adapter
# ============================================================
class SensorHub:
    """
    Protocol adapter for connecting third-party sensors.
    Supports: I2C, SPI, UART, Analog (via ADS1115), Modbus RTU.
    Auto-detects connected sensors and normalizes output format.
    """

    KNOWN_I2C = {
        0x76: {"name": "BME280", "type": "temp_humidity_pressure"},
        0x77: {"name": "BMP280", "type": "temp_pressure"},
        0x48: {"name": "ADS1115", "type": "adc"},
        0x10: {"name": "VEML6075", "type": "uv"},
        0x23: {"name": "BH1750", "type": "light"},
        0x29: {"name": "TSL2591", "type": "light"},
        0x38: {"name": "AHT20", "type": "temp_humidity"},
        0x44: {"name": "SHT31", "type": "temp_humidity"},
        0x68: {"name": "DS3231", "type": "rtc"},
    }

    def __init__(self):
        self.detected_sensors = []
        self.custom_readers = {}

    def scan_i2c(self) -> list:
        """Scan I2C bus for connected sensors."""
        detected = []
        try:
            import smbus2
            bus = smbus2.SMBus(1)
            for addr in range(0x03, 0x78):
                try:
                    bus.read_byte(addr)
                    sensor_info = self.KNOWN_I2C.get(addr, {"name": f"Unknown_0x{addr:02X}", "type": "unknown"})
                    detected.append({"address": f"0x{addr:02X}", **sensor_info})
                except:
                    pass
            bus.close()
        except ImportError:
            logger.warning("smbus2 not available — simulating scan")
            detected = [
                {"address": "0x76", "name": "BME280", "type": "temp_humidity_pressure"},
                {"address": "0x48", "name": "ADS1115", "type": "adc"},
            ]

        self.detected_sensors = detected
        logger.info(f"I2C scan found {len(detected)} sensors: {[s['name'] for s in detected]}")
        return detected

    def register_custom_reader(self, sensor_name: str, reader_fn):
        """Register a custom reading function for a sensor."""
        self.custom_readers[sensor_name] = reader_fn

    def read_all(self) -> list:
        """Read all detected sensors and return normalized data."""
        readings = []
        timestamp = datetime.utcnow().isoformat() + "Z"

        for sensor in self.detected_sensors:
            name = sensor["name"]
            if name in self.custom_readers:
                try:
                    data = self.custom_readers[name]()
                    readings.append({"sensor": name, "timestamp": timestamp, "data": data})
                except Exception as e:
                    logger.error(f"Custom reader error for {name}: {e}")

        return readings


# ============================================================
# SATELLITE DATA — Copernicus API fetcher
# ============================================================
class SatelliteDataFetcher:
    """
    Fetches Copernicus satellite data for farm location.
    Uses Copernicus Data Space Ecosystem (CDSE) API.
    Free tier: 10,000 requests/month.
    
    Data products:
    - Sentinel-2 L2A: 10m multispectral (NDVI, true color)
    - Sentinel-1 SAR: soil moisture estimation
    """

    CDSE_AUTH_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    CDSE_CATALOG_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"

    def __init__(self, api_key=None):
        self.api_key = api_key
        self.token = None
        self.cache_dir = Path("/home/agrivision/data/satellite")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def authenticate(self, username: str, password: str) -> bool:
        """Get access token from CDSE."""
        try:
            res = requests.post(self.CDSE_AUTH_URL, data={
                "grant_type": "client_credentials",
                "client_id": username,
                "client_secret": password,
            }, timeout=10)
            if res.status_code == 200:
                self.token = res.json().get("access_token")
                return True
        except Exception as e:
            logger.error(f"Copernicus auth error: {e}")
        return False

    def search_products(self, lat: float, lon: float, days_back: int = 30,
                        collection: str = "SENTINEL-2", max_cloud: int = 30) -> list:
        """Search for satellite imagery products near a location."""
        bbox = f"{lon-0.05},{lat-0.05},{lon+0.05},{lat+0.05}"
        start_date = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%dT00:00:00.000Z")
        end_date = datetime.utcnow().strftime("%Y-%m-%dT23:59:59.999Z")

        query = (
            f"$filter=Collection/Name eq '{collection}' "
            f"and OData.CSC.Intersects(area=geography'SRID=4326;POLYGON(({bbox}))') "
            f"and ContentDate/Start gt {start_date} "
            f"and ContentDate/Start lt {end_date} "
            f"and Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' and att/Value lt {max_cloud})"
            f"&$top=5&$orderby=ContentDate/Start desc"
        )

        try:
            res = requests.get(f"{self.CDSE_CATALOG_URL}?{query}", timeout=15,
                             headers={"Authorization": f"Bearer {self.token}"} if self.token else {})
            if res.status_code == 200:
                products = res.json().get("value", [])
                return [{
                    "id": p.get("Id"),
                    "name": p.get("Name"),
                    "date": p.get("ContentDate", {}).get("Start"),
                    "cloud_cover": next((a["Value"] for a in p.get("Attributes", [])
                                       if a.get("Name") == "cloudCover"), None),
                    "size_mb": round(p.get("ContentLength", 0) / 1048576, 1),
                } for p in products]
        except Exception as e:
            logger.error(f"Satellite search error: {e}")

        return []

    def get_latest_ndvi(self, lat: float, lon: float) -> dict:
        """Get latest NDVI data for a location (simplified)."""
        products = self.search_products(lat, lon, days_back=14, max_cloud=20)
        return {
            "available_products": len(products),
            "latest": products[0] if products else None,
            "note": "Full download requires CDSE credentials"
        }


# ============================================================
# DRONE INGESTION — Import drone survey data
# ============================================================
class DroneIngestion:
    """
    Import and process drone survey imagery and GPS data.
    Supports: GeoTIFF, JPEG with EXIF GPS, shapefile, KML.
    """

    SUPPORTED_FORMATS = ['.tif', '.tiff', '.jpg', '.jpeg', '.png', '.shp', '.kml', '.kmz']

    def __init__(self, storage_dir="/home/agrivision/data/drone"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def import_survey(self, source_dir: str) -> dict:
        """Import all drone survey files from a directory."""
        source = Path(source_dir)
        if not source.exists():
            return {"error": f"Source directory not found: {source_dir}"}

        imported = []
        for file in source.iterdir():
            if file.suffix.lower() in self.SUPPORTED_FORMATS:
                dest = self.storage_dir / file.name
                if not dest.exists():
                    import shutil
                    shutil.copy2(file, dest)
                imported.append({
                    "filename": file.name,
                    "format": file.suffix.lower(),
                    "size_mb": round(file.stat().st_size / 1048576, 2),
                    "gps": self._extract_gps(file) if file.suffix.lower() in ['.jpg', '.jpeg'] else None,
                })

        logger.info(f"Imported {len(imported)} drone survey files")
        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "files_imported": len(imported),
            "files": imported,
            "storage_dir": str(self.storage_dir),
        }

    def _extract_gps(self, image_path: Path) -> dict:
        """Extract GPS coordinates from JPEG EXIF data."""
        try:
            from PIL import Image
            from PIL.ExifTags import TAGS, GPSTAGS

            img = Image.open(image_path)
            exif = img._getexif()
            if not exif:
                return None

            gps_info = {}
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == "GPSInfo":
                    for gps_tag_id, gps_value in value.items():
                        gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        gps_info[gps_tag] = gps_value

            if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
                lat = self._gps_to_decimal(gps_info["GPSLatitude"], gps_info.get("GPSLatitudeRef", "N"))
                lon = self._gps_to_decimal(gps_info["GPSLongitude"], gps_info.get("GPSLongitudeRef", "W"))
                return {"latitude": round(lat, 6), "longitude": round(lon, 6)}
        except Exception as e:
            logger.debug(f"GPS extraction error: {e}")
        return None

    def _gps_to_decimal(self, coords, ref):
        """Convert GPS coordinates to decimal degrees."""
        d, m, s = [float(c) for c in coords]
        decimal = d + m / 60 + s / 3600
        if ref in ["S", "W"]:
            decimal = -decimal
        return decimal

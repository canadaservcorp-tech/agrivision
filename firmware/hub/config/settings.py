"""
Hub Configuration — loaded from /boot/agrivision.conf or environment
"""

import os
from pathlib import Path


class HubSettings:
    """All hub configuration in one place"""

    # Identity
    HUB_SERIAL = os.getenv("HUB_SERIAL", "HUB-DEV001")
    FARM_ID = int(os.getenv("FARM_ID", "1"))
    FIRMWARE_VERSION = "3.0.0"

    # Paths
    BASE_DIR = Path("/home/agrivision")
    DATA_DIR = BASE_DIR / "data"
    IMAGES_DIR = DATA_DIR / "images"
    MODELS_DIR = BASE_DIR / "models"
    DB_PATH = DATA_DIR / "hub.db"
    LOG_DIR = BASE_DIR / "logs"

    # External HDD (required for CCTV mode)
    HDD_MOUNT_PATH = Path(os.getenv("HDD_MOUNT_PATH", "/mnt/hdd"))
    HDD_CCTV_DIR = HDD_MOUNT_PATH / "cctv"
    HDD_CAPTURES_DIR = HDD_MOUNT_PATH / "captures"
    HDD_LOGS_DIR = HDD_MOUNT_PATH / "logs"

    # Fallback (eMMC) paths when HDD missing
    FALLBACK_CCTV_DIR = DATA_DIR / "cctv"
    FALLBACK_CAPTURES_DIR = DATA_DIR / "captures"
    FALLBACK_LOGS_DIR = DATA_DIR / "logs"

    DEFAULT_MODE = os.getenv("DEFAULT_MODE", "monitoring")  # 'monitoring' or 'cctv'

    # Camera Receiver (HTTP server for ESP32 nodes)
    RECEIVER_HOST = "0.0.0.0"
    RECEIVER_PORT = int(os.getenv("RECEIVER_PORT", "8080"))
    MAX_IMAGE_SIZE_MB = 10

    # WiFi AP
    AP_SSID = os.getenv("AP_SSID", "AgriVision-HUB")
    AP_PASSWORD = os.getenv("AP_PASSWORD", "agri2026secure")
    AP_CHANNEL = 6
    AP_INTERFACE = "wlan0"
    UPSTREAM_INTERFACE = "eth0"  # For internet access (or wlan1)

    # AI Detection
    MODEL_PATH = MODELS_DIR / "agrivision_v3.tflite"
    LABELS_PATH = MODELS_DIR / "labels.txt"
    DETECTION_THRESHOLD = 0.65  # Min confidence to report
    INPUT_SIZE = (224, 224)  # Model input dimensions

    # Sensor Pins (BCM numbering)
    DHT_PIN = 4         # DHT22 temperature/humidity
    SOIL_PIN = 17       # Soil moisture sensor (analog via ADC)
    LIGHT_PIN = 27      # Light sensor (LDR via ADC)
    BATTERY_ADC = 0     # MCP3008 channel 0

    # Sensor Reading Interval
    SENSOR_INTERVAL_SEC = int(os.getenv("SENSOR_INTERVAL", "900"))  # 15 min

    # Cloud Sync
    CLOUD_API_URL = os.getenv("CLOUD_API_URL", "https://api.theagrivision.com")
    CLOUD_API_KEY = os.getenv("CLOUD_API_KEY", "")
    MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
    MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_TOPIC = f"agrivision/{HUB_SERIAL}"
    MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
    MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

    # Heartbeat
    HEARTBEAT_INTERVAL_SEC = int(os.getenv("HEARTBEAT_INTERVAL", "300"))  # 5 min

    # Fleet Management
    CAMERA_TIMEOUT_SEC = 1800  # 30 min — mark offline if no contact
    MAX_CAMERAS = 15

    # Storage
    MAX_STORAGE_GB = 200  # Warn when SSD usage exceeds this
    IMAGE_RETENTION_DAYS = 30  # Auto-delete old images

    # Alert Thresholds
    ALERT_TEMP_MAX = 45.0
    ALERT_TEMP_MIN = -5.0
    ALERT_HUMIDITY_MAX = 90.0
    ALERT_SOIL_MIN = 15.0
    ALERT_BATTERY_MIN = 15.0

    def __init__(self):
        # Create internal fallback directories (always on eMMC)
        for d in [
            self.DATA_DIR,
            self.IMAGES_DIR,
            self.MODELS_DIR,
            self.LOG_DIR,
            self.FALLBACK_CCTV_DIR,
            self.FALLBACK_CAPTURES_DIR,
            self.FALLBACK_LOGS_DIR,
        ]:
            d.mkdir(parents=True, exist_ok=True)

    def is_hdd_mounted(self) -> bool:
        """Return True if external HDD is mounted at HDD_MOUNT_PATH."""
        try:
            return self.HDD_MOUNT_PATH.exists() and os.path.ismount(self.HDD_MOUNT_PATH)
        except Exception:
            return self.HDD_MOUNT_PATH.exists()

    def get_storage_paths(self) -> dict:
        """Return active storage directories based on HDD presence."""
        if self.is_hdd_mounted():
            for d in [self.HDD_CCTV_DIR, self.HDD_CAPTURES_DIR, self.HDD_LOGS_DIR]:
                d.mkdir(parents=True, exist_ok=True)
            return {
                "root": str(self.HDD_MOUNT_PATH),
                "cctv_dir": str(self.HDD_CCTV_DIR),
                "captures_dir": str(self.HDD_CAPTURES_DIR),
                "logs_dir": str(self.HDD_LOGS_DIR),
                "using_hdd": True,
            }

        for d in [self.FALLBACK_CCTV_DIR, self.FALLBACK_CAPTURES_DIR, self.FALLBACK_LOGS_DIR]:
            d.mkdir(parents=True, exist_ok=True)
        return {
            "root": str(self.DATA_DIR),
            "cctv_dir": str(self.FALLBACK_CCTV_DIR),
            "captures_dir": str(self.FALLBACK_CAPTURES_DIR),
            "logs_dir": str(self.FALLBACK_LOGS_DIR),
            "using_hdd": False,
        }

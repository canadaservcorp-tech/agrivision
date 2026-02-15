"""Agrivision device configuration"""
import os, json, uuid

class Config:
    DEVICE_UUID = os.environ.get('AGRIVISION_DEVICE_UUID', str(uuid.uuid4())[:8])
    API_URL = os.environ.get('AGRIVISION_API_URL', 'https://YOUR-BACKEND.up.railway.app/api/v1')
    CAPTURE_INTERVAL = int(os.environ.get('CAPTURE_INTERVAL', 1800))  # 30 min
    ALERT_THRESHOLD = float(os.environ.get('ALERT_THRESHOLD', 0.7))
    MODEL_PATH = os.environ.get('MODEL_PATH', '/opt/agrivision/models/disease_model.tflite')
    IMAGE_DIR = '/opt/agrivision/images'
    DATA_DIR = '/opt/agrivision/data'
    FIRMWARE_VERSION = '1.0.0'

    def __init__(self):
        config_path = '/opt/agrivision/config.json'
        if os.path.exists(config_path):
            with open(config_path) as f:
                overrides = json.load(f)
                for k, v in overrides.items():
                    setattr(self, k.upper(), v)

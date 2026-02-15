"""Upload data to backend via 4G LTE (Quectel EC25)"""
import requests, json, os

class DataUploader:
    def __init__(self, config):
        self.config = config
        self.base_url = config.API_URL

    async def send(self, payload):
        try:
            image_path = payload.pop('image_path', None)
            files = {}
            if image_path and os.path.exists(image_path):
                files['image'] = open(image_path, 'rb')
            r = requests.post(
                f"{self.base_url}/readings",
                json={
                    'device_uuid': payload['device_uuid'],
                    'temperature': payload['sensor_data'].get('temperature'),
                    'humidity': payload['sensor_data'].get('humidity'),
                    'soil_moisture': payload['sensor_data'].get('soil_moisture'),
                    'battery_voltage': payload['health'].get('battery_voltage'),
                    'signal_strength': payload['health'].get('signal_strength')
                },
                timeout=15
            )
            return r.status_code in (200, 201)
        except Exception as e:
            print(f"Upload error: {e}")
            return False

    def heartbeat(self):
        try:
            requests.post(f"{self.base_url}/devices/{self.config.DEVICE_UUID}/heartbeat",
                json={'firmware_version': self.config.FIRMWARE_VERSION, 'status': 'online'}, timeout=10)
        except: pass

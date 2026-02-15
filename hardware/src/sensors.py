"""Sensor readings — DHT22 (temp/humidity) + Soil Moisture via ADS1115"""

class SensorModule:
    def __init__(self, config):
        self.config = config
        self._dht = None
        self._adc = None
        self._init_sensors()

    def _init_sensors(self):
        try:
            import adafruit_dht, board, busio, adafruit_ads1x15.ads1115 as ADS
            from adafruit_ads1x15.analog_in import AnalogIn
            self._dht = adafruit_dht.DHT22(board.D4)
            i2c = busio.I2C(board.SCL, board.SDA)
            ads = ADS.ADS1115(i2c, address=0x48)
            self._soil_channel = AnalogIn(ads, ADS.P0)
        except Exception as e:
            print(f"Sensor init warning: {e} — using mock data")

    def read_all(self):
        data = {'temperature': None, 'humidity': None, 'soil_moisture': None}
        try:
            if self._dht:
                data['temperature'] = round(self._dht.temperature, 2)
                data['humidity'] = round(self._dht.humidity, 2)
            else:
                import random
                data['temperature'] = round(random.uniform(18, 35), 2)
                data['humidity'] = round(random.uniform(40, 80), 2)
        except Exception as e:
            print(f"DHT22 read error: {e}")
        try:
            if hasattr(self, '_soil_channel'):
                raw = self._soil_channel.value
                data['soil_moisture'] = round((raw / 32767) * 100, 2)
            else:
                import random
                data['soil_moisture'] = round(random.uniform(20, 70), 2)
        except Exception as e:
            print(f"Soil read error: {e}")
        return data

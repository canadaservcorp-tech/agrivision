"""
Agrivision Weather Station Module
Reads BME280 (temp/humidity/pressure) + rain gauge + UV sensor
Provides hyperlocal real-time weather data for climate risk models.

Hardware wiring (I2C on Pi CM4):
  BME280: SDA→GPIO2, SCL→GPIO3, VCC→3.3V
  Rain gauge: GPIO17 (tipping bucket counter)
  UV sensor (VEML6075): I2C address 0x10

Install: pip install bme280 smbus2 RPi.GPIO
"""

import time
import json
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger('agrivision.weather')

try:
    import smbus2
    import bme280
    import RPi.GPIO as GPIO
    HW_AVAILABLE = True
except ImportError:
    HW_AVAILABLE = False
    logger.warning("Hardware libraries not available — running in simulation mode")


class WeatherStation:
    """Hyperlocal weather station for Agrivision field module."""

    BME280_ADDRESS = 0x76
    UV_ADDRESS = 0x10
    RAIN_GPIO = 17
    RAIN_BUCKET_MM = 0.2794  # mm per tip

    def __init__(self, cache_dir="/home/agrivision/data/weather"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.rain_count = 0
        self.rain_count_hourly = 0
        self.last_rain_reset = time.time()

        if HW_AVAILABLE:
            self.bus = smbus2.SMBus(1)
            self.bme280_params = bme280.load_calibration_params(self.bus, self.BME280_ADDRESS)
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(self.RAIN_GPIO, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            GPIO.add_event_detect(self.RAIN_GPIO, GPIO.FALLING, callback=self._rain_tick, bouncetime=300)
            logger.info("Weather station initialized with hardware")
        else:
            self.bus = None
            self.bme280_params = None
            logger.info("Weather station initialized in simulation mode")

    def _rain_tick(self, channel):
        """Interrupt callback for rain gauge tipping bucket."""
        self.rain_count += 1
        self.rain_count_hourly += 1

    def read_bme280(self):
        """Read temperature, humidity, pressure from BME280."""
        if not HW_AVAILABLE:
            return {"temperature_c": 22.5, "humidity_pct": 65.0, "pressure_hpa": 1013.25}

        try:
            data = bme280.sample(self.bus, self.BME280_ADDRESS, self.bme280_params)
            return {
                "temperature_c": round(data.temperature, 2),
                "humidity_pct": round(data.humidity, 2),
                "pressure_hpa": round(data.pressure, 2)
            }
        except Exception as e:
            logger.error(f"BME280 read error: {e}")
            return None

    def read_uv(self):
        """Read UV index from VEML6075 (I2C)."""
        if not HW_AVAILABLE:
            return {"uv_index": 3.5, "uva": 120, "uvb": 95}

        try:
            uva_raw = self.bus.read_word_data(self.UV_ADDRESS, 0x07)
            uvb_raw = self.bus.read_word_data(self.UV_ADDRESS, 0x09)
            uv_index = round((uva_raw + uvb_raw) / 2 * 0.005, 1)
            return {"uv_index": uv_index, "uva": uva_raw, "uvb": uvb_raw}
        except Exception as e:
            logger.error(f"UV read error: {e}")
            return {"uv_index": 0, "uva": 0, "uvb": 0}

    def read_rainfall(self):
        """Get rainfall in mm since last reset."""
        now = time.time()
        elapsed_hours = (now - self.last_rain_reset) / 3600

        rainfall_mm = round(self.rain_count * self.RAIN_BUCKET_MM, 2)
        rainfall_hourly = round(self.rain_count_hourly * self.RAIN_BUCKET_MM, 2) if elapsed_hours > 0 else 0

        # Reset hourly counter every hour
        if elapsed_hours >= 1:
            self.rain_count_hourly = 0
            self.last_rain_reset = now

        return {
            "rainfall_total_mm": rainfall_mm,
            "rainfall_hourly_mm": rainfall_hourly,
            "rain_tips": self.rain_count
        }

    def read_all(self):
        """Read all weather sensors and return combined data."""
        timestamp = datetime.utcnow().isoformat() + "Z"

        bme = self.read_bme280()
        uv = self.read_uv()
        rain = self.read_rainfall()

        reading = {
            "timestamp": timestamp,
            "source": "agrivision_weather_station",
            **(bme or {}),
            **(uv or {}),
            **(rain or {}),
        }

        # Calculate derived values
        if bme:
            # Dew point approximation (Magnus formula)
            t = bme["temperature_c"]
            rh = bme["humidity_pct"]
            if rh > 0:
                a, b = 17.27, 237.7
                alpha = (a * t) / (b + t) + (rh / 100.0)
                reading["dew_point_c"] = round((b * alpha) / (a - alpha), 2)

            # Wind chill (placeholder — needs anemometer)
            reading["wind_chill_c"] = None

        # Cache locally
        self._cache_reading(reading)

        return reading

    def _cache_reading(self, reading):
        """Save reading to local cache for offline mode."""
        try:
            date_str = datetime.utcnow().strftime("%Y-%m-%d")
            cache_file = self.cache_dir / f"weather_{date_str}.jsonl"
            with open(cache_file, "a") as f:
                f.write(json.dumps(reading) + "\n")
        except Exception as e:
            logger.error(f"Cache write error: {e}")

    def get_daily_summary(self):
        """Get today's weather summary from cached readings."""
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        cache_file = self.cache_dir / f"weather_{date_str}.jsonl"

        if not cache_file.exists():
            return None

        readings = []
        with open(cache_file) as f:
            for line in f:
                try:
                    readings.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    continue

        if not readings:
            return None

        temps = [r.get("temperature_c", 0) for r in readings if "temperature_c" in r]
        humids = [r.get("humidity_pct", 0) for r in readings if "humidity_pct" in r]

        return {
            "date": date_str,
            "readings_count": len(readings),
            "temp_min": round(min(temps), 1) if temps else None,
            "temp_max": round(max(temps), 1) if temps else None,
            "temp_avg": round(sum(temps) / len(temps), 1) if temps else None,
            "humidity_avg": round(sum(humids) / len(humids), 1) if humids else None,
            "total_rainfall_mm": readings[-1].get("rainfall_total_mm", 0),
        }

    def cleanup(self):
        """Release GPIO resources."""
        if HW_AVAILABLE:
            GPIO.cleanup(self.RAIN_GPIO)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ws = WeatherStation()
    print(json.dumps(ws.read_all(), indent=2))

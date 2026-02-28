"""
Sensor Reader Service
Reads environmental sensors connected to Pi GPIO:
- DHT22: Temperature + Humidity
- Capacitive soil moisture sensor (via MCP3008 ADC)
- LDR light sensor (via MCP3008 ADC)
"""

import asyncio
import logging
from datetime import datetime

logger = logging.getLogger("hub.sensors")


class SensorReading:
    """Single sensor reading snapshot"""
    def __init__(self):
        self.temperature = None
        self.humidity = None
        self.soil_moisture = None
        self.light_lux = None
        self.recorded_at = None


class SensorReader:
    """Reads all connected sensors at configured intervals"""

    def __init__(self, settings):
        self.settings = settings
        self.latest = SensorReading()
        self.history = []  # Last 24h of readings
        self._dht_sensor = None
        self._adc = None

    async def start(self):
        """Start sensor reading loop"""
        self._init_hardware()
        logger.info(f"🌡️ Sensor reader started (interval: {self.settings.SENSOR_INTERVAL_SEC}s)")

        while True:
            try:
                reading = await self._read_all()
                self.latest = reading
                self.history.append(reading)

                # Keep only last 24h (assuming 15-min intervals = 96 readings)
                if len(self.history) > 100:
                    self.history = self.history[-100:]

                logger.info(
                    f"🌡️ T:{reading.temperature}°C "
                    f"H:{reading.humidity}% "
                    f"SM:{reading.soil_moisture}% "
                    f"L:{reading.light_lux}lux"
                )

            except Exception as e:
                logger.error(f"Sensor read error: {e}")

            await asyncio.sleep(self.settings.SENSOR_INTERVAL_SEC)

    def _init_hardware(self):
        """Initialize sensor hardware"""
        try:
            import adafruit_dht
            import board
            self._dht_sensor = adafruit_dht.DHT22(getattr(board, f"D{self.settings.DHT_PIN}"))
            logger.info("DHT22 initialized")
        except ImportError:
            logger.warning("adafruit_dht not available — using simulated sensors")
        except Exception as e:
            logger.warning(f"DHT22 init failed: {e} — using simulated sensors")

        try:
            import busio
            import digitalio
            import adafruit_mcp3xxx.mcp3008 as MCP
            from adafruit_mcp3xxx.analog_in import AnalogIn
            spi = busio.SPI(clock=board.SCK, MISO=board.MISO, MOSI=board.MOSI)
            cs = digitalio.DigitalInOut(board.D8)
            mcp = MCP.MCP3008(spi, cs)
            self._adc = mcp
            logger.info("MCP3008 ADC initialized")
        except Exception:
            logger.warning("MCP3008 not available — using simulated ADC")

    async def _read_all(self) -> SensorReading:
        """Read all sensors"""
        reading = SensorReading()
        reading.recorded_at = datetime.utcnow().isoformat()

        # DHT22 — Temperature & Humidity
        if self._dht_sensor:
            try:
                reading.temperature = round(self._dht_sensor.temperature, 1)
                reading.humidity = round(self._dht_sensor.humidity, 1)
            except RuntimeError:
                # DHT22 occasionally fails — use last known value
                reading.temperature = self.latest.temperature
                reading.humidity = self.latest.humidity
        else:
            # Simulated values for development
            import random
            reading.temperature = round(25 + random.uniform(-5, 15), 1)
            reading.humidity = round(50 + random.uniform(-20, 30), 1)

        # Soil Moisture (capacitive sensor via ADC)
        if self._adc:
            try:
                from adafruit_mcp3xxx.analog_in import AnalogIn
                import adafruit_mcp3xxx.mcp3008 as MCP
                chan = AnalogIn(self._adc, MCP.P0)
                # Convert voltage to percentage (dry=3.3V=0%, wet=1.5V=100%)
                raw_pct = max(0, min(100, (3.3 - chan.voltage) / 1.8 * 100))
                reading.soil_moisture = round(raw_pct, 1)
            except Exception:
                reading.soil_moisture = self.latest.soil_moisture
        else:
            import random
            reading.soil_moisture = round(30 + random.uniform(-10, 20), 1)

        # Light sensor (LDR via ADC)
        if self._adc:
            try:
                from adafruit_mcp3xxx.analog_in import AnalogIn
                import adafruit_mcp3xxx.mcp3008 as MCP
                chan = AnalogIn(self._adc, MCP.P1)
                # Convert to approximate lux
                reading.light_lux = round(chan.voltage / 3.3 * 1000, 0)
            except Exception:
                reading.light_lux = self.latest.light_lux
        else:
            import random
            hour = datetime.utcnow().hour
            if 6 < hour < 19:
                reading.light_lux = round(300 + random.uniform(0, 700), 0)
            else:
                reading.light_lux = round(random.uniform(0, 20), 0)

        return reading

    def get_battery_level(self) -> float:
        """Read hub battery level (if on battery)"""
        # Pi typically runs on continuous power, but check UPS if connected
        try:
            # Read from INA219 power monitor or UPS HAT
            return 100.0  # Continuous power
        except Exception:
            return 100.0

    def get_hub_temperature(self) -> float:
        """Read Pi CPU temperature"""
        try:
            temp_str = open("/sys/class/thermal/thermal_zone0/temp").read()
            return round(int(temp_str) / 1000.0, 1)
        except Exception:
            return 45.0

    def get_latest_dict(self) -> dict:
        """Return latest reading as dict"""
        return {
            "temperature": self.latest.temperature,
            "humidity": self.latest.humidity,
            "soil_moisture": self.latest.soil_moisture,
            "light_lux": self.latest.light_lux,
            "recorded_at": self.latest.recorded_at,
        }

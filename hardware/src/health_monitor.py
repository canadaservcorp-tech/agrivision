"""Device health monitoring — CPU, memory, disk, battery"""
import os

class HealthMonitor:
    def __init__(self, config): self.config = config

    def check(self):
        data = {'cpu_temp': None, 'memory_pct': None, 'disk_pct': None, 'battery_voltage': None, 'signal_strength': None}
        try:
            with open('/sys/class/thermal/thermal_zone0/temp') as f:
                data['cpu_temp'] = round(int(f.read().strip()) / 1000, 1)
        except: pass
        try:
            import psutil
            data['memory_pct'] = round(psutil.virtual_memory().percent, 1)
            data['disk_pct'] = round(psutil.disk_usage('/').percent, 1)
        except: pass
        return data

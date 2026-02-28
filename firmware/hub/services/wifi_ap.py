"""
WiFi Access Point Manager
Creates a local WiFi network for ESP32 camera nodes to connect to.
Uses hostapd + dnsmasq on the Pi.
"""

import subprocess
import logging

logger = logging.getLogger("hub.wifi")


class WiFiAPManager:
    """Manages the WiFi AP that camera nodes connect to"""

    def __init__(self, settings):
        self.settings = settings

    def setup(self):
        """Configure and start WiFi AP"""
        logger.info(f"📡 Setting up WiFi AP: {self.settings.AP_SSID}")

        try:
            # Check if hostapd is available
            result = subprocess.run(["which", "hostapd"], capture_output=True, text=True)
            if result.returncode != 0:
                logger.warning("hostapd not installed — WiFi AP not available")
                logger.info("Install: sudo apt install hostapd dnsmasq")
                logger.info("Camera nodes must connect to existing WiFi instead")
                return

            # Write hostapd config
            hostapd_conf = f"""
interface={self.settings.AP_INTERFACE}
driver=nl80211
ssid={self.settings.AP_SSID}
hw_mode=g
channel={self.settings.AP_CHANNEL}
ieee80211n=1
ieee80211ac=1
wmm_enabled=1
ht_capab=[HT40+][SHORT-GI-20][SHORT-GI-40]
macaddr_acl=0
auth_algs=1
wpa=2
wpa_passphrase={self.settings.AP_PASSWORD}
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
country_code=AE
"""
            with open("/etc/hostapd/hostapd.conf", "w") as f:
                f.write(hostapd_conf)

            # Write dnsmasq config for DHCP
            dnsmasq_conf = f"""
interface={self.settings.AP_INTERFACE}
dhcp-range=192.168.4.10,192.168.4.100,255.255.255.0,24h
domain=agrivision.local
address=/hub.agrivision.local/192.168.4.1
"""
            with open("/etc/dnsmasq.d/agrivision.conf", "w") as f:
                f.write(dnsmasq_conf)

            # Set static IP on AP interface
            subprocess.run([
                "ip", "addr", "add", "192.168.4.1/24",
                "dev", self.settings.AP_INTERFACE
            ], capture_output=True)

            # Start services
            subprocess.run(["systemctl", "restart", "hostapd"], capture_output=True)
            subprocess.run(["systemctl", "restart", "dnsmasq"], capture_output=True)

            logger.info(f"✅ WiFi AP active: {self.settings.AP_SSID} on 192.168.4.1")

        except PermissionError:
            logger.warning("Need root access for WiFi AP setup")
            logger.info("Run hub with: sudo python3 main.py")
        except Exception as e:
            logger.error(f"WiFi AP setup failed: {e}")

    def get_connected_clients(self) -> list:
        """Get list of connected WiFi clients (camera nodes)"""
        try:
            result = subprocess.run(
                ["iw", "dev", self.settings.AP_INTERFACE, "station", "dump"],
                capture_output=True, text=True
            )
            clients = []
            current = {}
            for line in result.stdout.split("\n"):
                if "Station" in line:
                    if current:
                        clients.append(current)
                    current = {"mac": line.split()[1]}
                elif "signal:" in line:
                    current["signal"] = line.split(":")[1].strip()
            if current:
                clients.append(current)
            return clients
        except Exception:
            return []

    def get_signal_strength(self) -> int:
        """Get AP signal strength"""
        try:
            result = subprocess.run(
                ["iwconfig", self.settings.AP_INTERFACE],
                capture_output=True, text=True
            )
            for line in result.stdout.split("\n"):
                if "Signal level" in line:
                    import re
                    match = re.search(r"Signal level[=:](-?\d+)", line)
                    if match:
                        return int(match.group(1))
            return -50  # Default
        except Exception:
            return -50

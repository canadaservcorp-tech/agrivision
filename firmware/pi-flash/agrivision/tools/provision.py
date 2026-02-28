#!/usr/bin/env python3
"""
AgriVision ESP32 Camera Node Provisioning Tool v3.0
====================================================
Factory setup tool for configuring camera nodes before deployment.

What it does:
1. Connects to ESP32 via serial/USB
2. Assigns unique serial number (CAM-XXXXXXXX)
3. Configures WiFi credentials (hub AP or farm WiFi)
4. Sets hub IP and port
5. Runs connectivity test
6. Generates QR code label for physical device
7. Registers node with cloud API

Requirements:
    pip install esptool pyserial qrcode requests

Usage:
    python provision.py                     # Interactive mode
    python provision.py --port /dev/ttyUSB0 --hub HUB-A3F7C1D2 --batch 10
    python provision.py --list              # List connected ESP32 devices

© 2026 Performance Cristal Technologies Avancées S.A.
"""

import argparse
import hashlib
import json
import os
import random
import string
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("Install: pip install pyserial")
    serial = None

try:
    import qrcode
except ImportError:
    print("Install: pip install qrcode[pil]")
    qrcode = None

try:
    import requests
except ImportError:
    print("Install: pip install requests")
    requests = None


# ============================================================
# CONFIGURATION
# ============================================================

CLOUD_API = os.getenv("AGRIVISION_API", "https://api.theagrivision.com")
API_KEY = os.getenv("AGRIVISION_API_KEY", "")
BAUD_RATE = 115200
PROVISION_TIMEOUT = 30  # seconds

# Default WiFi for hub AP
DEFAULT_SSID = "AgriVision-HUB"
DEFAULT_PASSWORD = "agri2026secure"
DEFAULT_HUB_IP = "192.168.4.1"
DEFAULT_HUB_PORT = 8080

# Serial number format
SERIAL_PREFIX = "CAM"
SERIAL_LENGTH = 8  # CAM-XXXXXXXX


class ProvisioningTool:
    """Interactive provisioning tool for AgriVision camera nodes"""

    def __init__(self):
        self.port = None
        self.serial_conn = None
        self.hub_serial = None
        self.provisioned = []
        self.log_file = Path("provision_log.json")

    # ============================================================
    # SERIAL NUMBER GENERATION
    # ============================================================

    def generate_serial(self) -> str:
        """Generate unique camera serial number"""
        chars = string.ascii_uppercase + string.digits
        unique = "".join(random.choices(chars, k=SERIAL_LENGTH))
        return f"{SERIAL_PREFIX}-{unique}"

    def generate_batch_serials(self, count: int) -> list:
        """Generate a batch of unique serials"""
        serials = set()
        while len(serials) < count:
            serials.add(self.generate_serial())
        return sorted(serials)

    # ============================================================
    # DEVICE DETECTION
    # ============================================================

    def list_devices(self) -> list:
        """List connected ESP32 devices"""
        if not serial:
            print("❌ pyserial not installed")
            return []

        ports = serial.tools.list_ports.comports()
        esp_ports = []
        for port in ports:
            # ESP32 commonly uses CP210x or CH340
            if any(chip in (port.description or "").lower() for chip in ["cp210", "ch340", "esp32", "usb"]):
                esp_ports.append({
                    "port": port.device,
                    "description": port.description,
                    "hwid": port.hwid,
                })
                print(f"  📟 {port.device} — {port.description}")

        if not esp_ports:
            print("  ⚠️ No ESP32 devices found. Check USB connection.")
        return esp_ports

    # ============================================================
    # SERIAL COMMUNICATION
    # ============================================================

    def connect(self, port: str) -> bool:
        """Connect to ESP32 via serial"""
        try:
            self.serial_conn = serial.Serial(port, BAUD_RATE, timeout=5)
            time.sleep(2)  # Wait for ESP32 boot
            self.port = port
            print(f"✅ Connected to {port}")
            return True
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False

    def send_command(self, cmd: str) -> str:
        """Send AT-style command and read response"""
        if not self.serial_conn:
            return ""

        self.serial_conn.write(f"{cmd}\n".encode())
        time.sleep(0.5)

        response = ""
        timeout = time.time() + 5
        while time.time() < timeout:
            if self.serial_conn.in_waiting:
                response += self.serial_conn.read(self.serial_conn.in_waiting).decode("utf-8", errors="replace")
                if "OK" in response or "ERROR" in response:
                    break
            time.sleep(0.1)

        return response.strip()

    def disconnect(self):
        """Close serial connection"""
        if self.serial_conn:
            self.serial_conn.close()
            self.serial_conn = None

    # ============================================================
    # PROVISIONING FLOW
    # ============================================================

    def provision_node(self, serial_num: str = None, wifi_ssid: str = None,
                       wifi_pass: str = None, hub_ip: str = None, hub_port: int = None) -> dict:
        """
        Provision a single camera node.
        Returns provisioning result dict.
        """
        serial_num = serial_num or self.generate_serial()
        wifi_ssid = wifi_ssid or DEFAULT_SSID
        wifi_pass = wifi_pass or DEFAULT_PASSWORD
        hub_ip = hub_ip or DEFAULT_HUB_IP
        hub_port = hub_port or DEFAULT_HUB_PORT

        print(f"\n{'='*50}")
        print(f"📷 Provisioning: {serial_num}")
        print(f"{'='*50}")

        result = {
            "serial": serial_num,
            "status": "pending",
            "port": self.port,
            "hub_serial": self.hub_serial,
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Step 1: Set serial number
        print(f"  1️⃣  Setting serial: {serial_num}")
        resp = self.send_command(f"AT+SERIAL={serial_num}")
        if "ERROR" in resp:
            result["status"] = "failed"
            result["error"] = "Serial set failed"
            return result

        # Step 2: Configure WiFi
        print(f"  2️⃣  Setting WiFi: {wifi_ssid}")
        resp = self.send_command(f"AT+WIFI={wifi_ssid},{wifi_pass}")
        if "ERROR" in resp:
            result["status"] = "failed"
            result["error"] = "WiFi config failed"
            return result

        # Step 3: Set hub address
        print(f"  3️⃣  Setting hub: {hub_ip}:{hub_port}")
        resp = self.send_command(f"AT+HUB={hub_ip},{hub_port}")
        if "ERROR" in resp:
            result["status"] = "failed"
            result["error"] = "Hub config failed"
            return result

        # Step 4: Save to EEPROM
        print(f"  4️⃣  Saving to EEPROM...")
        resp = self.send_command("AT+SAVE")

        # Step 5: Connectivity test
        print(f"  5️⃣  Running connectivity test...")
        resp = self.send_command("AT+TEST")
        wifi_ok = "WIFI_OK" in resp
        hub_ok = "HUB_OK" in resp

        result["wifi_test"] = wifi_ok
        result["hub_test"] = hub_ok

        # Step 6: Read MAC address
        resp = self.send_command("AT+MAC")
        mac = resp.split("=")[-1].strip() if "=" in resp else "unknown"
        result["mac_address"] = mac

        # Step 7: Read firmware version
        resp = self.send_command("AT+VERSION")
        version = resp.split("=")[-1].strip() if "=" in resp else "unknown"
        result["firmware"] = version

        if wifi_ok:
            result["status"] = "success"
            print(f"  ✅ Provisioned successfully!")
        else:
            result["status"] = "warning"
            print(f"  ⚠️ Provisioned but connectivity test failed")

        return result

    # ============================================================
    # QR CODE GENERATION
    # ============================================================

    def generate_qr_label(self, result: dict, output_dir: str = "labels"):
        """Generate QR code label for physical device"""
        if not qrcode:
            print("  ⚠️ qrcode not installed — skipping label generation")
            return

        Path(output_dir).mkdir(exist_ok=True)

        # QR data: JSON with serial, MAC, hub
        qr_data = json.dumps({
            "s": result["serial"],           # serial
            "m": result.get("mac_address"),   # mac
            "h": self.hub_serial,             # hub
            "v": result.get("firmware"),      # firmware version
        })

        qr = qrcode.QRCode(version=1, box_size=8, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Add text label (if Pillow available)
        try:
            from PIL import Image, ImageDraw, ImageFont
            # Create label
            label_w, label_h = 300, 380
            label = Image.new("RGB", (label_w, label_h), "white")
            draw = ImageDraw.Draw(label)

            # Paste QR
            qr_img = img.resize((220, 220))
            label.paste(qr_img, (40, 20))

            # Text
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
                font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
            except Exception:
                font = ImageFont.load_default()
                font_sm = font

            draw.text((label_w // 2, 255), f"📷 {result['serial']}", font=font, fill="black", anchor="mt")
            draw.text((label_w // 2, 280), f"MAC: {result.get('mac_address', 'N/A')}", font=font_sm, fill="gray", anchor="mt")
            draw.text((label_w // 2, 298), f"Hub: {self.hub_serial or 'N/A'}", font=font_sm, fill="gray", anchor="mt")
            draw.text((label_w // 2, 316), f"FW: {result.get('firmware', 'N/A')}", font=font_sm, fill="gray", anchor="mt")
            draw.text((label_w // 2, 340), "AgriVision • PCTA S.A.", font=font_sm, fill="#16a34a", anchor="mt")

            filepath = Path(output_dir) / f"{result['serial']}.png"
            label.save(filepath)
            print(f"  🏷️ Label saved: {filepath}")

        except ImportError:
            filepath = Path(output_dir) / f"{result['serial']}.png"
            img.save(str(filepath))
            print(f"  🏷️ QR saved: {filepath}")

    # ============================================================
    # CLOUD REGISTRATION
    # ============================================================

    def register_with_cloud(self, result: dict):
        """Register provisioned node with cloud API"""
        if not requests or not API_KEY:
            print("  ⚠️ Cloud registration skipped (no API key)")
            return

        try:
            resp = requests.post(
                f"{CLOUD_API}/api/admin/register-camera",
                json={
                    "serial_number": result["serial"],
                    "mac_address": result.get("mac_address"),
                    "hub_serial": self.hub_serial,
                    "firmware_version": result.get("firmware"),
                    "model": "ESP32-S3-OV5640",
                },
                headers={"Authorization": f"Bearer {API_KEY}"},
                timeout=10,
            )
            if resp.status_code == 200:
                print(f"  ☁️ Registered with cloud API")
            else:
                print(f"  ⚠️ Cloud registration failed: {resp.status_code}")
        except Exception as e:
            print(f"  ⚠️ Cloud registration error: {e}")

    # ============================================================
    # LOGGING
    # ============================================================

    def save_log(self):
        """Save provisioning log to JSON file"""
        existing = []
        if self.log_file.exists():
            existing = json.loads(self.log_file.read_text())
        existing.extend(self.provisioned)
        self.log_file.write_text(json.dumps(existing, indent=2))
        print(f"\n📄 Log saved: {self.log_file} ({len(existing)} total entries)")

    # ============================================================
    # BATCH PROVISIONING
    # ============================================================

    def batch_provision(self, count: int, port: str, hub_serial: str = None,
                        wifi_ssid: str = None, wifi_pass: str = None):
        """Provision multiple nodes sequentially"""
        self.hub_serial = hub_serial
        serials = self.generate_batch_serials(count)

        print(f"\n🏭 Batch Provisioning: {count} camera nodes")
        print(f"Hub: {hub_serial or 'Not specified'}")
        print(f"WiFi: {wifi_ssid or DEFAULT_SSID}")
        print(f"Port: {port}")
        print(f"Serials: {', '.join(serials[:5])}{'...' if count > 5 else ''}")
        print()

        success = 0
        for i, sn in enumerate(serials, 1):
            print(f"\n[{i}/{count}] ", end="")

            if not self.serial_conn:
                if not self.connect(port):
                    continue

            input(f"Connect {sn} and press Enter...")

            result = self.provision_node(sn, wifi_ssid, wifi_pass)
            self.provisioned.append(result)

            if result["status"] in ("success", "warning"):
                success += 1
                self.generate_qr_label(result)
                self.register_with_cloud(result)

            self.disconnect()

        print(f"\n{'='*50}")
        print(f"✅ Batch complete: {success}/{count} successful")
        self.save_log()

    # ============================================================
    # INTERACTIVE MODE
    # ============================================================

    def interactive(self):
        """Interactive provisioning wizard"""
        print("\n" + "="*50)
        print("  🌱 AgriVision Camera Provisioning Tool v3.0")
        print("="*50)

        # Detect devices
        print("\n🔍 Scanning for connected devices...")
        devices = self.list_devices()

        if not devices:
            port = input("\nEnter serial port manually: ").strip()
        else:
            port = devices[0]["port"]
            use_default = input(f"\nUse {port}? [Y/n]: ").strip().lower()
            if use_default == "n":
                port = input("Enter port: ").strip()

        # Hub serial
        self.hub_serial = input("Hub serial (e.g., HUB-A3F7C1D2): ").strip() or None

        # WiFi config
        wifi_ssid = input(f"WiFi SSID [{DEFAULT_SSID}]: ").strip() or DEFAULT_SSID
        wifi_pass = input(f"WiFi Password [{DEFAULT_PASSWORD}]: ").strip() or DEFAULT_PASSWORD

        # Batch or single?
        mode = input("\n[S]ingle or [B]atch provisioning? [S/B]: ").strip().upper()

        if mode == "B":
            count = int(input("How many nodes? ").strip())
            self.batch_provision(count, port, self.hub_serial, wifi_ssid, wifi_pass)
        else:
            if self.connect(port):
                serial_num = input(f"Serial number [{self.generate_serial()}]: ").strip()
                if not serial_num:
                    serial_num = self.generate_serial()

                result = self.provision_node(serial_num, wifi_ssid, wifi_pass)
                self.provisioned.append(result)

                if result["status"] in ("success", "warning"):
                    self.generate_qr_label(result)
                    self.register_with_cloud(result)

                self.disconnect()
                self.save_log()


# ============================================================
# CLI ENTRY
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="AgriVision Camera Node Provisioning Tool")
    parser.add_argument("--port", help="Serial port (e.g., /dev/ttyUSB0)")
    parser.add_argument("--hub", help="Hub serial number")
    parser.add_argument("--batch", type=int, help="Number of nodes to provision")
    parser.add_argument("--ssid", default=DEFAULT_SSID, help="WiFi SSID")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="WiFi password")
    parser.add_argument("--list", action="store_true", help="List connected devices")

    args = parser.parse_args()
    tool = ProvisioningTool()

    if args.list:
        print("\n🔍 Connected ESP32 devices:")
        tool.list_devices()
        return

    if args.port and args.batch:
        tool.batch_provision(args.batch, args.port, args.hub, args.ssid, args.password)
    elif args.port:
        tool.hub_serial = args.hub
        if tool.connect(args.port):
            result = tool.provision_node(wifi_ssid=args.ssid, wifi_pass=args.password)
            tool.provisioned.append(result)
            if result["status"] in ("success", "warning"):
                tool.generate_qr_label(result)
                tool.register_with_cloud(result)
            tool.disconnect()
            tool.save_log()
    else:
        tool.interactive()


if __name__ == "__main__":
    main()

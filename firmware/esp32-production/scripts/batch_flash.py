#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════╗
║  AgriVision ESP32 — Batch Flash & Provision Tool     ║
║  Flash firmware + assign unique serial to N cameras   ║
║  © 2026 PCTA S.A.                                    ║
╚══════════════════════════════════════════════════════╝

Usage:
  # Flash 10 cameras, starting from serial CAM-A3F7C001
  python batch_flash.py --count 10 --prefix CAM-A3F7C --start 1

  # With custom hub WiFi
  python batch_flash.py --count 5 --hub-ssid "MyFarm-HUB" --hub-pass "securepass"

  # Specify USB port explicitly
  python batch_flash.py --count 1 --port /dev/ttyUSB0

Requirements:
  pip install pyserial esptool
  PlatformIO installed (for firmware build)
"""

import argparse
import json
import os
import subprocess
import sys
import time
import glob
import csv
from datetime import datetime

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("❌ pip install pyserial")
    sys.exit(1)

# ── Defaults ──
DEFAULT_PREFIX = "CAM-A3F7C"
DEFAULT_HUB_SSID = "AgriVision-HUB"
DEFAULT_HUB_PASS = "agri2026secure"
DEFAULT_HUB_IP = "192.168.4.1"
DEFAULT_HUB_PORT = 8080
DEFAULT_ZONE = "default"
BAUD_RATE = 115200
PROVISION_TIMEOUT = 10  # seconds


def find_esp32_port():
    """Auto-detect ESP32 USB serial port."""
    ports = serial.tools.list_ports.comports()
    for p in ports:
        desc = (p.description + p.hwid).lower()
        if any(k in desc for k in ["cp210", "ch340", "ch9102", "ftdi", "esp32", "usb-serial"]):
            return p.device
    # Fallback: try common paths
    for pattern in ["/dev/ttyUSB*", "/dev/ttyACM*", "/dev/cu.usbserial*", "COM*"]:
        matches = glob.glob(pattern)
        if matches:
            return matches[0]
    return None


def flash_firmware(port=None):
    """Build and flash firmware using PlatformIO."""
    print("\n🔨 Building firmware...")
    result = subprocess.run(
        ["pio", "run"],
        capture_output=True, text=True, cwd=os.path.dirname(os.path.dirname(__file__))
    )
    if result.returncode != 0:
        print(f"❌ Build failed:\n{result.stderr}")
        return False

    print("📦 Uploading to ESP32...")
    cmd = ["pio", "run", "-t", "upload"]
    if port:
        cmd += ["--upload-port", port]
    result = subprocess.run(
        cmd, capture_output=True, text=True,
        cwd=os.path.dirname(os.path.dirname(__file__))
    )
    if result.returncode != 0:
        print(f"❌ Upload failed:\n{result.stderr}")
        return False

    print("✅ Firmware flashed")
    return True


def provision_camera(port, serial_num, hub_ssid, hub_pass, hub_ip, hub_port, zone):
    """Send provisioning command via serial."""
    provision_str = f"PROVISION:{serial_num},{hub_ssid},{hub_pass},{hub_ip},{hub_port},{zone}"

    try:
        ser = serial.Serial(port, BAUD_RATE, timeout=2)
        time.sleep(2)  # Wait for ESP32 boot

        # Drain boot messages
        while ser.in_waiting:
            ser.readline()

        # Send provision command
        ser.write(f"{provision_str}\n".encode())
        print(f"  📡 Sent: PROVISION:{serial_num},***,{hub_ip},{hub_port},{zone}")

        # Wait for response
        start = time.time()
        while time.time() - start < PROVISION_TIMEOUT:
            if ser.in_waiting:
                line = ser.readline().decode("utf-8", errors="ignore").strip()
                if line.startswith("PROVISION:OK:"):
                    assigned = line.split(":")[2]
                    print(f"  ✅ Provisioned as {assigned}")
                    ser.close()
                    return True
                elif line.startswith("PROVISION:ERROR:"):
                    error = line.split(":", 2)[2]
                    print(f"  ❌ Error: {error}")
                    ser.close()
                    return False
            time.sleep(0.1)

        print("  ❌ Provision timeout")
        ser.close()
        return False

    except serial.SerialException as e:
        print(f"  ❌ Serial error: {e}")
        return False


def get_camera_status(port):
    """Read current camera status."""
    try:
        ser = serial.Serial(port, BAUD_RATE, timeout=2)
        time.sleep(1)
        while ser.in_waiting:
            ser.readline()

        ser.write(b"STATUS\n")
        start = time.time()
        while time.time() - start < 5:
            if ser.in_waiting:
                line = ser.readline().decode("utf-8", errors="ignore").strip()
                if line.startswith("STATUS:"):
                    parts = line[7:].split(",")
                    ser.close()
                    return {
                        "serial": parts[0] if len(parts) > 0 else "?",
                        "mac": parts[1] if len(parts) > 1 else "?",
                        "firmware": parts[2] if len(parts) > 2 else "?",
                        "hub_ssid": parts[3] if len(parts) > 3 else "?",
                        "hub_port": parts[4] if len(parts) > 4 else "?",
                        "zone": parts[5] if len(parts) > 5 else "?",
                        "state": parts[6] if len(parts) > 6 else "?",
                    }
            time.sleep(0.1)
        ser.close()
    except Exception:
        pass
    return None


def main():
    parser = argparse.ArgumentParser(description="AgriVision ESP32 Batch Flash & Provision")
    parser.add_argument("--count", type=int, default=1, help="Number of cameras to flash")
    parser.add_argument("--prefix", default=DEFAULT_PREFIX, help="Serial prefix (e.g., CAM-A3F7C)")
    parser.add_argument("--start", type=int, default=1, help="Starting serial number")
    parser.add_argument("--hub-ssid", default=DEFAULT_HUB_SSID, help="Hub WiFi SSID")
    parser.add_argument("--hub-pass", default=DEFAULT_HUB_PASS, help="Hub WiFi password")
    parser.add_argument("--hub-ip", default=DEFAULT_HUB_IP, help="Hub IP address")
    parser.add_argument("--hub-port", type=int, default=DEFAULT_HUB_PORT, help="Hub port")
    parser.add_argument("--zone", default=DEFAULT_ZONE, help="Default zone")
    parser.add_argument("--port", default=None, help="Serial port (auto-detect if omitted)")
    parser.add_argument("--skip-flash", action="store_true", help="Skip firmware flash (provision only)")
    parser.add_argument("--output", default="provisioned_cameras.csv", help="Output CSV log")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════╗")
    print("║  🌱 AgriVision Batch Flash & Provision    ║")
    print("╚══════════════════════════════════════════╝")
    print(f"  Cameras:  {args.count}")
    print(f"  Serials:  {args.prefix}{args.start:03d} → {args.prefix}{args.start + args.count - 1:03d}")
    print(f"  Hub:      {args.hub_ssid} @ {args.hub_ip}:{args.hub_port}")
    print(f"  Zone:     {args.zone}")
    print()

    # Results log
    results = []
    success_count = 0
    fail_count = 0

    for i in range(args.count):
        num = args.start + i
        serial_num = f"{args.prefix}{num:03d}"

        print(f"\n{'═' * 50}")
        print(f"  📷 Camera {i+1}/{args.count} — {serial_num}")
        print(f"{'═' * 50}")

        if i > 0:
            input("  🔌 Connect next ESP32 and press ENTER...")
            time.sleep(2)

        # Auto-detect port
        port = args.port or find_esp32_port()
        if not port:
            print("  ❌ No ESP32 detected — skipping")
            results.append({"serial": serial_num, "status": "NO_PORT", "mac": "", "port": ""})
            fail_count += 1
            continue

        print(f"  📍 Port: {port}")

        # Flash firmware
        if not args.skip_flash:
            if not flash_firmware(port):
                results.append({"serial": serial_num, "status": "FLASH_FAIL", "mac": "", "port": port})
                fail_count += 1
                continue
            time.sleep(3)  # Wait for ESP32 reboot

        # Provision
        ok = provision_camera(
            port, serial_num,
            args.hub_ssid, args.hub_pass, args.hub_ip, args.hub_port, args.zone
        )

        # Verify
        time.sleep(1)
        status = get_camera_status(port)
        mac = status["mac"] if status else "?"

        if ok:
            success_count += 1
            results.append({
                "serial": serial_num, "status": "OK", "mac": mac, "port": port,
                "hub_ssid": args.hub_ssid, "zone": args.zone,
                "timestamp": datetime.now().isoformat()
            })
            print(f"  ✅ {serial_num} ready (MAC: {mac})")
        else:
            fail_count += 1
            results.append({"serial": serial_num, "status": "PROVISION_FAIL", "mac": mac, "port": port})

    # ── Summary ──
    print(f"\n{'═' * 50}")
    print(f"  🏁 BATCH COMPLETE")
    print(f"  ✅ Success: {success_count}")
    print(f"  ❌ Failed:  {fail_count}")
    print(f"{'═' * 50}")

    # Save CSV log
    with open(args.output, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["serial", "status", "mac", "port", "hub_ssid", "zone", "timestamp"])
        writer.writeheader()
        writer.writerows(results)
    print(f"\n  📄 Log saved: {args.output}")

    # Print label data for QR generator
    print("\n  📋 Serial → MAC mapping (for QR labels):")
    for r in results:
        if r["status"] == "OK":
            print(f"     {r['serial']} → {r['mac']}")


if __name__ == "__main__":
    main()

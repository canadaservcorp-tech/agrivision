#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════╗
║  AgriVision — Camera QR Label Generator              ║
║  Creates printable label sheets for each camera      ║
║  © 2026 PCTA S.A.                                    ║
╚══════════════════════════════════════════════════════╝

Usage:
  # From batch_flash output CSV
  python qr_labels.py --csv provisioned_cameras.csv

  # Manual list
  python qr_labels.py --serials CAM-A3F7C001 CAM-A3F7C002 CAM-A3F7C003

  # Custom hub info
  python qr_labels.py --csv cameras.csv --hub-ssid "MyFarm-HUB" --hub-pass "mypass"

Output:
  labels/camera_labels.html  → Open in browser, print as stickers

Requirements:
  pip install qrcode pillow
"""

import argparse
import csv
import os
import sys
import base64
from io import BytesIO
from datetime import datetime

try:
    import qrcode
except ImportError:
    print("❌ pip install qrcode pillow")
    sys.exit(1)


def generate_qr_base64(data: str, size: int = 150) -> str:
    """Generate QR code and return as base64 PNG."""
    qr = qrcode.QRCode(version=1, box_size=4, border=2,
                        error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def make_qr_data(serial: str, mac: str, hub_ssid: str, hub_pass: str, hub_ip: str, hub_port: int) -> str:
    """Create QR payload — JSON that the provisioning app can read."""
    return (
        f'{{"serial":"{serial}","mac":"{mac}",'
        f'"hub_ssid":"{hub_ssid}","hub_pass":"{hub_pass}",'
        f'"hub_ip":"{hub_ip}","hub_port":{hub_port}}}'
    )


def generate_html(cameras: list, hub_ssid: str, hub_pass: str, hub_ip: str, hub_port: int) -> str:
    """Generate printable HTML label sheet."""
    labels_html = ""

    for cam in cameras:
        serial = cam.get("serial", "?")
        mac = cam.get("mac", "?")

        qr_data = make_qr_data(serial, mac, hub_ssid, hub_pass, hub_ip, hub_port)
        qr_b64 = generate_qr_base64(qr_data)

        labels_html += f"""
    <div class="label">
      <div class="qr">
        <img src="data:image/png;base64,{qr_b64}" alt="QR">
      </div>
      <div class="info">
        <div class="brand">🌱 AgriVision</div>
        <div class="serial">{serial}</div>
        <div class="mac">{mac}</div>
        <div class="detail">WiFi: {hub_ssid}</div>
        <div class="detail">Hub: {hub_ip}:{hub_port}</div>
        <div class="detail">FW: v1.2.0 | {datetime.now().strftime('%Y-%m-%d')}</div>
      </div>
    </div>
"""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>AgriVision Camera Labels</title>
<style>
  @page {{ margin: 10mm; }}
  body {{ font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 10px; }}
  .sheet {{ display: flex; flex-wrap: wrap; gap: 8px; }}
  .label {{
    width: 85mm; height: 40mm;
    border: 1px solid #ccc; border-radius: 4px;
    display: flex; align-items: center; padding: 4px 8px;
    page-break-inside: avoid;
    background: #fff;
  }}
  .qr {{ flex: 0 0 36mm; text-align: center; }}
  .qr img {{ width: 34mm; height: 34mm; }}
  .info {{ flex: 1; padding-left: 6px; }}
  .brand {{ font-size: 10px; font-weight: 700; color: #1e3a2f; margin-bottom: 2px; }}
  .serial {{ font-size: 14px; font-weight: 900; color: #1e3a2f; letter-spacing: 0.5px; }}
  .mac {{ font-size: 8px; color: #6b7280; font-family: monospace; margin-bottom: 3px; }}
  .detail {{ font-size: 7px; color: #9ca3af; line-height: 1.4; }}

  @media print {{
    body {{ padding: 0; }}
    .label {{ border: 1px dashed #ddd; }}
    .no-print {{ display: none; }}
  }}
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px; padding:12px; background:#f0f4e8; border-radius:8px">
    <strong>🌱 AgriVision Camera Labels</strong> — {len(cameras)} cameras<br>
    <small>Print on adhesive label paper (85mm × 40mm per label). Use Ctrl+P → "More settings" → Margins: None</small>
  </div>
  <div class="sheet">
{labels_html}
  </div>
</body>
</html>"""


def main():
    parser = argparse.ArgumentParser(description="AgriVision QR Label Generator")
    parser.add_argument("--csv", help="Input CSV from batch_flash.py")
    parser.add_argument("--serials", nargs="+", help="Manual serial list")
    parser.add_argument("--hub-ssid", default="AgriVision-HUB")
    parser.add_argument("--hub-pass", default="agri2026secure")
    parser.add_argument("--hub-ip", default="192.168.4.1")
    parser.add_argument("--hub-port", type=int, default=8080)
    parser.add_argument("--output", default="labels/camera_labels.html")
    args = parser.parse_args()

    cameras = []

    if args.csv:
        with open(args.csv) as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("status") == "OK":
                    cameras.append({"serial": row["serial"], "mac": row.get("mac", "?")})
        print(f"📄 Loaded {len(cameras)} cameras from {args.csv}")

    elif args.serials:
        for s in args.serials:
            cameras.append({"serial": s, "mac": "?"})
        print(f"📋 Using {len(cameras)} manual serials")

    else:
        print("❌ Provide --csv or --serials")
        sys.exit(1)

    if not cameras:
        print("❌ No cameras to label")
        sys.exit(1)

    # Generate HTML
    html = generate_html(cameras, args.hub_ssid, args.hub_pass, args.hub_ip, args.hub_port)

    # Save
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w") as f:
        f.write(html)

    print(f"✅ Labels generated: {args.output}")
    print(f"   Open in browser and print on adhesive labels")
    print(f"   Each label: 85mm × 40mm with QR code + serial + MAC")


if __name__ == "__main__":
    main()

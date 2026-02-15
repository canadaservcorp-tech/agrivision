#!/bin/bash
# ═══ Agrivision Pi CM4 Setup Script ═══
# Run: sudo bash setup.sh

set -e
echo "🌱 Agrivision Hardware Setup"

# System
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv git libcamera-apps sqlite3

# Enable I2C and Camera
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_camera 0

# Create directories
sudo mkdir -p /opt/agrivision/{images,data,models,logs}
sudo chown -R $USER:$USER /opt/agrivision

# Python deps
pip3 install --break-system-packages \
  picamera2 adafruit-circuitpython-dht adafruit-circuitpython-ads1x15 \
  tflite-runtime numpy pillow requests psutil RPi.GPIO

# Copy files
cp src/*.py /opt/agrivision/

# Systemd service
sudo tee /etc/systemd/system/agrivision.service > /dev/null << EOF
[Unit]
Description=Agrivision Monitoring Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/agrivision
ExecStart=/usr/bin/python3 /opt/agrivision/main.py
Restart=always
RestartSec=30
Environment=AGRIVISION_API_URL=https://YOUR-BACKEND.up.railway.app/api/v1
Environment=AGRIVISION_DEVICE_UUID=CHANGE_ME

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable agrivision
echo "✅ Setup complete. Edit /etc/systemd/system/agrivision.service to set DEVICE_UUID and API_URL"
echo "   Then: sudo systemctl start agrivision"

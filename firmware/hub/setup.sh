#!/bin/bash
# ============================================================
# AgriVision Central Hub Setup Script
# Run on fresh Raspberry Pi 4B with Raspberry Pi OS
# Usage: sudo bash setup.sh
# ============================================================

set -e

echo "╔══════════════════════════════════════════════╗"
echo "║     🌱 AgriVision Hub Setup v3.0             ║"
echo "╚══════════════════════════════════════════════╝"

# Check root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Run with sudo: sudo bash setup.sh"
    exit 1
fi

AGRI_USER="agrivision"
AGRI_HOME="/home/$AGRI_USER"

echo ""
echo "1️⃣  System update..."
apt update && apt upgrade -y

echo ""
echo "2️⃣  Installing dependencies..."
apt install -y \
    python3 python3-pip python3-venv \
    hostapd dnsmasq \
    libcamera-dev libcamera-tools \
    libatlas-base-dev libjpeg-dev \
    sqlite3 git curl

echo ""
echo "3️⃣  Creating agrivision user..."
if ! id "$AGRI_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$AGRI_USER"
    usermod -aG gpio,i2c,spi,video "$AGRI_USER"
fi

echo ""
echo "4️⃣  Creating directory structure..."
mkdir -p "$AGRI_HOME"/{data/images,models,logs,config}

echo ""
echo "5️⃣  Setting up Python environment..."
python3 -m venv "$AGRI_HOME/venv"
source "$AGRI_HOME/venv/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "6️⃣  Installing TFLite runtime..."
pip install tflite-runtime

echo ""
echo "7️⃣  Configuring WiFi AP..."
# Stop services during config
systemctl stop hostapd 2>/dev/null || true
systemctl stop dnsmasq 2>/dev/null || true

# Enable hostapd
systemctl unmask hostapd
systemctl enable hostapd
systemctl enable dnsmasq

echo ""
echo "8️⃣  Creating systemd service..."
cat > /etc/systemd/system/agrivision-hub.service << EOF
[Unit]
Description=AgriVision Central Hub
After=network.target
Wants=network.target

[Service]
Type=simple
User=$AGRI_USER
WorkingDirectory=$AGRI_HOME
Environment=PATH=$AGRI_HOME/venv/bin:/usr/bin
ExecStart=$AGRI_HOME/venv/bin/python3 main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable agrivision-hub

echo ""
echo "9️⃣  Setting up USB SSD auto-mount..."
# Mount SSD to data directory if present
cat >> /etc/fstab << 'EOF'
# AgriVision USB SSD
UUID=REPLACE_WITH_SSD_UUID  /home/agrivision/data  ext4  defaults,nofail  0  2
EOF

echo ""
echo "🔟  Setting permissions..."
chown -R "$AGRI_USER":"$AGRI_USER" "$AGRI_HOME"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     ✅ Setup Complete!                       ║"
echo "║                                              ║"
echo "║  Next steps:                                 ║"
echo "║  1. Copy hub code to $AGRI_HOME/             ║"
echo "║  2. Copy AI model to $AGRI_HOME/models/      ║"
echo "║  3. Edit $AGRI_HOME/config/.env              ║"
echo "║  4. Start: sudo systemctl start agrivision-hub║"
echo "║  5. Logs: journalctl -u agrivision-hub -f    ║"
echo "╚══════════════════════════════════════════════╝"

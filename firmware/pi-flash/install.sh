#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║  AgriVision Central Hub — Master Installer v3.0             ║
# ║  Run on fresh Raspberry Pi 4B with Pi OS (64-bit Lite)      ║
# ║                                                              ║
# ║  Usage:                                                      ║
# ║    1. Flash Pi OS Lite 64-bit to SD card                     ║
# ║    2. Copy this entire folder to /boot/agrivision-install/   ║
# ║    3. Boot Pi, SSH in (pi@raspberrypi.local)                 ║
# ║    4. sudo bash /boot/agrivision-install/install.sh          ║
# ║                                                              ║
# ║  © 2026 Performance Cristal Technologies Avancées S.A.       ║
# ╚══════════════════════════════════════════════════════════════╝

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
AGRI_USER="agrivision"
AGRI_HOME="/home/$AGRI_USER"
LOG="/var/log/agrivision-install.log"

step() { echo -e "\n${CYAN}[$1/13]${NC} ${GREEN}$2${NC}"; echo "[$1/13] $2" >> "$LOG"; }
warn() { echo -e "  ${YELLOW}⚠  $1${NC}"; }
ok()   { echo -e "  ${GREEN}✅ $1${NC}"; }
fail() { echo -e "  ${RED}❌ $1${NC}"; echo "FATAL: $1" >> "$LOG"; exit 1; }

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     🌱 AgriVision Hub Installer v3.0                ║${NC}"
echo -e "${GREEN}║     AI-Powered Agricultural Monitoring               ║${NC}"
echo -e "${GREEN}║     © 2026 PCTA S.A.                                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
date >> "$LOG"

# ── Check root ──
if [ "$EUID" -ne 0 ]; then
    fail "Run with sudo: sudo bash install.sh"
fi

# ── Check Pi model ──
PI_MODEL=$(cat /proc/cpuinfo | grep "Model" | head -1 | cut -d: -f2 | xargs)
echo -e "  📌 Hardware: ${CYAN}${PI_MODEL}${NC}"
echo "Hardware: $PI_MODEL" >> "$LOG"

# ── Check install source ──
if [ ! -d "$INSTALL_DIR/agrivision" ]; then
    fail "agrivision/ directory not found in $INSTALL_DIR"
fi

# ════════════════════════════════════════════════════════════
step 1 "Updating system packages..."
# ════════════════════════════════════════════════════════════
apt update -qq >> "$LOG" 2>&1
apt upgrade -y -qq >> "$LOG" 2>&1
ok "System updated"

# ════════════════════════════════════════════════════════════
step 2 "Installing system dependencies..."
# ════════════════════════════════════════════════════════════
apt install -y -qq \
    python3 python3-pip python3-venv python3-dev \
    hostapd dnsmasq iptables \
    libcamera-dev libcamera-tools \
    libatlas-base-dev libjpeg-dev libopenjp2-7-dev \
    sqlite3 curl git i2c-tools \
    libgpiod2 \
    >> "$LOG" 2>&1
ok "Dependencies installed"

# ════════════════════════════════════════════════════════════
step 3 "Creating agrivision user & directories..."
# ════════════════════════════════════════════════════════════
if ! id "$AGRI_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$AGRI_USER"
    echo "$AGRI_USER:agrivision2026" | chpasswd
    ok "User '$AGRI_USER' created (password: agrivision2026)"
else
    ok "User '$AGRI_USER' already exists"
fi
usermod -aG gpio,i2c,spi,video,dialout "$AGRI_USER" 2>/dev/null || true

mkdir -p "$AGRI_HOME"/{data/images/synced,models,logs,backups,config}
ok "Directories created"

# ════════════════════════════════════════════════════════════
step 4 "Copying AgriVision software..."
# ════════════════════════════════════════════════════════════
# Copy all application code
cp -r "$INSTALL_DIR/agrivision/"* "$AGRI_HOME/"

# Copy ESP32 firmware for reference
mkdir -p "$AGRI_HOME/esp32-firmware"
cp -r "$INSTALL_DIR/esp32-firmware/"* "$AGRI_HOME/esp32-firmware/" 2>/dev/null || true

FILE_COUNT=$(find "$AGRI_HOME" -type f | wc -l)
ok "Copied $FILE_COUNT files to $AGRI_HOME"

# ════════════════════════════════════════════════════════════
step 5 "Setting up Python virtual environment..."
# ════════════════════════════════════════════════════════════
python3 -m venv "$AGRI_HOME/venv"
source "$AGRI_HOME/venv/bin/activate"
pip install --upgrade pip >> "$LOG" 2>&1
ok "Virtual environment created"

# ════════════════════════════════════════════════════════════
step 6 "Installing Python packages (this takes ~5 minutes)..."
# ════════════════════════════════════════════════════════════
pip install -r "$AGRI_HOME/requirements.txt" >> "$LOG" 2>&1 || {
    warn "Some optional packages may have failed (LoRaWAN, multispectral)"
    # Retry core packages only
    pip install aiohttp aiomqtt httpx tflite-runtime Pillow numpy python-dotenv \
        aiosqlite psutil RPi.GPIO >> "$LOG" 2>&1 || true
}
ok "Python packages installed"

# ════════════════════════════════════════════════════════════
step 7 "Configuring WiFi Access Point..."
# ════════════════════════════════════════════════════════════
# Stop services during config
systemctl stop hostapd 2>/dev/null || true
systemctl stop dnsmasq 2>/dev/null || true

# Copy network configs
cp "$INSTALL_DIR/system/hostapd.conf" /etc/hostapd/hostapd.conf
cp "$INSTALL_DIR/system/dnsmasq.conf" /etc/dnsmasq.d/agrivision.conf

# Point hostapd to our config
echo 'DAEMON_CONF="/etc/hostapd/hostapd.conf"' > /etc/default/hostapd

# Set static IP for wlan0
if ! grep -q "AgriVision" /etc/dhcpcd.conf 2>/dev/null; then
    echo "" >> /etc/dhcpcd.conf
    echo "# === AgriVision Hub WiFi AP ===" >> /etc/dhcpcd.conf
    cat "$INSTALL_DIR/system/dhcpcd-append.conf" >> /etc/dhcpcd.conf
fi

# Enable IP forwarding (camera nodes → internet)
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf

# NAT masquerade (cameras can reach internet through hub)
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Save iptables rules
iptables-save > /etc/iptables.ipv4.nat
# Restore on boot
if ! grep -q "iptables-restore" /etc/rc.local 2>/dev/null; then
    sed -i '/^exit 0/i iptables-restore < /etc/iptables.ipv4.nat' /etc/rc.local 2>/dev/null || {
        echo '#!/bin/bash' > /etc/rc.local
        echo 'iptables-restore < /etc/iptables.ipv4.nat' >> /etc/rc.local
        echo 'exit 0' >> /etc/rc.local
        chmod +x /etc/rc.local
    }
fi

systemctl unmask hostapd
systemctl enable hostapd
systemctl enable dnsmasq
ok "WiFi AP configured (SSID: AgriVision-HUB)"

# ════════════════════════════════════════════════════════════
step 8 "Applying kernel tuning..."
# ════════════════════════════════════════════════════════════
cp "$INSTALL_DIR/system/99-agrivision.conf" /etc/sysctl.d/99-agrivision.conf
sysctl --system >> "$LOG" 2>&1
ok "Kernel parameters applied"

# ════════════════════════════════════════════════════════════
step 9 "Enabling hardware interfaces..."
# ════════════════════════════════════════════════════════════
# Enable I2C
raspi-config nonint do_i2c 0 2>/dev/null || true
# Enable SPI
raspi-config nonint do_spi 0 2>/dev/null || true
# Enable camera
raspi-config nonint do_camera 0 2>/dev/null || true
# Set GPU memory for AI inference
echo "gpu_mem=128" >> /boot/config.txt 2>/dev/null || \
echo "gpu_mem=128" >> /boot/firmware/config.txt 2>/dev/null || true
ok "I2C, SPI, Camera enabled. GPU mem: 128MB"

# ════════════════════════════════════════════════════════════
step 10 "Installing systemd services..."
# ════════════════════════════════════════════════════════════
cp "$INSTALL_DIR/system/agrivision-hub.service" /etc/systemd/system/
cp "$INSTALL_DIR/system/agrivision-watchdog.service" /etc/systemd/system/
cp "$INSTALL_DIR/system/agrivision-watchdog.timer" /etc/systemd/system/
cp "$INSTALL_DIR/system/agrivision-hardware.service" /etc/systemd/system/

systemctl daemon-reload
systemctl enable agrivision-hub
systemctl enable agrivision-watchdog.timer
ok "Services installed and enabled"

# ════════════════════════════════════════════════════════════
step 11 "Installing cron jobs..."
# ════════════════════════════════════════════════════════════
crontab -u "$AGRI_USER" "$AGRI_HOME/scripts/crontab"
ok "Cron: daily backup 2AM, weekly update 3AM, daily cleanup 4AM"

# ════════════════════════════════════════════════════════════
step 12 "Setting permissions & making scripts executable..."
# ════════════════════════════════════════════════════════════
chown -R "$AGRI_USER":"$AGRI_USER" "$AGRI_HOME"
chmod +x "$AGRI_HOME/scripts/"*.sh
chmod +x "$AGRI_HOME/hardware/usb_mount.sh"
chmod 600 "$AGRI_HOME/config/agrivision.conf"
chown "$AGRI_USER":"$AGRI_USER" "$AGRI_HOME/config/agrivision.conf"
ok "Permissions set"

# ════════════════════════════════════════════════════════════
step 13 "Creating AI model placeholder..."
# ════════════════════════════════════════════════════════════
if [ ! -f "$AGRI_HOME/models/agrivision_v3.tflite" ]; then
    # Create a placeholder — replace with real model
    echo "PLACEHOLDER — Replace with trained model" > "$AGRI_HOME/models/agrivision_v3.tflite"
    
    # Create labels file
    cat > "$AGRI_HOME/models/labels.txt" << 'LABELS'
0 healthy
1 bayoud_disease
2 red_palm_weevil
3 leaf_spot
4 early_blight
5 late_blight
6 powdery_mildew
7 fusarium_wilt
8 spider_mites
9 whitefly
10 black_rot
11 anthracnose
12 bacterial_wilt
13 root_rot
14 nutrient_deficiency
LABELS
    warn "Model placeholder created — upload real .tflite model to: $AGRI_HOME/models/"
else
    ok "AI model already present"
fi

chown -R "$AGRI_USER":"$AGRI_USER" "$AGRI_HOME"

# ════════════════════════════════════════════════════════════
# COMPLETE
# ════════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Installation Complete!                        ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  ${YELLOW}BEFORE REBOOTING:${GREEN}                                  ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  1. Edit hub config:                                 ║${NC}"
echo -e "${GREEN}║     ${CYAN}sudo nano /home/agrivision/config/agrivision.conf${GREEN} ║${NC}"
echo -e "${GREEN}║     → Set HUB_SERIAL, FARM_ID, CLOUD_API_KEY        ║${NC}"
echo -e "${GREEN}║     → Set AP_SSID/AP_PASSWORD for your farm          ║${NC}"
echo -e "${GREEN}║     → Set TWILIO creds for WhatsApp alerts           ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  2. Upload AI model:                                 ║${NC}"
echo -e "${GREEN}║     ${CYAN}scp model.tflite agrivision@hub:/home/agrivision/models/agrivision_v3.tflite${GREEN}${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  3. Connect Ethernet (for internet uplink)           ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  4. Reboot:                                          ║${NC}"
echo -e "${GREEN}║     ${CYAN}sudo reboot${GREEN}                                      ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  ${YELLOW}AFTER REBOOT:${GREEN}                                      ║${NC}"
echo -e "${GREEN}║  • Hub auto-starts on boot                           ║${NC}"
echo -e "${GREEN}║  • WiFi AP: AgriVision-HUB (pw: agri2026secure)      ║${NC}"
echo -e "${GREEN}║  • Camera receiver: http://192.168.4.1:8080          ║${NC}"
echo -e "${GREEN}║  • Watchdog runs every 5 min                         ║${NC}"
echo -e "${GREEN}║  • Backup runs daily at 2 AM                         ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  ${YELLOW}USEFUL COMMANDS:${GREEN}                                    ║${NC}"
echo -e "${GREEN}║  ${CYAN}sudo systemctl status agrivision-hub${GREEN}                ║${NC}"
echo -e "${GREEN}║  ${CYAN}journalctl -u agrivision-hub -f${GREEN}                     ║${NC}"
echo -e "${GREEN}║  ${CYAN}cat /home/agrivision/logs/watchdog.log${GREEN}              ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Install log: $LOG"
echo ""

# 🌱 AgriVision Pi Hub — SD Card Flash Guide

## Complete Guide: Flash → Boot → Run

---

## What's Included (Everything Built Today)

| Component | Files | Description |
|-----------|-------|-------------|
| **Hub Core** | `main.py` + 8 services | Async orchestrator: camera receiver, AI detector, cloud sync, fleet manager, sensor reader, WiFi AP, local storage |
| **Fleet Manager v2** | `fleet_manager_v2.py` | Auto-discovery (mDNS), OTA firmware, health scoring, capture scheduling, zone management |
| **SD Sync Manager** | `whatsapp_and_reports.py` | Handles SD-buffered images from ESP32 cameras when WiFi was down |
| **WhatsApp Alerts** | Twilio integration | Disease alerts, sensor alerts, weekly summaries via WhatsApp |
| **PDF Reports** | ReportLab | Weekly farm health reports with charts and tables |
| **Hardware Scripts** | 6 Devin scripts | Capture cycle, multispectral imaging, weather station, LoRaWAN, SD update, USB mount |
| **AI Pipeline** | `training_pipeline.py` | Model training for custom disease detection |
| **ESP32 Provisioning** | `provision.py` | Batch flash + configure ESP32 camera nodes |
| **ESP32 Firmware** | `.ino` + SD module | Camera node firmware with offline SD buffering |
| **Watchdog** | `watchdog.sh` | Monitors CPU temp, RAM, disk, services, cameras — auto-recovery |
| **Daily Backup** | `backup.sh` | SQLite + config backup, 14-day retention |
| **OTA Self-Update** | `update.sh` | Weekly check for hub software updates with rollback |
| **System Config** | hostapd, dnsmasq, systemd | WiFi AP, DHCP, auto-start services, kernel tuning |

---

## Step-by-Step Flash Instructions

### Prerequisites
- Raspberry Pi 4B (4GB+ RAM recommended)
- MicroSD card (32GB+ recommended, Class 10 / A2)
- Ethernet cable (for internet uplink)
- Power supply (5V 3A USB-C)
- Computer with SD card reader

### Step 1: Flash Raspberry Pi OS

1. Download **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Insert SD card into your computer
3. Open Imager and select:
   - **OS**: Raspberry Pi OS Lite (64-bit) — no desktop needed
   - **Storage**: Your SD card
4. Click ⚙️ **Settings** (gear icon):
   - ✅ Set hostname: `agrivision-hub`
   - ✅ Enable SSH (password authentication)
   - ✅ Set username: `pi` / password: `raspberry`
   - ✅ Configure WiFi: (your home/office WiFi for initial setup)
   - ✅ Set locale/timezone
5. Click **Write** and wait (~5 minutes)

### Step 2: Copy AgriVision Files to SD Card

After flashing, the SD card has a `boot` partition visible on your computer.

```bash
# On your computer — copy the entire flash package to boot partition
# macOS/Linux:
cp -r agrivision-pi-flash/ /Volumes/bootfs/agrivision-install/

# Windows:
# Copy the agrivision-pi-flash folder to D:\agrivision-install\
# (D: = your SD card boot partition)
```

### Step 3: First Boot & SSH

1. Insert SD card into Pi
2. Connect Ethernet cable (for internet during setup)
3. Power on the Pi
4. Wait 2 minutes for first boot
5. SSH into the Pi:

```bash
ssh pi@agrivision-hub.local
# password: raspberry (or whatever you set in Step 1)
```

### Step 4: Run the Installer

```bash
# Run the master installer (takes ~10-15 minutes)
sudo bash /boot/firmware/agrivision-install/install.sh

# If boot partition path differs:
sudo bash /boot/agrivision-install/install.sh
```

The installer will:
1. ✅ Update system packages
2. ✅ Install all dependencies (Python, hostapd, dnsmasq, etc.)
3. ✅ Create `agrivision` user
4. ✅ Copy all hub software
5. ✅ Create Python virtual environment
6. ✅ Install 20+ Python packages
7. ✅ Configure WiFi AP (192.168.4.1)
8. ✅ Configure DHCP for camera nodes
9. ✅ Enable I2C, SPI, Camera interfaces
10. ✅ Install systemd services (auto-start on boot)
11. ✅ Install cron jobs (backup, cleanup, update)
12. ✅ Set all permissions
13. ✅ Create AI model placeholder

### Step 5: Configure Your Hub

```bash
# Edit the runtime config
sudo nano /home/agrivision/config/agrivision.conf
```

**Required changes:**
```
HUB_SERIAL=HUB-YOUR-SERIAL-HERE    # Unique ID for this hub
FARM_ID=1                           # Your farm ID from the website
CLOUD_API_KEY=your-api-key-here     # From theagrivision.com dashboard
AP_SSID=YourFarm-HUB               # WiFi name for cameras
AP_PASSWORD=your-secure-password    # WiFi password for cameras
```

**Optional (for WhatsApp alerts):**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
FARMER_WHATSAPP=+971501234567
```

### Step 6: Upload AI Model

```bash
# From your computer — upload the trained TFLite model
scp agrivision_v3.tflite agrivision@agrivision-hub.local:/home/agrivision/models/agrivision_v3.tflite
```

### Step 7: Reboot & Go!

```bash
sudo reboot
```

After reboot, everything starts automatically:
- 🌐 WiFi AP broadcasts your SSID
- 📡 Camera receiver listens on port 8080
- 🤖 AI detector loads the model
- ☁️ Cloud sync connects to backend
- 👁️ Watchdog monitors every 5 minutes

---

## Verify Everything Works

```bash
# Check hub is running
sudo systemctl status agrivision-hub

# Watch live logs
journalctl -u agrivision-hub -f

# Check WiFi AP
sudo systemctl status hostapd

# See connected cameras
iw dev wlan0 station dump

# Check watchdog
cat /home/agrivision/logs/watchdog.log

# Check disk/memory
df -h /home/agrivision
free -m
```

---

## File Structure on the Pi

```
/home/agrivision/
├── main.py                          # Hub orchestrator (7 async services)
├── requirements.txt                 # Python dependencies
├── config/
│   ├── __init__.py
│   ├── settings.py                  # Settings class (reads agrivision.conf)
│   └── agrivision.conf              # ★ YOUR RUNTIME CONFIG (edit this)
├── services/
│   ├── camera_receiver.py           # HTTP server for ESP32 image uploads
│   ├── ai_detector.py               # TFLite disease detection
│   ├── cloud_sync.py                # MQTT/HTTP sync to cloud API
│   ├── fleet_manager.py             # Basic fleet management
│   ├── fleet_manager_v2.py          # ★ Enhanced: auto-discovery, OTA, health
│   ├── local_storage.py             # SQLite local database
│   ├── sensor_reader.py             # DHT22, soil, light sensors
│   ├── wifi_ap.py                   # WiFi AP management
│   └── whatsapp_and_reports.py      # ★ WhatsApp alerts + PDF reports
├── hardware/
│   ├── capture_cycle.py             # Multispectral capture orchestration
│   ├── multispectral.py             # NDVI/vegetation index
│   ├── weather_station.py           # BME280, BH1750, wind, rain
│   ├── lorawan_satellite_drone.py   # LoRaWAN communication
│   ├── sd_update.py                 # Hub-side SD card management
│   └── usb_mount.sh                 # USB SSD auto-mount
├── ai/
│   ├── training_pipeline.py         # Model training (run manually)
│   └── models/                      # → symlink to /home/agrivision/models/
├── tools/
│   └── provision.py                 # ★ ESP32 batch provisioning + QR labels
├── scripts/
│   ├── watchdog.sh                  # ★ Health monitor (every 5 min)
│   ├── backup.sh                    # ★ Daily backup at 2 AM
│   ├── update.sh                    # ★ Weekly OTA self-update
│   └── crontab                      # Cron job definitions
├── models/
│   ├── agrivision_v3.tflite         # AI model (upload yours!)
│   └── labels.txt                   # Disease class labels
├── data/
│   ├── hub.db                       # SQLite database (auto-created)
│   └── images/                      # Captured images
│       └── synced/                  # Images already synced to cloud
├── logs/                            # All log files
├── backups/                         # Daily database backups
├── esp32-firmware/                  # Reference: ESP32 camera code
│   ├── esp32_cam_node.ino
│   ├── sd_buffer_module.h           # ★ Offline SD buffering
│   └── platformio.ini
└── venv/                            # Python virtual environment
```

---

## Quick Reference

| Service | Port | Description |
|---------|------|-------------|
| Camera Receiver | 8080 | ESP32 image uploads |
| WiFi AP | wlan0 | 192.168.4.1/24 |
| DHCP | 192.168.4.10-250 | Camera node IPs |
| Hub SSH | 22 | Management access |

| Command | What it does |
|---------|--------------|
| `sudo systemctl restart agrivision-hub` | Restart hub |
| `sudo systemctl stop agrivision-hub` | Stop hub |
| `journalctl -u agrivision-hub -f` | Live logs |
| `cat ~/logs/watchdog.log` | Watchdog history |
| `iw dev wlan0 station dump` | Connected cameras |
| `sqlite3 ~/data/hub.db ".tables"` | Database tables |
| `python3 tools/provision.py --batch 10` | Flash 10 ESP32s |
| `sudo bash scripts/backup.sh` | Manual backup |

---

## © 2026 Performance Cristal Technologies Avancées S.A.
## info@theagrivision.com | https://theagrivision.com

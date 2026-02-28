# 🌱 AgriVision ESP32-S3 Camera Node — Production Firmware

## Complete firmware for mass-deploying identical camera nodes.

---

## What's Included

| File | Lines | Purpose |
|------|-------|---------|
| `src/main.cpp` | 350+ | Master firmware: boot → test → provision → capture → upload → sleep |
| `include/config.h` | 110 | Per-unit identity stored in NVS flash (survives OTA) |
| `include/led_status.h` | 140 | 12 blink patterns for field techs (no SSH needed) |
| `include/self_test.h` | 165 | Boot diagnostics: PSRAM, camera, SD, battery, WiFi |
| `include/power_manager.h` | 115 | 5 battery profiles: FULL → NORMAL → SAVER → CRITICAL → SHUTDOWN |
| `include/ota_receiver.h` | 130 | HTTP OTA from hub with checksum + rollback |
| `include/heartbeat.h` | 120 | 60s health reports to hub + command receiver |
| `include/sd_buffer.h` | 195 | Offline image buffering when WiFi is down |
| `include/auto_provision.h` | 230 | WiFi AP setup page + serial provisioning protocol |
| `scripts/batch_flash.py` | 240 | Flash + provision N cameras from one PC |
| `scripts/qr_labels.py` | 175 | Generate printable QR sticker sheets |
| `platformio.ini` | 50 | Build config for ESP32-S3 |
| `partitions_ota.csv` | 6 | Dual-partition OTA layout |

---

## Manufacturing Workflow

### Step 1: Build Firmware Once
```bash
cd esp32-production
pio run    # Compiles firmware binary
```

### Step 2: Batch Flash + Provision
```bash
# Flash 10 cameras (connect one at a time via USB)
python scripts/batch_flash.py \
  --count 10 \
  --prefix CAM-A3F7C \
  --start 1 \
  --hub-ssid "AlRashidi-HUB" \
  --hub-pass "farm2026secure" \
  --hub-ip "192.168.4.1" \
  --zone "north_field"

# Script will:
# 1. Build firmware
# 2. Flash to ESP32
# 3. Send unique serial via USB
# 4. Verify provisioning
# 5. Save log to provisioned_cameras.csv
# 6. Prompt "connect next camera" between each unit
```

### Step 3: Print Labels
```bash
python scripts/qr_labels.py --csv provisioned_cameras.csv
# → labels/camera_labels.html
# Open in browser → Print on adhesive labels
```

### Step 4: Stick Label + Deploy
Each camera gets a QR sticker with its serial, MAC, and hub info.
Field techs can scan QR to identify cameras.

---

## Boot Sequence (Every Camera)

```
POWER ON
  │
  ├─ Init LED (fast blink)
  ├─ Load config from NVS flash
  ├─ Check BOOT button (>5s = factory reset)
  ├─ Read battery → select power profile
  │
  ├─ Self-Test
  │   ├─ PSRAM check
  │   ├─ Camera capture test
  │   ├─ SD card read/write test
  │   └─ Battery voltage check
  │
  ├─ Post-OTA check
  │   ├─ If tests pass → confirm firmware
  │   └─ If tests fail → rollback to previous version
  │
  ├─ If NOT provisioned → WiFi AP mode
  │   ├─ Creates "AgriCam-XXXX" network
  │   ├─ Phone connects → http://192.168.4.1
  │   └─ Enter serial, hub WiFi, zone → reboot
  │
  ├─ Connect to hub WiFi
  ├─ Send heartbeat → get commands
  ├─ Init camera at profile-adjusted resolution
  │
  └─ CAPTURE LOOP
      ├─ Take photo
      ├─ Upload to hub HTTP :8080
      │   ├─ Success → hub runs AI detection
      │   └─ Fail → save to SD card
      ├─ Sync any SD-buffered images
      ├─ Process hub commands
      └─ Deep sleep until next capture
```

---

## Power Profiles

| Profile | Battery | Interval | Resolution | Flash | AI |
|---------|---------|----------|-----------|-------|-----|
| FULL | >80% | 1× | UXGA 1600×1200 | ✅ | ✅ |
| NORMAL | 50-80% | 1× | UXGA 1600×1200 | ❌ | ✅ |
| SAVER | 25-50% | 2× | XGA 1024×768 | ❌ | ✅ |
| CRITICAL | 10-25% | 4× | VGA 640×480 | ❌ | ❌ |
| SHUTDOWN | <10% | sleep 1hr | — | — | — |

---

## LED Patterns (Field Reference)

| Pattern | Meaning | Action |
|---------|---------|--------|
| 5× fast blink | Booting | Wait |
| Slow pulse (1s on/off) | Provisioning mode | Connect to AgriCam-XXXX WiFi |
| Double blink | Connecting to hub WiFi | Wait |
| Single flash | Taking photo | Normal |
| Triple fast | Uploading image | Normal |
| Long-short | Saving to SD (WiFi down) | Check hub WiFi |
| SOS (···---···) | Error | Check serial log |
| Dim pulse every 5s | Low battery | Charge or replace |
| Rapid flicker | OTA update in progress | Do not disconnect |
| 3 long blinks | Factory reset | Camera will reboot |

---

## Hub Commands (via heartbeat response)

```json
{"cmd": "set_interval", "value": "600"}      // Change to 10 min
{"cmd": "ota", "value": "http://hub:8080/firmware/v1.3.0.bin"}
{"cmd": "reboot", "value": ""}
{"cmd": "set_flash", "value": "true"}
{"cmd": "set_zone", "value": "east_field"}
{"cmd": "set_resolution", "value": "2"}       // 0=UXGA, 2=XGA, 4=VGA
{"cmd": "factory_reset", "value": ""}
{"cmd": "sync_sd", "value": ""}
```

---

## Provisioning Methods

### Method 1: Batch Script (Manufacturing)
```bash
python batch_flash.py --count 50 --prefix CAM-DXB
# Automated: flash + serial provision via USB
```

### Method 2: WiFi AP (Field Setup)
1. Camera boots unprovisionied → creates "AgriCam-XXXX" WiFi
2. Connect phone/laptop to that WiFi
3. Open http://192.168.4.1
4. Enter serial, hub WiFi, zone → Save
5. Camera reboots into normal mode

### Method 3: Serial Console (Debug)
```
PROVISION:CAM-TEST001,AgriVision-HUB,password,192.168.4.1,8080,test_zone
STATUS
FACTORY_RESET
```

---

## © 2026 Performance Cristal Technologies Avancées S.A.

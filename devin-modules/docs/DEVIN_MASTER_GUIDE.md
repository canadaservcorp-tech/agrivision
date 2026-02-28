# Agrivision — Complete Devin Implementation Guide v2.1
## All Modules: EU Workshop + Franchise + Certification + Time-Lapse/CCTV + Device/SD Update
### Performance Cristal Technologies Avancées S.A. — February 2026

---

## WHAT'S INSIDE (48 files)

### Backend — `/backend/src/` (21 files)

| File | Module | Feature |
|------|--------|---------|
| **Routes** | | |
| `routes/farmId.js` | EU Core | Digital Farm ID — CRUD + data consent |
| `routes/climate.js` | EU Core | Climate risk forecasting + anomaly detection |
| `routes/advisory.js` | EU Core | GenAI chatbot (Claude API) |
| `routes/compliance.js` | EU Core | Carbon footprint & sustainability reports |
| `routes/benchmark.js` | EU Core | Cross-farm benchmarking |
| `routes/interop.js` | EU Core | CEADS-compatible data exchange (JSON-LD) |
| `routes/franchise.js` | Franchise | Partner registration (public + admin) |
| `routes/certification.js` | Franchise | Green certificate issuance, PDF, QR verify |
| `routes/timelapse.js` | Time-Lapse | Photo capture API, video generation, CCTV status |
| `routes/devices.js` | Device/Update | Device status, heartbeat, OTA, SD2 update mgmt |
| **Services** | | |
| `services/climateService.js` | EU Core | Open-Meteo weather + risk scoring |
| `services/advisoryService.js` | EU Core | RAG chatbot via Anthropic Claude API |
| `services/anomalyService.js` | EU Core | Statistical anomaly detection (Z-score) |
| `services/certificationService.js` | Franchise | Criteria evaluation engine (7 criteria) |
| `services/certificatePdfService.js` | Franchise | PDF generation with QR code (pdfkit) |
| **Middleware** | | |
| `middleware/dataConsent.js` | EU Core | Data sovereignty consent checks |
| **Database** | | |
| `models/enhancement_migrations.sql` | EU Core | 7 tables |
| `models/franchise_cert_migrations.sql` | Franchise | 3 tables |
| `models/timelapse_migration.sql` | Time-Lapse | 3 tables (photos, videos, jobs) |
| `models/device_update_migration.sql` | Device/Update | 3 tables (devices, releases, history) |

### Mobile (Flutter) — `/mobile/lib/` (14 files)

| File | Module | Feature |
|------|--------|---------|
| `screens/advisory_chat_screen.dart` | EU Core | GenAI chat UI (4 languages) |
| `screens/risk_dashboard_screen.dart` | EU Core | Climate risk gauges + forecast |
| `screens/digital_twin_screen.dart` | EU Core | Farm map with sensor overlays |
| `screens/compliance_screen.dart` | EU Core | Report generation UI |
| `screens/certification_screen.dart` | Franchise | Certificate dashboard + eligibility |
| `screens/certificate_detail_screen.dart` | Franchise | View / print / share certificate |
| `screens/timelapse_screen.dart` | Time-Lapse | Photo gallery, time-lapse generator, videos |
| `screens/device_update_screen.dart` | Device/Update | Device status, update mgmt, history |
| `services/advisory_service.dart` | EU Core | Advisory + Climate API clients |
| `services/certification_service.dart` | Franchise | Certification API client |
| `services/timelapse_service.dart` | Time-Lapse | Time-lapse + CCTV API client |
| `widgets/risk_gauge_widget.dart` | EU Core | Circular risk indicator widget |
| `models/farm_identity.dart` | EU Core | Data models |

### Hardware (Raspberry Pi CM4) — `/hardware/` (7 files)

| File | Module | Feature |
|------|--------|---------|
| `src/capture_cycle.py` | Time-Lapse | Wake→capture→AI→upload→shutdown (24MP) |
| `src/sd_update.py` | Device/Update | SD2 auto-detect, verify, install, rollback |
| `src/usb_mount.sh` | CCTV | Auto-mount USB drive for CCTV recording |
| `src/weather_station.py` | EU Core | BME280 + rain gauge + UV sensor |
| `src/multispectral.py` | EU Core | NDVI calculation + zone analysis |
| `src/lorawan_satellite_drone.py` | EU Core | LoRaWAN, Copernicus API, drone import |
| `agrivision-capture.service` | Time-Lapse | Systemd boot service |

### Website + AI + Docs — 5 files

| File | Feature |
|------|---------|
| `website/components/advisory-chat.js` | Web chat widget |
| `website/components/franchise-registration.html` | Partner signup form |
| `ai/models/training_pipeline.py` | Disease detection model training |
| `docs/DEPENDENCIES.md` | npm + pip + Flutter packages |
| `docs/HARDWARE_BOM_v2.1.md` | Complete parts list, costs, power budget |

---

## HARDWARE SPECS (v2.1)

### Camera: Arducam 64MP Hawkeye (IMX682)
- 64MP native (9152×6944), runs in 24MP mode (6000×4000)
- 4K video @ 30fps, Autofocus, MIPI CSI-2
- ~7MB per JPEG at 24MP quality 90

### Power System: Internal Battery Hub
- ALL inputs → charge internal battery FIRST
- Internal battery is the ONLY source powering CM4
- Solar → MPPT → int battery (overflow → ext battery)
- DC 12V adapter → MPPT → int battery only
- Ext battery → MPPT → int battery (reserve)
- Power ON/OFF button (latching, LED ring)
- 12V DC barrel jack (5.5×2.1mm)
- LiFePO4 12V 6Ah, 100×70×50mm, 400g
- Runtime: ~7.9 days without solar (24MP mode)

### 16 Board Ports
CSI camera, Nano SIM, MicroSD×2, USB 2.0, I²C 12-pin, GPIO 12-pin, SPI 8-pin, Solar XT60, Ext Battery XT30, DC 12V barrel jack, 4G antenna SMA, LoRa antenna SMA, Power ON/OFF, Reset, Status LEDs×4

### Prototype Cost: ~$489 CAD per unit

---

## IMPLEMENTATION ORDER FOR DEVIN

### Step 1: Database migrations
```bash
psql -U agrivision -d agrivision -f backend/src/models/enhancement_migrations.sql
psql -U agrivision -d agrivision -f backend/src/models/franchise_cert_migrations.sql
psql -U agrivision -d agrivision -f backend/src/models/timelapse_migration.sql
psql -U agrivision -d agrivision -f backend/src/models/device_update_migration.sql
```

### Step 2: Backend routes — register in server.js
```javascript
app.use('/api/v1/farms', require('./routes/farmId'));
app.use('/api/v1/climate', require('./routes/climate'));
app.use('/api/v1/advisory', require('./routes/advisory'));
app.use('/api/v1/compliance', require('./routes/compliance'));
app.use('/api/v1/benchmark', require('./routes/benchmark'));
app.use('/api/v1/interop', require('./routes/interop'));
app.use('/api/v1/franchise', require('./routes/franchise'));
app.use('/api/v1/certification', require('./routes/certification'));
app.use('/api/v1/timelapse', require('./routes/timelapse'));
app.use('/api/v1/devices', require('./routes/devices'));
```

### Step 3: Mobile app — add screens to navigation
```dart
import 'screens/timelapse_screen.dart';
import 'screens/device_update_screen.dart';
```

### Step 4: Hardware deployment
```bash
sudo cp hardware/agrivision-capture.service /etc/systemd/system/
sudo systemctl enable agrivision-capture
sudo cp hardware/src/*.py /opt/agrivision/hardware/src/
sudo cp hardware/src/usb_mount.sh /usr/local/bin/ && sudo chmod +x /usr/local/bin/usb_mount.sh
```

---

## BOOT SEQUENCE

```
RTC alarm → power ON
  → systemd starts agrivision-capture.service
    → sd_update.py: check SD2 for update
      → found? verify → backup → install → reboot
      → not found? continue
    → capture_cycle.py: main cycle
      → read sensors (I²C bus)
      → capture 24MP photo (Arducam 64MP AF)
      → TFLite disease inference
      → cache + upload photos
      → check USB → CCTV save if present
      → heartbeat to API
      → set RTC alarm +20min
      → shutdown
  → RTC standby (0.02W)
```

---

## API ENDPOINTS (30 total)

### EU Core: /api/v1/farms, /climate, /advisory, /compliance, /benchmark, /interop
### Franchise: /api/v1/franchise, /certification
### Time-Lapse: /api/v1/timelapse/:farmId/photos, /generate, /videos, /cctv
### Device: /api/v1/devices/:farmId/status, /heartbeat, /update/check, /update/ota, /update/history

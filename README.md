# 🌱 AgriVision v3.0 — Complete Deployment Package

**122 files | 7 modules | Ready to deploy**

© 2026 Performance Cristal Technologies Avancées S.A.

---

## 🚀 Deployment Order

### 1. Backend API → Railway
```bash
cd backend-railway/
git init && git add . && git commit -m "v3.0"
# Connect Railway → Add PostgreSQL → Deploy
# Set env vars: DATABASE_URL, STRIPE_SECRET_KEY, JWT_SECRET
# Custom domain: api.theagrivision.com
```

### 2. Website → Netlify
```bash
cd website-netlify/
npm install
netlify login && netlify init && netlify deploy --prod
# Set env vars: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STRIPE_KEY, NEXT_PUBLIC_GOOGLE_MAPS_KEY
# Custom domain: theagrivision.com
```

### 3. Pi Hub → Raspberry Pi
```bash
cd firmware/hub/
sudo bash setup.sh
# Copy all files to /home/agrivision/
# sudo systemctl start agrivision-hub
```

### 4. ESP32 Cameras → Flash
```bash
cd firmware/esp32-cam/
# Open in PlatformIO → Flash via USB
# Or use: cd ../tools/ && python provision.py --batch 10
```

---

## 📁 Structure

```
agrivision-final-master/
│
├── website-netlify/              ← DEPLOY TO NETLIFY (31 files)
│   ├── app/                       # Next.js pages (landing, auth, dashboard, admin, checkout)
│   ├── components/                # React UI (FarmerDashboard, AdminPanel, Maps, Stripe, Onboarding)
│   ├── lib/                       # API client + Zustand store
│   ├── netlify.toml               # Build + redirect config
│   └── README.md                  # Detailed Netlify instructions
│
├── backend-railway/              ← DEPLOY TO RAILWAY (24 files)
│   ├── main.py                    # FastAPI entry
│   ├── api/                       # 40+ endpoints (auth, farms, crops, orders, hub, admin)
│   ├── models/                    # 12 SQLAlchemy tables + Pydantic schemas
│   ├── Dockerfile                 # Railway deployment
│   └── railway.toml
│
├── firmware/                     ← FLASH TO DEVICES
│   ├── esp32-cam/                 # Camera node Arduino firmware
│   │   ├── esp32_cam_node.ino     # Deep sleep, OV5640, battery monitoring
│   │   └── platformio.ini
│   └── hub/                       # Pi Central Hub (Python asyncio)
│       ├── main.py                # 7 concurrent services
│       ├── setup.sh               # Pi bootstrap script
│       └── services/              # AI, sensors, WiFi AP, cloud sync, fleet mgmt
│
├── tools/
│   └── provision.py               # ESP32 factory provisioning (serial, QR labels)
│
├── backend-extras/
│   └── email_templates.py         # 6 HTML email templates
│
├── devin-modules/                ← ADDITIONAL FEATURES (Node.js + Flutter)
│   ├── backend/src/
│   │   ├── routes/                # certification, franchise, timelapse, climate, advisory, compliance, devices
│   │   ├── services/              # certificationService, advisoryService, anomalyService, climatePdf
│   │   ├── middleware/            # dataConsent.js
│   │   └── models/                # SQL migrations (enhancements, franchise, timelapse, device_update)
│   ├── mobile/lib/                # Flutter screens (certification, timelapse, advisory, digital twin, risk, compliance, device update)
│   ├── website/components/        # franchise-registration.html, advisory-chat.js
│   ├── hardware/src/              # multispectral.py, weather_station.py, lorawan_satellite_drone.py, capture_cycle.py, sd_update.py
│   ├── ai/models/                 # training_pipeline.py
│   └── docs/                      # Integration guides, BOM, dependencies
│
└── hardware-designs/             ← MOTHERBOARD VISUALIZATIONS
    ├── motherboard-v2.html        # Board layout v2
    └── motherboard-v2.1.html      # Board layout v2.1 (updated)
```

## Tech Stack

| Layer | Claude (Python/React) | Devin (Node.js/Flutter) |
|-------|----------------------|------------------------|
| Frontend | Next.js + React (Netlify) | Flutter mobile app |
| Backend | FastAPI + PostgreSQL (Railway) | Express.js routes |
| IoT | ESP32 Arduino + Pi Python | LoRaWAN + Multispectral |
| AI | TFLite on Pi | Training pipeline |
| Payments | Stripe Elements | — |
| Maps | Google Maps Drawing | — |

**No conflicts between Claude and Devin code** — fully complementary.

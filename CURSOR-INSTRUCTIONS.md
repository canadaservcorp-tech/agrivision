# AGRIVISION — CURSOR DEPLOYMENT INSTRUCTIONS

## CRITICAL: READ THIS FIRST

This project has 3 phases. Deploy them IN ORDER. Do NOT change the content, do NOT replace sections with placeholder text. Deploy the ACTUAL code provided.

**Domain:** theagrivision.com
**Netlify site:** grand-cobbler-c22278.netlify.app
**Backend target:** Railway
**Contact:** info@theagrivision.com → forwards to canada.servcorp@gmail.com
**Phone:** not shown publicly (owner request)
**PayPal:** canada.servcorp@gmail.com

---

## PHASE 1: WEBSITE (Deploy to Netlify)

### What to deploy

All files in `/website/` folder:

```
website/
├── index.html          ← Main page (ALL sections: hero, features, diseases, languages, how, pricing, b2b, contact)
├── _redirects           ← Netlify routing config
├── css/
│   └── main.css         ← Full stylesheet
└── js/
    ├── i18n.js          ← 4-language translation system (EN/FR/AR/TR)
    ├── diseases.js      ← Disease library (47 entries, search/filter)
    ├── firebase-config.js ← Firebase init (REPLACE placeholders with actual config)
    ├── auth.js          ← Login/signup with role selection (Farmer/Student/Company)
    ├── paypal.js        ← PayPal subscription buttons
    ├── ad-loader.js     ← Ad zones (hidden by default, 3s timeout)
    └── main.js          ← Nav, animations, form handling
```

### Deployment steps

1. **Copy entire `/website/` folder contents** to your Netlify deploy directory
2. **Update `firebase-config.js`** — replace `YOUR_API_KEY`, `YOUR_PROJECT`, etc. with actual Firebase config from console.firebase.google.com (project: agrivision)
3. **Update `paypal.js`** — replace `P-STARTER_PLAN_ID` and `P-PROFESSIONAL_PLAN_ID` with actual PayPal subscription plan IDs
4. **Update `index.html` line 11** — replace `YOUR_PAYPAL_CLIENT_ID` with actual PayPal client ID
5. **Update `_redirects`** — replace `YOUR-BACKEND.up.railway.app` with actual Railway URL (after Phase 2 deploy)
6. Deploy to Netlify via drag-and-drop or CLI

### DO NOT

- ❌ Do NOT replace index.html with a placeholder page
- ❌ Do NOT remove any sections (features, diseases, languages, pricing, b2b, contact must ALL be present)
- ❌ Do NOT add a phone number or WhatsApp; do NOT change the email (info@theagrivision.com)
- ❌ Do NOT remove team members (Hicham, Dr. Yousif Shihab, Cynthia Zein Eddine)

### Verify after deploy

- [ ] theagrivision.com loads with hero section showing "348+" stats
- [ ] Scrolling shows all 9 feature cards
- [ ] Disease Library section shows 47 entries with search/filter working
- [ ] Language switcher (EN/FR/AR/TR) changes all text on page
- [ ] Arabic mode switches to RTL layout
- [ ] Pricing section shows 3 plans ($29, $79, Custom)
- [ ] B2B section shows company plans ($299, $799, Custom)
- [ ] Contact section shows form + team names
- [ ] Mobile responsive works (hamburger menu, stacked cards)

---

## PHASE 2: BACKEND API (Deploy to Railway)

### What to deploy

All files in `/backend/` folder:

```
backend/
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── src/
    ├── server.js           ← Express + Socket.IO entry point
    ├── models/
    │   └── database.js     ← PostgreSQL init (11 tables, auto-migrate)
    ├── middleware/
    │   └── auth.js         ← JWT authentication
    └── routes/
        ├── auth.js         ← POST /register, /login
        ├── devices.js      ← Device CRUD + heartbeat
        ├── readings.js     ← Sensor data ingestion + WebSocket emit + auto-alerts
        ├── alerts.js       ← GET alerts, PATCH mark read
        ├── companies.js    ← Company registration + subscription
        ├── farmers.js      ← Farmer directory (for B2B)
        ├── chat.js         ← Messaging between companies and farmers
        ├── news.js         ← Blog/news CRUD
        └── ads.js          ← Ad serving, impression/click tracking
```

### Deployment steps

1. Create new Railway project
2. Add PostgreSQL plugin (Railway auto-provisions)
3. Set environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=<generate-a-strong-random-string>
   DATABASE_URL=<auto-set-by-railway-postgres-plugin>
   ```
4. Deploy `/backend/` folder
5. Railway will auto-detect Dockerfile and build
6. Note the Railway URL (e.g., `agrivision-backend-production.up.railway.app`)
7. **Go back to Phase 1** and update `_redirects` with this URL

### API endpoints created

```
POST   /api/v1/auth/register      — Create account (name, email, password, role)
POST   /api/v1/auth/login         — Login, returns JWT
POST   /api/v1/devices/register   — Register new Pi CM4 device
GET    /api/v1/devices             — List user's devices
POST   /api/v1/devices/:id/heartbeat — Device status update
POST   /api/v1/readings           — Ingest sensor data (auto-creates alerts)
GET    /api/v1/readings/device/:id — Get readings history
GET    /api/v1/alerts              — Get user alerts
PATCH  /api/v1/alerts/:id/read    — Mark alert as read
POST   /api/v1/companies          — Register company
GET    /api/v1/companies/my       — Get own company
POST   /api/v1/companies/:id/subscribe — Company subscription
GET    /api/v1/farmers             — List farmers (for companies)
POST   /api/v1/chat               — Send message
GET    /api/v1/chat/with/:userId  — Get conversation
GET    /api/v1/news               — List published news
POST   /api/v1/news               — Create article
GET    /api/v1/ads/serve/:slot    — Get ad for slot
POST   /api/v1/ads/:id/impression — Track impression
POST   /api/v1/ads/:id/click      — Track click
POST   /api/v1/ads                — Create ad
GET    /api/v1/health             — Health check
```

### Verify after deploy

- [ ] `https://YOUR-URL.railway.app/api/v1/health` returns `{"status":"ok"}`
- [ ] POST to `/api/v1/auth/register` creates user
- [ ] POST to `/api/v1/auth/login` returns JWT token
- [ ] Database tables auto-created (check Railway logs)

---

## PHASE 3: MOBILE APP + AI + HARDWARE

### 3A: Mobile App (Flutter)

All files in `/mobile/` folder:

```
mobile/
├── pubspec.yaml
└── lib/
    ├── main.dart                    ← App entry, routes, theme
    ├── services/
    │   └── api_service.dart         ← HTTP client with JWT auth
    ├── providers/
    │   ├── auth_provider.dart       ← Login/register state
    │   └── device_provider.dart     ← Device list state
    └── screens/
        ├── login_screen.dart        ← Login UI
        ├── register_screen.dart     ← Register UI with role selection
        ├── dashboard_screen.dart    ← Device list + status
        └── alerts_screen.dart       ← Alert feed with severity colors
```

**Before building:**
1. Update `api_service.dart` — replace `YOUR-BACKEND.up.railway.app` with actual Railway URL
2. Run `flutter pub get`
3. Build: `flutter build apk` (Android) / `flutter build ios` (iOS)

### 3B: AI Training Pipeline

```
ai-training/
└── scripts/
    └── train_model.py    ← MobileNetV2 transfer learning → TFLite export
```

**To train:**
```bash
pip install tensorflow pillow numpy
# Download PlantVillage dataset from Kaggle
python train_model.py --data_dir ./data/PlantVillage --epochs 25
# Output: models/disease_model.tflite + models/labels.json
```

### 3C: Hardware (Raspberry Pi CM4)

```
hardware/
├── setup.sh              ← One-command Pi setup (apt, pip, systemd)
└── src/
    ├── main.py           ← Async run loop orchestrator
    ├── camera.py         ← Pi Camera 3 (picamera2, autofocus, 12MP)
    ├── sensors.py        ← DHT22 + soil moisture via ADS1115
    ├── disease_detector.py ← TFLite inference (20 labels, top-3)
    ├── uploader.py       ← HTTP upload to backend via 4G
    ├── cache_manager.py  ← SQLite offline cache
    ├── health_monitor.py ← CPU temp, memory, disk
    └── config.py         ← All settings (env vars + JSON override)
```

**To deploy on Pi CM4:**
```bash
sudo bash setup.sh
# Edit /etc/systemd/system/agrivision.service:
#   Set AGRIVISION_DEVICE_UUID=your-device-id
#   Set AGRIVISION_API_URL=https://your-railway-url.app/api/v1
# Copy trained model:
cp models/disease_model.tflite /opt/agrivision/models/
sudo systemctl start agrivision
```

---

## FILE INVENTORY (71 files total)

### Phase 1 — Website (9 files)
1. website/index.html
2. website/_redirects
3. website/css/main.css
4. website/js/i18n.js
5. website/js/diseases.js
6. website/js/firebase-config.js
7. website/js/auth.js
8. website/js/paypal.js
9. website/js/ad-loader.js
10. website/js/main.js

### Phase 2 — Backend API (12 files)
11. backend/package.json
12. backend/Dockerfile
13. backend/docker-compose.yml
14. backend/.env.example
15. backend/src/server.js
16. backend/src/models/database.js
17. backend/src/middleware/auth.js
18. backend/src/routes/auth.js
19. backend/src/routes/devices.js
20. backend/src/routes/readings.js
21. backend/src/routes/alerts.js
22. backend/src/routes/companies.js
23. backend/src/routes/farmers.js
24. backend/src/routes/chat.js
25. backend/src/routes/news.js
26. backend/src/routes/ads.js

### Phase 3A — Mobile App (8 files)
27. mobile/pubspec.yaml
28. mobile/lib/main.dart
29. mobile/lib/services/api_service.dart
30. mobile/lib/providers/auth_provider.dart
31. mobile/lib/providers/device_provider.dart
32. mobile/lib/screens/login_screen.dart
33. mobile/lib/screens/register_screen.dart
34. mobile/lib/screens/dashboard_screen.dart
35. mobile/lib/screens/alerts_screen.dart

### Phase 3B — AI Training (1 file)
36. ai-training/scripts/train_model.py

### Phase 3C — Hardware (8 files)
37. hardware/setup.sh
38. hardware/src/main.py
39. hardware/src/camera.py
40. hardware/src/sensors.py
41. hardware/src/disease_detector.py
42. hardware/src/uploader.py
43. hardware/src/cache_manager.py
44. hardware/src/health_monitor.py
45. hardware/src/config.py

---

## PLACEHOLDERS TO REPLACE BEFORE DEPLOY

| File | Placeholder | Replace with |
|------|------------|-------------|
| website/js/firebase-config.js | YOUR_API_KEY, YOUR_PROJECT, etc. | Firebase console config |
| website/index.html line 11 | YOUR_PAYPAL_CLIENT_ID | PayPal developer dashboard |
| website/js/paypal.js | P-STARTER_PLAN_ID, P-PROFESSIONAL_PLAN_ID | PayPal subscription plan IDs |
| website/_redirects | YOUR-BACKEND.up.railway.app | Railway deploy URL |
| mobile/lib/services/api_service.dart | YOUR-BACKEND.up.railway.app | Railway deploy URL |
| hardware/src/config.py | YOUR-BACKEND.up.railway.app | Railway deploy URL |
| backend .env | JWT_SECRET | Generate strong random string |

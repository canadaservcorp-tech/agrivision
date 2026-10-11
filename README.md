# 🌱 Agrivision - AI Agricultural Monitoring System

IoT crop monitoring with AI disease detection, real-time sensor data, and mobile alerts.

## Architecture

```
┌──────────────┐         ┌──────────────┐        ┌──────────────┐
│  Pi CM4      │  4G LTE │  VPS Server  │ HTTPS  │  Mobile App  │
│  /hardware   │────────▶│  /backend    │◀───────│  /mobile     │
│              │         │  /website    │  WS    │              │
│ Camera 12MP  │         │  Nginx+SSL   │        │ iOS/Android  │
│ DHT22+Soil   │         │  PostgreSQL  │        │ Flutter      │
│ TFLite AI    │         │  Redis+S3    │        │ FR/EN        │
│ Offline Cache│         │  Firebase    │        │ Push Alerts  │
└──────────────┘         └──────────────┘        └──────────────┘
```

## Repository Structure

```
agrivision/
├── hardware/          # Raspberry Pi CM4 Python software
│   ├── src/           # Camera, sensors, AI, uploader, cache
│   ├── setup.sh       # One-command Pi setup
│   ├── agrivision.service  # Systemd auto-start
│   └── requirements.txt
├── backend/           # Node.js REST API + WebSocket
│   ├── src/           # Express routes, PostgreSQL, Redis
│   ├── Dockerfile
│   └── package.json
├── mobile/            # Flutter iOS + Android app
│   ├── lib/           # Screens, services, widgets, l10n
│   └── pubspec.yaml
├── website/           # Landing page + Web dashboard
│   ├── index.html     # Bilingual landing (agrivision.ca)
│   └── dashboard.html # Web monitoring dashboard
├── ai/                # Disease detection model training
│   ├── training/      # MobileNetV2 → TFLite pipeline
│   └── models/        # Exported .tflite + labels
├── nginx/             # Production reverse proxy config
├── docs/              # API docs + Deployment guide
├── .github/workflows/ # CI/CD (test, build, deploy)
├── docker-compose.yml # Backend + PostgreSQL + Redis
└── .gitignore
```

## Quick Start

### Backend
```bash
cd backend && cp .env.example .env && npm install && npm run dev
```

### Hardware (Raspberry Pi CM4)
```bash
cd hardware && chmod +x setup.sh && sudo ./setup.sh
```

### Mobile App
```bash
cd mobile && flutter pub get && flutter run
```

### AI Model Training
```bash
cd ai && pip install -r requirements.txt
./training/download_dataset.sh
python training/train_model.py
```

## Documentation
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [AI Training](ai/README.md)

## Tech Stack
| Module | Stack |
|--------|-------|
| Hardware | Python, picamera2, TFLite, asyncio, systemd |
| Backend | Node.js, Express, PostgreSQL, Redis, Socket.IO, S3 |
| Mobile | Flutter, Provider, fl_chart, Firebase Messaging |
| Website | HTML/CSS/JS, Chart.js, bilingual FR/EN |
| AI | TensorFlow, MobileNetV2, TFLite, PlantVillage dataset |
| DevOps | Docker, Nginx, Let's Encrypt, GitHub Actions, PM2 |

## License
Proprietary - Performance Cristal Technologies Avancées S.A.
© 2026 Agrivision | NEQ 2280629637

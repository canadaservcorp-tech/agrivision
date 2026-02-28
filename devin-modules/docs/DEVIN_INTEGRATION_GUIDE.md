# Agrivision EU Workshop Enhancement — Devin Integration Guide

## Overview
These files add **EU AI Workshop-derived features** to the existing Agrivision codebase.
Repository: `https://github.com/canadaservcorp-tech/agrivision`

## Existing Architecture
```
agrivision/
├── hardware/        # Raspberry Pi CM4 (Python)
├── backend/         # Node.js + Express + PostgreSQL + Redis
├── mobile/          # Flutter (iOS/Android)
├── website/         # Landing page + Dashboard
└── ai/              # TFLite training pipeline
```

## New Files to Add (this package)

### Backend (`/backend/src/`)
| File | Purpose | Integrates With |
|------|---------|-----------------|
| `routes/farmId.js` | Digital Farm ID CRUD endpoints | `server.js` router |
| `routes/climate.js` | Climate risk forecasting API | `server.js` router |
| `routes/advisory.js` | GenAI advisory chatbot API | `server.js` router |
| `routes/compliance.js` | Carbon footprint & compliance reports | `server.js` router |
| `routes/benchmark.js` | Cross-farm benchmarking API | `server.js` router |
| `routes/interop.js` | CEADS-compatible data exchange | `server.js` router |
| `services/climateService.js` | LSTM prediction logic | `routes/climate.js` |
| `services/advisoryService.js` | RAG chatbot with Claude/GPT | `routes/advisory.js` |
| `services/anomalyService.js` | Isolation Forest detection | `routes/climate.js` |
| `services/syntheticDataService.js` | GenAI data augmentation | standalone |
| `models/enhancement_migrations.sql` | 6 new DB tables | run via `psql` |
| `middleware/dataConsent.js` | Data sovereignty checks | all routes |

### Mobile (`/mobile/lib/`)
| File | Purpose | Integrates With |
|------|---------|-----------------|
| `screens/advisory_chat_screen.dart` | GenAI chat UI | `main.dart` navigation |
| `screens/digital_twin_screen.dart` | 2D farm map with overlays | `main.dart` navigation |
| `screens/risk_dashboard_screen.dart` | Climate risk scores | `main.dart` navigation |
| `screens/compliance_screen.dart` | Report generation UI | `main.dart` navigation |
| `screens/benchmark_screen.dart` | Farm comparison view | `main.dart` navigation |
| `services/advisory_service.dart` | API client for chatbot | advisory screen |
| `services/climate_service.dart` | API client for risk data | risk dashboard |
| `widgets/risk_gauge_widget.dart` | Circular risk indicator | risk dashboard |
| `widgets/farm_map_widget.dart` | Interactive field map | digital twin |
| `models/climate_forecast.dart` | Climate data model | services |
| `models/farm_identity.dart` | Digital Farm ID model | services |

### Hardware (`/hardware/src/`)
| File | Purpose | Integrates With |
|------|---------|-----------------|
| `weather_station.py` | BME280 + rain + UV sensor reading | `main.py` scheduler |
| `multispectral.py` | NDVI calculation from camera | `camera.py` |
| `lorawan_gateway.py` | LoRaWAN fallback connectivity | `uploader.py` |
| `sensor_hub.py` | Universal third-party sensor adapter | `main.py` |
| `satellite_data.py` | Copernicus API data fetcher | `main.py` scheduler |
| `drone_ingestion.py` | Import drone survey imagery | standalone |

### Website (`/website/components/`)
| File | Purpose | Integrates With |
|------|---------|-----------------|
| `advisory-chat.js` | Embeddable GenAI chatbot widget | `index.html` |
| `carbon-calculator.js` | Carbon footprint estimation tool | `dashboard.html` |

### AI (`/ai/models/`)
| File | Purpose |
|------|---------|
| `lstm_climate.py` | LSTM model training for climate forecasting |
| `isolation_forest.py` | Anomaly detection model |
| `ensemble_predictor.py` | Combined yield/market prediction |

## Integration Steps for Devin

### Step 1: Database Migration
```bash
cd backend
psql $DATABASE_URL < src/models/enhancement_migrations.sql
```

### Step 2: Install New Dependencies
```bash
# Backend
cd backend
npm install @anthropic-ai/sdk openai axios node-cron

# Mobile
cd mobile
flutter pub add http flutter_map latlong2 fl_chart

# Hardware
cd hardware
pip install bme280 paho-mqtt requests scikit-learn
```

### Step 3: Register Routes in server.js
Add to existing `backend/src/server.js`:
```javascript
const farmIdRoutes = require('./routes/farmId');
const climateRoutes = require('./routes/climate');
const advisoryRoutes = require('./routes/advisory');
const complianceRoutes = require('./routes/compliance');
const benchmarkRoutes = require('./routes/benchmark');
const interopRoutes = require('./routes/interop');

app.use('/api/v1/farm-id', farmIdRoutes);
app.use('/api/v1/climate', climateRoutes);
app.use('/api/v1/advisory', advisoryRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/benchmark', benchmarkRoutes);
app.use('/api/v1/interop', interopRoutes);
```

### Step 4: Add Mobile Screens to Navigation
Add to `mobile/lib/main.dart` routes.

### Step 5: Add Hardware Modules to Pi Scheduler
Import new modules in `hardware/src/main.py`.

### Step 6: Environment Variables
Add to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
COPERNICUS_API_KEY=...
LORAWAN_APP_EUI=...
LORAWAN_APP_KEY=...
```

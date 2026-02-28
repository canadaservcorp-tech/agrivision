# 🌱 AgriVision Backend API v3.0

AI-Powered Agricultural Monitoring Platform — Backend Server

## Architecture

```
[Camera Nodes ESP32] → WiFi → [Central Hub Pi] → MQTT/HTTP → [This API] → [PostgreSQL]
                                                                  ↓
                                                    [Website + PWA + Admin]
```

## Tech Stack

- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL on Railway
- **ORM:** SQLAlchemy (async)
- **Auth:** JWT (python-jose + bcrypt)
- **Payments:** Stripe
- **IoT:** MQTT (HiveMQ)
- **Storage:** S3-compatible (images)
- **Deployment:** Railway (Docker)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /signup` — Create farmer account
- `POST /login` — Login, get JWT token
- `GET /me` — Current user profile
- `POST /forgot-password` — Reset password
- `POST /verify/{token}` — Email verification

### Farms (`/api/farms`)
- `POST /` — Create farm
- `GET /` — List my farms
- `GET /{id}` — Farm details + crops
- `PUT /{id}` — Update farm
- `DELETE /{id}` — Deactivate farm

### Crops (`/api/crops`)
- `POST /` — Add crop to farm
- `GET /farm/{farm_id}` — List crops
- `PUT /{id}` — Update crop
- `DELETE /{id}` — Remove crop
- `GET /database` — All available crops

### System Configurator (`/api/configurator`)
- `POST /calculate` — Auto-calculate cameras, hubs, pricing
- `GET /pricing` — Current component pricing
- `GET /coverage-specs` — Camera specs per terrain

### Orders (`/api/orders`)
- `POST /` — Create order
- `GET /` — List my orders
- `GET /{id}` — Order details
- `POST /{id}/payment-intent` — Stripe payment
- `POST /{id}/confirm` — Confirm payment

### Dashboard (`/api/dashboard`)
- `GET /overview` — Full dashboard data
- `GET /detections` — Disease detections (filtered)
- `GET /sensors/{farm_id}` — Sensor history
- `GET /notifications` — Alerts & notifications

### Hub Communication (`/api/hub`)
- `POST /heartbeat` — Hub status update (every 5min)
- `POST /sensors` — Sensor readings (every 15min)
- `POST /detection` — Disease detection result
- `POST /image` — Camera image upload
- `GET /config/{serial}` — Hub boot configuration

### Admin (`/api/admin`)
- `GET /overview` — Master dashboard
- `GET /farmers` — All farmers (paginated)
- `GET /crop-map` — Geographic crop data
- `GET /market-intelligence` — B2B data reports
- `PUT /orders/{id}/status` — Update order status

## Deployment to Railway

1. Push to GitHub
2. Connect repo to Railway
3. Add PostgreSQL service
4. Set environment variables (see `.env.example`)
5. Deploy — Railway auto-builds from Dockerfile

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment
cp .env.example .env
# Edit .env with your values

# Run
uvicorn main:app --reload --port 8000

# API docs at http://localhost:8000/api/docs
```

## Database Tables

- `users` — Farmers, companies, admins
- `farms` — Farm locations, dimensions, details
- `crops` — Crop types per farm
- `agrivision_systems` — Deployed hub units
- `camera_nodes` — Individual camera nodes
- `disease_detections` — AI detection results
- `sensor_readings` — Environmental data
- `orders` — Purchase orders
- `notifications` — User alerts
- `companies` — B2B partners
- `regional_crop_data` — Aggregated market intelligence

## Contact

info@theagrivision.com | theagrivision.com
© 2026 Performance Cristal Technologies Avancées S.A.

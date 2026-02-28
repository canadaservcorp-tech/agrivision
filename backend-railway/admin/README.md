# 🌱 AgriVision Admin Dashboard — Full Business Management

## Complete admin panel with 12 management modules, 60+ API endpoints, PayPal integration, and full data export.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  React Frontend (admin-dashboard.jsx)           │
│  12 sections, responsive, dark theme            │
├─────────────────────────────────────────────────┤
│  FastAPI Backend (main.py)                      │
│  60+ REST endpoints, PayPal, PDF generation     │
├─────────────────────────────────────────────────┤
│  PostgreSQL Database (models.py)                │
│  14 tables, indexed, audit trail                │
└─────────────────────────────────────────────────┘
```

---

## 12 Management Modules

| Module | Features |
|--------|----------|
| **📊 Overview** | KPI cards, revenue chart, country distribution, active metrics |
| **👥 Users** | CRUD, search, filter by role/status/country, export, password reset |
| **🤝 Dealers** | Dealer management, farmer assignment, commission tracking |
| **💰 Payments** | All transactions, refunds, PayPal/Stripe/bank, daily revenue |
| **📋 Subscriptions** | Plan management (Trial/Basic/Pro/Enterprise), upgrade/cancel |
| **📄 Invoices** | Create/send/track, PDF generation, line items, tax calculation |
| **🔬 Detections** | AI results, filter by disease/severity, confidence scores |
| **📚 Library** | Documents, news, ads, guides, firmware — publish/feature/track |
| **🧬 Diseases** | Disease database with symptoms, treatment, affected crops |
| **🔍 Search** | Multi-field: country, farmer name, farm name, disease name |
| **📊 Reports** | CSV/JSON/PDF export for all data sections, printable |
| **⚙️ Settings** | PayPal config, email, WhatsApp, system preferences |

---

## Database Schema (14 tables)

| Table | Records | Purpose |
|-------|---------|---------|
| users | farmers, dealers, managers, admins | |
| farms | farm profiles with GPS, crops, cameras | |
| detections | AI disease detection results | |
| sensor_readings | temperature, humidity, soil data | |
| subscriptions | plan, billing, PayPal sub ID | |
| payments | all financial transactions | |
| invoices | generated invoices with line items | |
| library_items | docs, news, ads, guides | |
| diseases | disease reference library | |
| dealer_commissions | dealer earnings tracking | |
| audit_logs | all actions tracked | |
| notifications | user notifications | |

---

## API Endpoints (60+)

### Auth
- `POST /api/auth/login`

### Users (8)
- `GET /api/users` — list with filters
- `POST /api/users` — create
- `GET /api/users/{id}` — detail + farms + payments
- `PUT /api/users/{id}` — update
- `DELETE /api/users/{id}` — deactivate
- `POST /api/users/{id}/reset-password`

### Dealers (4)
- `GET /api/dealers` — with revenue + commission stats
- `GET /api/dealers/{id}/farmers`
- `GET /api/dealers/{id}/commissions`
- `POST /api/dealers/{id}/assign-farmer/{fid}`

### Farms (3)
- `GET /api/farms` — with search + country filter
- `POST /api/farms`
- `GET /api/farms/{id}` — with detections

### Detections (3)
- `GET /api/detections` — with filters
- `GET /api/detections/stats` — aggregated analytics

### Payments (5)
- `GET /api/payments` — with filters
- `POST /api/payments`
- `POST /api/payments/{id}/refund`
- `GET /api/payments/stats`

### PayPal (3)
- `POST /api/paypal/create-order`
- `POST /api/paypal/capture-order/{id}`
- `POST /api/paypal/create-subscription`

### Invoices (5)
- `GET /api/invoices`
- `POST /api/invoices`
- `PUT /api/invoices/{id}/send`
- `PUT /api/invoices/{id}/mark-paid`
- `GET /api/invoices/{id}/pdf` — generates PDF

### Subscriptions (4)
- `GET /api/subscriptions`
- `POST /api/subscriptions`
- `PUT /api/subscriptions/{id}`
- `GET /api/subscriptions/stats`

### Library (5)
- `GET /api/library` — with type/search filters
- `POST /api/library`
- `PUT /api/library/{id}`
- `DELETE /api/library/{id}`
- `PUT /api/library/{id}/publish`

### Search (1)
- `GET /api/search` — multi-field global search

### Analytics (4)
- `GET /api/analytics/overview`
- `GET /api/analytics/revenue-chart`
- `GET /api/analytics/user-growth`
- `GET /api/analytics/country-distribution`

### Export (5)
- `GET /api/export/users?format=csv`
- `GET /api/export/payments?format=csv`
- `GET /api/export/detections?format=csv`
- `GET /api/export/invoices?format=csv`
- `GET /api/export/farms?format=csv`

### Other (3)
- `GET /api/audit-log`
- `GET /api/notifications`
- `POST /api/seed` — populate demo data

---

## Deployment

### Local Development
```bash
cd backend
pip install -r requirements.txt
python main.py
# → http://localhost:8000/docs
# → POST /api/seed to populate demo data
```

### Railway (Production)
```bash
# Push to GitHub → connect Railway
# Set environment variables from .env.example
# Railway auto-deploys from Dockerfile
```

### Frontend
The React dashboard (admin-dashboard.jsx) renders as an artifact in Claude or can be deployed as a standalone React app:

```bash
# Add to existing Next.js project
cp admin-dashboard.jsx src/app/admin/page.jsx
```

---

## PayPal Integration

### Setup
1. Create PayPal Developer account
2. Create REST API app (sandbox first)
3. Get Client ID + Secret
4. Set environment variables
5. Create subscription plans in PayPal dashboard

### Flow
```
Farmer clicks "Subscribe"
  → Frontend calls POST /api/paypal/create-order
  → Backend creates PayPal order + pending Payment record
  → Farmer approves on PayPal
  → Frontend calls POST /api/paypal/capture-order/{id}
  → Backend captures payment + updates status to "completed"
  → Subscription activated
```

---

## Search Capabilities

Search across all data by:
- **Country** — find all users/farms in UAE, Saudi Arabia, etc.
- **Farmer Name** — search by first or last name
- **Farm Name** — search farm profiles
- **Disease Name** — find detection results by disease
- **General Query** — searches across all fields
- **Date Range** — filter detections by date

---

## Export Formats

| Format | Available For |
|--------|--------------|
| **CSV** | Users, Payments, Invoices, Detections, Farms |
| **JSON** | All data via API |
| **PDF** | Invoices (auto-generated with ReportLab) |
| **Print** | Any report via browser print |

---

## © 2026 Performance Cristal Technologies Avancées S.A.

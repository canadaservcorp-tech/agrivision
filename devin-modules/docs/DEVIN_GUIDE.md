# Agrivision — Franchise Partner & Green Certification Modules
## Devin Integration Guide

## Overview
Two new feature modules:
1. **Franchise Partner Registration** — Online portal for partners to apply
2. **Green Farmer Certification** — Disease-free farm licenses issued via mobile app

## New Files

### Backend (`/backend/src/`)
| File | Purpose |
|------|---------|
| `routes/franchise.js` | Partner registration, listing, approval endpoints |
| `routes/certification.js` | Green certificate CRUD, criteria check, PDF generation |
| `services/certificationService.js` | Criteria matching engine + certificate scoring |
| `services/certificatePdfService.js` | PDF certificate generation with QR verification |
| `models/franchise_cert_migrations.sql` | 3 new DB tables |

### Mobile (`/mobile/lib/`)
| File | Purpose |
|------|---------|
| `screens/certification_screen.dart` | Certificate dashboard + eligibility checker |
| `screens/certificate_detail_screen.dart` | View/print/share certificate |
| `services/certification_service.dart` | API client for certification |
| `models/certificate.dart` | Certificate & franchise data models |
| `widgets/certificate_card_widget.dart` | Certificate preview card |

### Website (`/website/components/`)
| File | Purpose |
|------|---------|
| `franchise-registration.html` | Full franchise partner application page |

## Integration Steps

### Step 1: Database
```bash
psql $DATABASE_URL < backend/src/models/franchise_cert_migrations.sql
```

### Step 2: Register Routes (add to server.js)
```javascript
const franchiseRoutes = require('./routes/franchise');
const certificationRoutes = require('./routes/certification');
app.use('/api/v1/franchise', franchiseRoutes);
app.use('/api/v1/certification', certificationRoutes);
```

### Step 3: Install Dependencies
```bash
cd backend && npm install pdfkit qrcode
cd mobile && flutter pub add share_plus printing url_launcher
```

### Step 4: Add to Mobile Navigation
Add certification tab to main dashboard and franchise link to settings.

### Step 5: Add Franchise Page to Website
Link from main nav: `<a href="franchise.html">Become a Partner</a>`

### Step 6: Environment Variables
```
CERT_SIGNING_SECRET=your-secret-for-qr-verification
FRANCHISE_NOTIFICATION_EMAIL=partnerships@agrivision.ca
```

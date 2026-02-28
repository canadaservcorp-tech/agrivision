# 🌱 AgriVision — Netlify Deployment

## Quick Deploy

### Option 1: Netlify CLI
```bash
# Install Netlify CLI
npm i -g netlify-cli

# From this directory:
npm install
netlify login
netlify init
netlify deploy --prod
```

### Option 2: Git-based Deploy
```bash
# Push to GitHub/GitLab
git init
git add .
git commit -m "AgriVision v3.0"
git remote add origin https://github.com/YOUR_REPO.git
git push -u origin main

# Then in Netlify Dashboard:
# 1. "Add new site" → "Import an existing project"
# 2. Connect GitHub repo
# 3. Build settings auto-detected from netlify.toml
# 4. Deploy
```

## Environment Variables (Set in Netlify Dashboard)

| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_API_URL` | `https://api.theagrivision.com` | ✅ |
| `NEXT_PUBLIC_STRIPE_KEY` | `pk_test_xxxx` or `pk_live_xxxx` | ✅ |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | `AIzaSyxxxx` | ✅ |
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXX` | Optional |

**Set at:** Netlify Dashboard → Site Settings → Environment Variables

## Custom Domain (theagrivision.com)

1. Netlify Dashboard → Domain Management → Add custom domain
2. Enter: `theagrivision.com`
3. Add DNS records at your registrar:
   - `A` record → `75.2.60.5` (Netlify load balancer)
   - `CNAME` for `www` → `YOUR_SITE.netlify.app`
4. Enable HTTPS (auto via Let's Encrypt)

## Routes

| Path | Page | Auth |
|------|------|------|
| `/` | Landing page | Public |
| `/auth/login` | Login / Signup | Public |
| `/configurator` | System configurator + onboarding | Public |
| `/dashboard` | Farmer monitoring dashboard | 🔒 Login |
| `/admin` | Admin data panel | 🔒 Admin |
| `/checkout` | Stripe payment flow | 🔒 Login |
| `/checkout/success` | Order confirmation | 🔒 Login |

## Project Structure

```
├── app/                     # Next.js App Router pages
│   ├── page.jsx             # Landing (marketing)
│   ├── layout.jsx           # Root layout + metadata
│   ├── globals.css          # Tailwind + fonts
│   ├── not-found.jsx        # 404 page
│   ├── auth/login/          # Auth page
│   ├── dashboard/           # Farmer dashboard
│   ├── admin/               # Admin panel
│   ├── configurator/        # System configurator
│   ├── checkout/            # Stripe checkout
│   └── api/                 # API routes (manifest, webhook)
├── components/
│   ├── dashboard/           # FarmerDashboard.jsx (7 tabs)
│   │                        # Onboarding.jsx (6 steps)
│   ├── admin/               # AdminPanel.jsx (8 sections)
│   ├── maps/                # FarmDrawingMap.jsx (Google Maps)
│   ├── payment/             # StripeCheckout.jsx (4-step flow)
│   └── ui/                  # AuthGuard.jsx
├── lib/
│   ├── api.js               # API client (all endpoints)
│   └── store.js             # Zustand state management
├── public/                  # Static assets
├── netlify.toml             # Netlify build + redirect config
├── next.config.js
├── package.json
└── tailwind.config.js
```

## Backend (Railway — separate deployment)

The API runs on Railway at `api.theagrivision.com`.
API calls from the frontend are proxied via `netlify.toml` redirects.

## Google Maps API Setup

Enable these APIs in Google Cloud Console:
- Maps JavaScript API
- Places API
- Drawing Library
- Geometry Library

Restrict the API key to your domain: `theagrivision.com/*`

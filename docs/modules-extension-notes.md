# Agrivision – Modules & Theming Notes (Saved)

Last updated: 2026-02-15

## What’s implemented now
- New pages (multi-language EN/FR/AR/TR + RTL):
  - /modules.html — overview for Camera SD Installer + Farmer Mobile App
  - /camera.html — Camera SD Installer details (steps, specs, download placeholder)
  - /app.html — Farmer Mobile App details (features, mockup, store badges placeholder)
- Homepage theming:
  - Leaf wavy separators inserted between major sections via `.leaf-divider`
  - Asset: site/images/leaf-bg-banner.jpg (provided by client)
- Contact updates:
  - 🇨🇦 next to +1 (438) 831‑3611 — Eng. Hisham
  - 🇹🇷 next to +90 536 626 8292 — Dr. Yousif Shihab
  - Emails: info@theagrivision.com, YMSH50@yahoo.co.uk
- PayPal integration:
  - Live Client ID set in index.html SDK script: Afr0yuKe2DXNV3SYXujZtvHSkdPQddu0jwRnb1B_QsW3FMUTuvFMyyltZ0MBfvlV7L4U21upzeqOUv1W
  - Buttons render in #paypal-starter and #paypal-professional
  - Plan IDs still pending in site/js/paypal.js → `PAYPAL_PLANS.starter`, `PAYPAL_PLANS.professional`

## Where to change things later
- Leaf separator style: site/css/main.css (search `.leaf-divider`)
- Module page copy/styles: site/camera.html, site/app.html, site/css/main.css (camera/app sections)
- Translations: site/js/i18n.js (keys: modules.*, camera.*, app.*)
- PayPal plan IDs: site/js/paypal.js (replace placeholders with live plan IDs)

## Next steps (when ready)
1) Provide/confirm PayPal Subscription Plan IDs for $49 Starter and $129 Professional; set in site/js/paypal.js
2) Camera SD installer: wire real download URL and pairing (QR) endpoint when ready
3) Mobile app: replace store badge placeholders with real App Store / Google Play links
4) Merge MR #4 to deploy to www.theagrivision.com (Netlify auto‑deploy from main)

## Links
- Preview: https://update-website-94sbmd68.devinapps.com
- MR #4: https://gitlab.com/canada.servcorp-group/canada.servcorp-project/-/merge_requests/4

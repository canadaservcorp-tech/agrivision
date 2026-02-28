# Agrivision Hardware Bill of Materials (BOM) v2.1
## Custom CM4 IO Board — Updated February 2026

---

## SUMMARY

| Spec | Value |
|------|-------|
| Board | Custom CM4 IO Board v2.1 |
| PCB | 180×130mm, 4-layer |
| Enclosure | 200×150×75mm IP66 ABS |
| Camera | Arducam 64MP Hawkeye (IMX682) |
| Photo Mode | 24MP (6000×4000) |
| Video Mode | 4K @ 30fps |
| Battery | LiFePO4 12V 6Ah, 100×70×50mm, 400g |
| Runtime | ~8.4 days (no solar, 20min cycle) |
| Ports | 16 connectors total |
| Operating Temp | -20°C to +60°C |
| Certifications | CE, FCC, IP66 |

---

## COMPLETE PARTS LIST

### 1. COMPUTE MODULE
| # | Part | Specification | Supplier | Est. Price (CAD) |
|---|------|---------------|----------|-----------------|
| 1 | Raspberry Pi CM4 | 4GB RAM, 32GB eMMC, WiFi | DigiKey / Mouser | $85 |
| 2 | CM4 Mezzanine Connectors | 2× 100-pin Hirose DF40C | DigiKey | $8 |

### 2. CAMERA
| # | Part | Specification | Supplier | Est. Price (CAD) |
|---|------|---------------|----------|-----------------|
| 3 | Arducam 64MP Hawkeye | IMX682, 24MP/4K, autofocus, CSI-2 | Arducam.com | $45 |
| 4 | CSI Ribbon Cable | 15-pin FFC, 200mm, flexible | Amazon | $4 |
| 5 | Camera Bracket | 3D-printed mount for enclosure | Custom | $3 |

### 3. CONNECTIVITY
| # | Part | Specification | Supplier | Est. Price (CAD) |
|---|------|---------------|----------|-----------------|
| 6 | Quectel EC25 4G LTE Modem | Mini PCIe, Cat 4 | DigiKey | $45 |
| 7 | Nano SIM Socket | Push-push type | LCSC | $1 |
| 8 | 4G Antenna | SMA bulkhead omni, weatherproof | Amazon | $12 |
| 9 | U.FL to SMA Pigtail | 150mm coax | Amazon | $3 |
| 10 | SX1276 LoRaWAN Module | RFM95W, 868/915MHz | AliExpress | $8 |
| 11 | LoRa Antenna | SMA spring, 868/915MHz | AliExpress | $4 |

### 4. STORAGE
| # | Part | Specification | Supplier | Est. Price (CAD) |
|---|------|---------------|----------|-----------------|
| 12 | MicroSD Socket ×2 | Push-push, spring-loaded | LCSC | $2 |
| 13 | MicroSD Card (SD1) | 32GB Class 10 (OS boot) | Amazon | $10 |
| 14 | MicroSD Card (SD2) | 64GB Class 10 (update + photo cache) | Amazon | $12 |
| 15 | USB 2.0 Port | USB-A female, through-hole | DigiKey | $2 |

### 5. SENSORS (I²C Bus)
| # | Part | Specification | Supplier | Est. Price (CAD) |
|---|------|---------------|----------|-----------------|
| 16 | BME280 | Temp/humidity/pressure, I²C 0x76 | AliExpress | $4 |
| 17 | ADS1115 | 16-bit ADC, 4-ch, I²C 0x48 | AliExpress | $4 |
| 18 | VEML6075 | UV-A/B sensor, I²C 0x10 | DigiKey | $5 |
| 19 | BH1750 | Light sensor, I²C 0x23 | AliExpress | $3 |
| 20 | Capacitive Soil Moisture | Analog → ADS1115 CH0 | AliExpress | $3 |

### 6. SENSORS (GPIO)
| # | Part | Specification | Supplier | Est. Price (CAD) |
|---|------|---------------|----------|-----------------|
| 21 | Rain Gauge | Tipping bucket, GPIO17 | AliExpress | $15 |
| 22 | DHT22 | Backup temp/humidity, GPIO4 | AliExpress | $4 |
| 23 | Status LED (Green) | 3mm, 20mA, GPIO27 | Local | $0.50 |

### 7. POWER MANAGEMENT
| # | Part | Specification | Supplier | Est. Price (CAD) |
|---|------|---------------|----------|-----------------|
| 24 | Internal Battery | LiFePO4 12V 6Ah, 100×70×50mm, 400g | Amazon | $55 |
| 25 | MPPT Charge Controller IC | CN3791 or LT3652 | DigiKey | $8 |
| 26 | DC-DC Buck Converter | 12V→5V 3A, MP1584EN | AliExpress | $3 |
| 27 | Solar Input Connector | XT60 female, waterproof cap | Amazon | $3 |
| 28 | Ext Battery Connector | XT30 female, waterproof cap | Amazon | $2 |
| 29 | DC 12V Barrel Jack | 5.5×2.1mm, panel mount | DigiKey | $2 |
| 30 | 12V DC Wall Adapter | 12V 2A, barrel plug | Amazon | $12 |
| 31 | Power ON/OFF Button | Latching 16mm, LED ring, panel mount | Amazon | $6 |
| 32 | DS3231 RTC Module | I²C, battery backup, alarm interrupt | AliExpress | $4 |
| 33 | Power Relay/MOSFET | IRLZ44N for power switching | DigiKey | $2 |

### 8. CONNECTORS & HEADERS
| # | Part | Specification | Supplier | Est. Price (CAD) |
|---|------|---------------|----------|-----------------|
| 34 | I²C Sensor Header | 12-pin (3×4), 2.54mm pitch | LCSC | $1 |
| 35 | GPIO Sensor Header | 12-pin (3×4), 2.54mm pitch | LCSC | $1 |
| 36 | SPI LoRa Header | 8-pin, 2.54mm pitch | LCSC | $0.50 |
| 37 | Reset Button | 6mm tactile switch | LCSC | $0.30 |
| 38 | Status LEDs ×4 | Power/Network/Error/Activity | LCSC | $1 |

### 9. ENCLOSURE
| # | Part | Specification | Supplier | Est. Price (CAD) |
|---|------|---------------|----------|-----------------|
| 39 | Enclosure | 200×150×75mm IP66 ABS, hinged lid | Amazon | $22 |
| 40 | PG7 Cable Glands ×8 | IP68, 3-6.5mm cable, waterproof | Amazon | $8 |
| 41 | SMA Bulkhead | Panel mount, weatherproof | Amazon | $3 |
| 42 | DIN Rail Mount | Optional, for barn installation | Amazon | $4 |
| 43 | Mounting Bracket | Stainless steel, pole/wall mount | Custom | $8 |

### 10. PCB & ASSEMBLY
| # | Part | Specification | Supplier | Est. Price (CAD) |
|---|------|---------------|----------|-----------------|
| 44 | Custom PCB | 180×130mm, 4-layer, ENIG finish, 5 pcs | JLCPCB | $35 |
| 45 | SMD Components | Resistors, capacitors, diodes assortment | LCSC | $15 |
| 46 | Wiring & Cables | JST connectors, ribbon, heatshrink | Amazon | $10 |

---

## COST SUMMARY

| Category | Est. Cost (CAD) |
|----------|----------------|
| Compute (CM4 + connectors) | $93 |
| Camera (Arducam 64MP + cable) | $52 |
| Connectivity (4G + LoRa + antennas) | $73 |
| Storage (SD cards + USB) | $26 |
| Sensors (I²C + GPIO) | $38.50 |
| Power (battery + MPPT + DC-DC + button) | $97 |
| Connectors & Headers | $4.80 |
| Enclosure & mounting | $45 |
| PCB & assembly | $60 |
| **TOTAL PER UNIT (prototype)** | **~$489 CAD** |

---

## POWER BUDGET (24MP MODE)

| Phase | Duration | Power | Energy |
|-------|----------|-------|--------|
| CM4 boot + SD2 check | 22s | 5.8W | 0.035 Wh |
| Camera AF + capture (24MP) | 6s | 6.5W | 0.011 Wh |
| AI inference (TFLite) | 15s | 6.5W | 0.027 Wh |
| Upload/cache + heartbeat | 10s | 5.5W | 0.015 Wh |
| Set RTC alarm + shutdown | 5s | 5.0W | 0.007 Wh |
| **Active subtotal** | **58s** | | **0.095 Wh** |
| RTC standby | 19m02s | 0.02W | 0.006 Wh |
| **Total per 20min cycle** | | | **0.101 Wh** |

**Daily:** 72 cycles × 0.101 = **7.27 Wh/day**
**6Ah battery (57.6 Wh usable):** **~7.9 days** without any solar input

---

## STORAGE BUDGET (24MP MODE)

| Metric | Value |
|--------|-------|
| Photo resolution | 6000×4000 (24MP) |
| JPEG size (q=90) | ~7 MB |
| Photos per day | 72 (every 20 min) |
| Daily storage | 504 MB |
| SD1 (32GB OS) | Reserved for OS + system |
| SD2 (64GB cache) | ~120 days of photos |
| USB CCTV drive | External, farmer-managed |
| Cloud sync | Auto-upload when connected |
| Local cleanup | 7-day retention (uploaded photos auto-deleted) |
| DB cleanup | 90-day retention function |

---

## POWER FLOW RULE

```
ALL inputs → Internal Battery FIRST → Internal Battery powers system

Solar Panel ──→ MPPT ──→ Internal Battery (first) ──→ DC-DC 5V ──→ CM4
DC 12V Adapter ──→ MPPT ──→ Internal Battery (first)
External Battery ──→ MPPT ──→ Internal Battery (first)
Solar overflow ──→ charges External Battery (only after internal is full)
```

Internal battery is the CENTRAL HUB. System NEVER draws from inputs directly.

---

## CHANGES FROM v2.0

| Component | v2.0 (Previous) | v2.1 (Current) |
|-----------|-----------------|-----------------|
| Camera | Pi Camera 3 (12MP) | **Arducam 64MP Hawkeye (24MP/4K)** |
| Photo size | ~3 MB | **~7 MB** |
| SD2 card | 32GB | **64GB** (120 days cache) |
| Power button | None | **Latching 16mm with LED ring** |
| DC input | None | **12V barrel jack 5.5×2.1mm** |
| Power logic | Solar priority relay | **ALL inputs → int battery hub** |
| Runtime | ~9 days | **~7.9 days** (larger photos) |
| Prototype cost | ~$387 | **~$489** |
| Total ports | 12 | **16** |

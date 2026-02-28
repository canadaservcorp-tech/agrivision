"use client";

import { useState, useEffect, useRef } from "react";

const CROP_DATABASE = {
  vegetables: ["Tomato", "Pepper", "Cucumber", "Eggplant", "Lettuce", "Onion", "Garlic", "Potato", "Carrot", "Zucchini", "Beans", "Peas", "Spinach", "Cabbage", "Cauliflower", "Broccoli"],
  fruits: ["Apple", "Orange", "Grape", "Olive", "Date Palm", "Banana", "Strawberry", "Watermelon", "Melon", "Fig", "Pomegranate", "Mango", "Avocado", "Cherry", "Peach", "Lemon"],
  grains: ["Wheat", "Rice", "Corn/Maize", "Barley", "Oat", "Sorghum", "Millet", "Quinoa"],
  herbs: ["Mint", "Basil", "Thyme", "Rosemary", "Parsley", "Cilantro", "Oregano", "Saffron"],
  industrial: ["Cotton", "Sugarcane", "Tobacco", "Coffee", "Tea", "Soybean", "Sunflower", "Rapeseed"]
};

const TERRAIN_TYPES = ["Flat / Open Field", "Hilly / Sloped", "Greenhouse", "Indoor / Vertical Farm", "Terraced"];
const WATER_SOURCES = ["Well / Borehole", "River / Stream", "Irrigation Canal", "Rain-fed Only", "Drip System", "Sprinkler System"];
const SOIL_TYPES = ["Clay", "Sandy", "Loam", "Silt", "Peat", "Chalky", "Mixed / Unknown"];

const CAMERA_COVERAGE_RADIUS = 35; // meters
const CAMERA_COVERAGE_AREA = Math.PI * CAMERA_COVERAGE_RADIUS * CAMERA_COVERAGE_RADIUS; // ~3848 m²
const HUB_PRICE = 437;
const CAMERA_NODE_PRICE = 31;
const SHIPPING_BASE = 45;

function calculateCamerasNeeded(areaM2, terrain) {
  const coveragePerCamera = terrain === "Greenhouse" ? 800 : terrain === "Indoor / Vertical Farm" ? 400 : terrain === "Hilly / Sloped" ? 2500 : terrain === "Terraced" ? 2000 : 3200;
  const raw = Math.ceil(areaM2 / coveragePerCamera);
  return Math.max(2, raw);
}

function calculateHubsNeeded(cameras) {
  return Math.ceil(cameras / 15);
}

// Step indicator
function StepBar({ current, steps }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "0 auto 36px", maxWidth: 700, justifyContent: "center" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: i < current ? "#16a34a" : i === current ? "#1e3a2f" : "#d1d5db",
              color: i <= current ? "#fff" : "#6b7280",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.4s ease",
              boxShadow: i === current ? "0 0 0 4px rgba(30,58,47,0.18)" : "none"
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{
              fontSize: 10, marginTop: 5, color: i <= current ? "#1e3a2f" : "#9ca3af",
              fontWeight: i === current ? 700 : 500, fontFamily: "'DM Sans', sans-serif",
              textAlign: "center", maxWidth: 72, lineHeight: 1.2
            }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 40, height: 2, marginBottom: 18,
              background: i < current ? "#16a34a" : "#e5e7eb",
              transition: "all 0.4s ease"
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// Main App
export default function AgriVisionOnboarding() {
  const [step, setStep] = useState(0);
  const [farmer, setFarmer] = useState({
    fullName: "", email: "", phone: "", country: "", language: "en", whatsapp: true
  });
  const [farm, setFarm] = useState({
    name: "", lat: 33.888, lng: 35.495, areaHectares: "", terrain: "", waterSource: "", soilType: "", workers: ""
  });
  const [crops, setCrops] = useState([{ category: "", name: "", variety: "", areaHectares: "", plantMonth: "", harvestMonth: "", organic: false, problems: "" }]);
  const [config, setConfig] = useState(null);
  const [agreed, setAgreed] = useState({ terms: false, dataShare: false });
  const [mapMode, setMapMode] = useState("manual");
  const [showReport, setShowReport] = useState(false);

  const steps = ["Account", "Farm", "Crops", "Configure", "Report", "Payment"];

  // Auto-calculate system
  useEffect(() => {
    if (farm.areaHectares && farm.terrain) {
      const areaM2 = parseFloat(farm.areaHectares) * 10000;
      const cameras = calculateCamerasNeeded(areaM2, farm.terrain);
      const hubs = calculateHubsNeeded(cameras);
      const wifiRepeaters = areaM2 > 50000 ? Math.ceil(areaM2 / 50000) : 0;
      const systemPrice = (hubs * HUB_PRICE) + (cameras * CAMERA_NODE_PRICE) + (wifiRepeaters * 35);
      const shipping = SHIPPING_BASE + (cameras * 2);
      setConfig({ cameras, hubs, wifiRepeaters, systemPrice, shipping, total: systemPrice + shipping, areaM2 });
    }
  }, [farm.areaHectares, farm.terrain]);

  const nextStep = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const addCrop = () => setCrops([...crops, { category: "", name: "", variety: "", areaHectares: "", plantMonth: "", harvestMonth: "", organic: false, problems: "" }]);
  const removeCrop = (i) => setCrops(crops.filter((_, idx) => idx !== i));
  const updateCrop = (i, field, val) => { const c = [...crops]; c[i][field] = val; setCrops(c); };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1.5px solid #d1d5db", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    outline: "none", transition: "border 0.2s", background: "#fafbfc", boxSizing: "border-box"
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block", fontFamily: "'DM Sans', sans-serif" };
  const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer" };
  const btnPrimary = {
    padding: "13px 32px", borderRadius: 10, border: "none", cursor: "pointer",
    background: "linear-gradient(135deg, #1e3a2f 0%, #2d5a3f 100%)", color: "#fff",
    fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans', sans-serif",
    boxShadow: "0 4px 14px rgba(30,58,47,0.25)", transition: "all 0.2s"
  };
  const btnSecondary = {
    padding: "13px 32px", borderRadius: 10, border: "1.5px solid #d1d5db", cursor: "pointer",
    background: "#fff", color: "#374151", fontWeight: 600, fontSize: 15, fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s"
  };

  const cardStyle = {
    background: "#fff", borderRadius: 16, padding: "32px 28px",
    boxShadow: "0 2px 20px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
    maxWidth: 680, margin: "0 auto"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #f0faf4 0%, #e8f5ec 30%, #fafbfc 70%)",
      fontFamily: "'DM Sans', sans-serif", padding: "0 16px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ textAlign: "center", padding: "32px 0 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>🌱</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#1e3a2f", letterSpacing: -0.5, fontFamily: "'Playfair Display', serif" }}>
            AgriVision
          </span>
        </div>
        <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>AI-Powered Smart Farm Configuration</p>
      </div>

      <StepBar current={step} steps={steps} />

      {/* STEP 0: Account */}
      {step === 0 && (
        <div style={cardStyle}>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, color: "#1e3a2f", fontFamily: "'Playfair Display', serif" }}>Create Your Account</h2>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Join thousands of farmers using AI to protect their crops</p>
          
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle} placeholder="e.g. Ahmed Al-Rashidi" value={farmer.fullName} onChange={e => setFarmer({...farmer, fullName: e.target.value})} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} type="email" placeholder="farmer@email.com" value={farmer.email} onChange={e => setFarmer({...farmer, email: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input style={inputStyle} type="tel" placeholder="+971 50 123 4567" value={farmer.phone} onChange={e => setFarmer({...farmer, phone: e.target.value})} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Country *</label>
                <select style={selectStyle} value={farmer.country} onChange={e => setFarmer({...farmer, country: e.target.value})}>
                  <option value="">Select country</option>
                  <option>🇦🇪 UAE</option><option>🇸🇦 Saudi Arabia</option><option>🇶🇦 Qatar</option>
                  <option>🇰🇼 Kuwait</option><option>🇧🇭 Bahrain</option><option>🇴🇲 Oman</option>
                  <option>🇹🇷 Turkey</option><option>🇱🇧 Lebanon</option><option>🇯🇴 Jordan</option>
                  <option>🇪🇬 Egypt</option><option>🇲🇦 Morocco</option><option>🇹🇳 Tunisia</option>
                  <option>🇩🇿 Algeria</option><option>🇮🇶 Iraq</option><option>🇮🇳 India</option>
                  <option>🇨🇦 Canada</option><option>🇺🇸 USA</option><option>🇫🇷 France</option>
                  <option>🇪🇸 Spain</option><option>🇮🇹 Italy</option><option>Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Preferred Language</label>
                <select style={selectStyle} value={farmer.language} onChange={e => setFarmer({...farmer, language: e.target.value})}>
                  <option value="en">🇬🇧 English</option>
                  <option value="ar">🇸🇦 العربية</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="tr">🇹🇷 Türkçe</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="hi">🇮🇳 हिन्दी</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={farmer.whatsapp} onChange={e => setFarmer({...farmer, whatsapp: e.target.checked})} style={{ width: 16, height: 16, cursor: "pointer" }} />
              <span style={{ fontSize: 13, color: "#4b5563" }}>This phone number is available on WhatsApp</span>
            </div>

            <div style={{ background: "#f0faf4", borderRadius: 10, padding: 14, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input type="checkbox" checked={agreed.terms} onChange={e => setAgreed({...agreed, terms: e.target.checked})} style={{ width: 16, height: 16, cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: "#374151" }}>I agree to the <span style={{ color: "#16a34a", textDecoration: "underline", cursor: "pointer" }}>Terms of Service</span> and <span style={{ color: "#16a34a", textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</span> *</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={agreed.dataShare} onChange={e => setAgreed({...agreed, dataShare: e.target.checked})} style={{ width: 16, height: 16, cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: "#374151" }}>Allow sharing aggregated farm data with agricultural partners to receive product recommendations and offers</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}>
            <button style={{ ...btnPrimary, opacity: agreed.terms ? 1 : 0.5 }} onClick={nextStep} disabled={!agreed.terms}>Continue →</button>
          </div>
        </div>
      )}

      {/* STEP 1: Farm Details */}
      {step === 1 && (
        <div style={cardStyle}>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, color: "#1e3a2f", fontFamily: "'Playfair Display', serif" }}>Farm Details</h2>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Tell us about your farm so we can configure the perfect monitoring system</p>

          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={labelStyle}>Farm Name *</label>
              <input style={inputStyle} placeholder="e.g. Al-Rashidi Olive Farm" value={farm.name} onChange={e => setFarm({...farm, name: e.target.value})} />
            </div>

            {/* Map Section */}
            <div>
              <label style={labelStyle}>Farm Location *</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => setMapMode("manual")} style={{ ...mapMode === "manual" ? btnPrimary : btnSecondary, padding: "8px 16px", fontSize: 12 }}>Enter Coordinates</button>
                <button onClick={() => setMapMode("map")} style={{ ...mapMode === "map" ? btnPrimary : btnSecondary, padding: "8px 16px", fontSize: 12 }}>📍 Use Google Maps</button>
              </div>
              
              {mapMode === "manual" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Latitude</label>
                    <input style={inputStyle} type="number" step="0.001" placeholder="33.888" value={farm.lat} onChange={e => setFarm({...farm, lat: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Longitude</label>
                    <input style={inputStyle} type="number" step="0.001" placeholder="35.495" value={farm.lng} onChange={e => setFarm({...farm, lng: parseFloat(e.target.value)})} />
                  </div>
                </div>
              ) : (
                <div style={{
                  background: "#e8f5ec", borderRadius: 12, height: 220,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  border: "2px dashed #86efac", cursor: "pointer"
                }}>
                  <span style={{ fontSize: 40, marginBottom: 8 }}>🗺️</span>
                  <span style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>Interactive Google Map</span>
                  <span style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Click to place your farm location • Draw farm boundaries</span>
                  <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 8, background: "#fff", padding: "4px 10px", borderRadius: 6 }}>📍 Lat: {farm.lat.toFixed(3)} | Lng: {farm.lng.toFixed(3)}</span>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Farm Size (Hectares) *</label>
                <input style={inputStyle} type="number" step="0.1" placeholder="e.g. 5.0" value={farm.areaHectares} onChange={e => setFarm({...farm, areaHectares: e.target.value})} />
                {farm.areaHectares && <span style={{ fontSize: 11, color: "#6b7280" }}>{(parseFloat(farm.areaHectares) * 10000).toLocaleString()} m² • {(parseFloat(farm.areaHectares) * 2.471).toFixed(1)} acres</span>}
              </div>
              <div>
                <label style={labelStyle}>Number of Workers</label>
                <input style={inputStyle} type="number" placeholder="e.g. 10" value={farm.workers} onChange={e => setFarm({...farm, workers: e.target.value})} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Terrain Type *</label>
                <select style={selectStyle} value={farm.terrain} onChange={e => setFarm({...farm, terrain: e.target.value})}>
                  <option value="">Select...</option>
                  {TERRAIN_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Water Source</label>
                <select style={selectStyle} value={farm.waterSource} onChange={e => setFarm({...farm, waterSource: e.target.value})}>
                  <option value="">Select...</option>
                  {WATER_SOURCES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Soil Type</label>
                <select style={selectStyle} value={farm.soilType} onChange={e => setFarm({...farm, soilType: e.target.value})}>
                  <option value="">Select...</option>
                  {SOIL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Live Preview */}
            {config && (
              <div style={{
                background: "linear-gradient(135deg, #1e3a2f, #2d5a3f)", borderRadius: 12, padding: 16,
                color: "#fff", display: "flex", justifyContent: "space-around", textAlign: "center"
              }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{config.cameras}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>Cameras</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{config.hubs}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>Central Hub(s)</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{config.wifiRepeaters}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>WiFi Repeaters</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>${config.total.toLocaleString()}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>Estimated Total</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            <button style={btnSecondary} onClick={prevStep}>← Back</button>
            <button style={btnPrimary} onClick={nextStep}>Continue →</button>
          </div>
        </div>
      )}

      {/* STEP 2: Crops */}
      {step === 2 && (
        <div style={{ ...cardStyle, maxWidth: 750 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, color: "#1e3a2f", fontFamily: "'Playfair Display', serif" }}>Crop Details</h2>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Add all crops on your farm — our AI customizes disease detection for each</p>

          {crops.map((crop, i) => (
            <div key={i} style={{
              background: "#fafbfc", borderRadius: 12, padding: 18, marginBottom: 14,
              border: "1px solid #e5e7eb", position: "relative"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1e3a2f" }}>🌾 Crop {i + 1}</span>
                {crops.length > 1 && (
                  <button onClick={() => removeCrop(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>✕</button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Category *</label>
                  <select style={{ ...selectStyle, fontSize: 13 }} value={crop.category} onChange={e => { updateCrop(i, "category", e.target.value); updateCrop(i, "name", ""); }}>
                    <option value="">Select...</option>
                    {Object.keys(CROP_DATABASE).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Crop Name *</label>
                  <select style={{ ...selectStyle, fontSize: 13 }} value={crop.name} onChange={e => updateCrop(i, "name", e.target.value)}>
                    <option value="">Select...</option>
                    {crop.category && CROP_DATABASE[crop.category]?.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Variety (optional)</label>
                  <input style={{ ...inputStyle, fontSize: 13 }} placeholder="e.g. Roma, Heirloom" value={crop.variety} onChange={e => updateCrop(i, "variety", e.target.value)} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Area (Hectares)</label>
                  <input style={{ ...inputStyle, fontSize: 13 }} type="number" step="0.1" placeholder="1.0" value={crop.areaHectares} onChange={e => updateCrop(i, "areaHectares", e.target.value)} />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Planting Month</label>
                  <select style={{ ...selectStyle, fontSize: 13 }} value={crop.plantMonth} onChange={e => updateCrop(i, "plantMonth", e.target.value)}>
                    <option value="">Select...</option>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Harvest Month</label>
                  <select style={{ ...selectStyle, fontSize: 13 }} value={crop.harvestMonth} onChange={e => updateCrop(i, "harvestMonth", e.target.value)}>
                    <option value="">Select...</option>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Organic?</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <input type="checkbox" checked={crop.organic} onChange={e => updateCrop(i, "organic", e.target.checked)} style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 12, color: "#374151" }}>Certified organic</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ ...labelStyle, fontSize: 11 }}>Current Problems (optional)</label>
                <input style={{ ...inputStyle, fontSize: 13 }} placeholder="e.g. leaf blight, insects, poor yield..." value={crop.problems} onChange={e => updateCrop(i, "problems", e.target.value)} />
              </div>
            </div>
          ))}

          <button onClick={addCrop} style={{
            width: "100%", padding: 12, borderRadius: 10,
            border: "2px dashed #86efac", background: "#f0faf4",
            color: "#16a34a", fontWeight: 700, fontSize: 13, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif"
          }}>
            + Add Another Crop
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            <button style={btnSecondary} onClick={prevStep}>← Back</button>
            <button style={btnPrimary} onClick={nextStep}>Continue →</button>
          </div>
        </div>
      )}

      {/* STEP 3: System Configuration */}
      {step === 3 && (
        <div style={{ ...cardStyle, maxWidth: 750 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, color: "#1e3a2f", fontFamily: "'Playfair Display', serif" }}>System Configuration</h2>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Based on your farm, here's what we recommend</p>

          {config ? (
            <>
              {/* Farm Summary */}
              <div style={{
                background: "linear-gradient(135deg, #1e3a2f, #2d5a3f)", borderRadius: 14, padding: 24,
                color: "#fff", marginBottom: 20
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📐 Farm: {farm.name || "Your Farm"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
                  <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{parseFloat(farm.areaHectares).toFixed(1)}</div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>Hectares</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{config.cameras}</div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>AI Cameras</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{config.hubs}</div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>Central Hub</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{crops.filter(c => c.name).length}</div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>Crop Types</div>
                  </div>
                </div>
              </div>

              {/* Camera Disposition Map */}
              <div style={{
                background: "#f0faf4", borderRadius: 14, padding: 20, marginBottom: 20,
                border: "1px solid #bbf7d0"
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a2f", marginBottom: 12 }}>📍 Camera Disposition Map</div>
                <div style={{
                  background: "#fff", borderRadius: 10, height: 200, position: "relative",
                  border: "1px solid #d1fae5", overflow: "hidden"
                }}>
                  {/* Simulated farm map */}
                  <div style={{
                    position: "absolute", top: "10%", left: "10%", right: "10%", bottom: "10%",
                    border: "2px dashed #86efac", borderRadius: 8, background: "rgba(34,197,94,0.05)"
                  }}>
                    {/* Hub */}
                    <div style={{
                      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                      width: 32, height: 32, borderRadius: "50%", background: "#1e3a2f",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 0 6px rgba(30,58,47,0.2)", zIndex: 2
                    }}>
                      <span style={{ color: "#fff", fontSize: 14 }}>🏠</span>
                    </div>
                    {/* Camera positions */}
                    {Array.from({ length: Math.min(config.cameras, 12) }).map((_, i) => {
                      const angle = (i / Math.min(config.cameras, 12)) * Math.PI * 2;
                      const radius = 35;
                      const x = 50 + Math.cos(angle) * radius;
                      const y = 50 + Math.sin(angle) * radius;
                      return (
                        <div key={i} style={{
                          position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)",
                          width: 22, height: 22, borderRadius: "50%", background: "#16a34a",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 0 0 8px rgba(22,163,74,0.12)", zIndex: 1
                        }}>
                          <span style={{ fontSize: 10, color: "#fff" }}>📷</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ position: "absolute", bottom: 6, right: 10, fontSize: 10, color: "#9ca3af" }}>
                    🏠 Hub • 📷 Camera Node • Coverage: {CAMERA_COVERAGE_RADIUS}m radius
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div style={{
                background: "#fafbfc", borderRadius: 14, padding: 20, marginBottom: 20,
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a2f", marginBottom: 14 }}>💰 Price Breakdown</div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>Central Hub × {config.hubs}</span>
                    <span style={{ fontWeight: 600 }}>${(config.hubs * HUB_PRICE).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>Camera Nodes × {config.cameras} @ ${CAMERA_NODE_PRICE} each</span>
                    <span style={{ fontWeight: 600 }}>${(config.cameras * CAMERA_NODE_PRICE).toLocaleString()}</span>
                  </div>
                  {config.wifiRepeaters > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#6b7280" }}>WiFi Repeaters × {config.wifiRepeaters}</span>
                      <span style={{ fontWeight: 600 }}>${(config.wifiRepeaters * 35).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>Shipping & Handling</span>
                    <span style={{ fontWeight: 600 }}>${config.shipping}</span>
                  </div>
                  <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
                    <span style={{ fontWeight: 700, color: "#1e3a2f" }}>Total</span>
                    <span style={{ fontWeight: 800, color: "#16a34a", fontSize: 20 }}>${config.total.toLocaleString()} USD</span>
                  </div>
                </div>

                <div style={{
                  background: "#fffbeb", borderRadius: 8, padding: 10, marginTop: 14,
                  display: "flex", alignItems: "center", gap: 8, border: "1px solid #fde68a"
                }}>
                  <span>💡</span>
                  <span style={{ fontSize: 11, color: "#92400e" }}>
                    This replaces {config.cameras} standalone systems that would cost ${(config.cameras * 577).toLocaleString()} — 
                    you save <strong>${((config.cameras * 577) - config.total).toLocaleString()}</strong> ({Math.round(((config.cameras * 577 - config.total) / (config.cameras * 577)) * 100)}% savings)
                  </span>
                </div>
              </div>

              {/* What's Included */}
              <div style={{
                background: "#fafbfc", borderRadius: 14, padding: 20,
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a2f", marginBottom: 12 }}>📦 What's Included</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: "#374151" }}>
                  {[
                    "✅ Central Hub (pre-configured)",
                    "✅ All camera nodes (ready to deploy)",
                    "✅ Mounting brackets & hardware",
                    "✅ Weatherproof enclosures",
                    "✅ Solar panels & batteries",
                    "✅ Pre-loaded AI disease models",
                    "✅ 1 year cloud dashboard access",
                    "✅ Mobile app (PWA) access",
                    "✅ Installation guide & video",
                    "✅ Email & WhatsApp support",
                    "✅ OTA firmware updates",
                    "✅ Farm disposition map"
                  ].map((item, i) => <div key={i}>{item}</div>)}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              <span style={{ fontSize: 40 }}>⚠️</span>
              <p>Please go back and enter farm size and terrain type to generate configuration.</p>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            <button style={btnSecondary} onClick={prevStep}>← Back</button>
            <button style={btnPrimary} onClick={nextStep}>Generate Report →</button>
          </div>
        </div>
      )}

      {/* STEP 4: Report */}
      {step === 4 && (
        <div style={{ ...cardStyle, maxWidth: 750 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, color: "#1e3a2f", fontFamily: "'Playfair Display', serif" }}>📋 System Report</h2>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Review your complete system configuration</p>

          {/* Report Card */}
          <div style={{
            border: "2px solid #1e3a2f", borderRadius: 14, padding: 24, marginBottom: 20,
            background: "#fff"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a2f", fontFamily: "'Playfair Display', serif" }}>🌱 AgriVision System Report</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", textAlign: "right" }}>
                Ref: AGV-{Date.now().toString().slice(-6)}<br />
                info@theagrivision.com
              </div>
            </div>

            {/* Farmer Info */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a2f", marginBottom: 8 }}>👤 Farmer</div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8 }}>
                {farmer.fullName || "—"} • {farmer.email || "—"} • {farmer.phone || "—"} • {farmer.country || "—"}
              </div>
            </div>

            {/* Farm Info */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a2f", marginBottom: 8 }}>🏡 Farm</div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8 }}>
                {farm.name || "—"} • {farm.areaHectares} ha ({farm.terrain}) • GPS: {farm.lat}, {farm.lng}<br />
                Water: {farm.waterSource || "—"} • Soil: {farm.soilType || "—"} • Workers: {farm.workers || "—"}
              </div>
            </div>

            {/* Crops */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a2f", marginBottom: 8 }}>🌾 Crops</div>
              {crops.filter(c => c.name).map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: "#374151", lineHeight: 1.8 }}>
                  {c.name} ({c.category}) {c.variety && `— ${c.variety}`} • {c.areaHectares || "?"} ha • {c.plantMonth || "?"} → {c.harvestMonth || "?"} {c.organic && "🟢 Organic"} {c.problems && `• Issues: ${c.problems}`}
                </div>
              ))}
            </div>

            {/* System Config */}
            {config && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a2f", marginBottom: 8 }}>⚙️ System Configuration</div>
                <div style={{ fontSize: 12, color: "#374151", lineHeight: 2 }}>
                  Central Hub(s): {config.hubs} × Raspberry Pi 4B — ${config.hubs * HUB_PRICE}<br />
                  Camera Nodes: {config.cameras} × ESP32-S3 (5MP) — ${config.cameras * CAMERA_NODE_PRICE}<br />
                  {config.wifiRepeaters > 0 && <>WiFi Repeaters: {config.wifiRepeaters} — ${config.wifiRepeaters * 35}<br /></>}
                  Shipping: ${config.shipping}
                </div>
                <div style={{
                  marginTop: 12, padding: 12, background: "#f0faf4", borderRadius: 8,
                  fontSize: 16, fontWeight: 800, color: "#16a34a", textAlign: "center"
                }}>
                  Total: ${config.total.toLocaleString()} USD
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button style={{ ...btnSecondary, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              📄 Download PDF
            </button>
            <button style={{ ...btnSecondary, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              📧 Email Report
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <button style={btnSecondary} onClick={prevStep}>← Back</button>
            <button style={btnPrimary} onClick={nextStep}>Proceed to Payment →</button>
          </div>
        </div>
      )}

      {/* STEP 5: Payment */}
      {step === 5 && (
        <div style={cardStyle}>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, color: "#1e3a2f", fontFamily: "'Playfair Display', serif" }}>💳 Complete Purchase</h2>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Secure payment powered by Stripe</p>

          {config && (
            <>
              {/* Order Summary */}
              <div style={{
                background: "#f0faf4", borderRadius: 12, padding: 16, marginBottom: 20,
                border: "1px solid #bbf7d0"
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a2f", marginBottom: 10 }}>Order Summary</div>
                <div style={{ display: "grid", gap: 6, fontSize: 12, color: "#374151" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Central Hub × {config.hubs}</span><span>${(config.hubs * HUB_PRICE).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Camera Nodes × {config.cameras}</span><span>${(config.cameras * CAMERA_NODE_PRICE).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Shipping</span><span>${config.shipping}</span>
                  </div>
                  <div style={{ height: 1, background: "#bbf7d0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16 }}>
                    <span>Total</span><span style={{ color: "#16a34a" }}>${config.total.toLocaleString()} USD</span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Cardholder Name</label>
                  <input style={inputStyle} placeholder="Name on card" />
                </div>
                <div>
                  <label style={labelStyle}>Card Number</label>
                  <div style={{ ...inputStyle, background: "#f9fafb", display: "flex", alignItems: "center", gap: 8, padding: "12px 14px" }}>
                    <span>💳</span>
                    <span style={{ color: "#9ca3af", fontSize: 13 }}>Stripe Secure Payment Form</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Expiry</label>
                    <input style={inputStyle} placeholder="MM/YY" />
                  </div>
                  <div>
                    <label style={labelStyle}>CVC</label>
                    <input style={inputStyle} placeholder="123" />
                  </div>
                  <div>
                    <label style={labelStyle}>ZIP / Postal</label>
                    <input style={inputStyle} placeholder="H7T 2R1" />
                  </div>
                </div>

                <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🔒</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>Payments are securely processed by Stripe. Your card details are never stored on our servers.</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
                <button style={btnSecondary} onClick={prevStep}>← Back</button>
                <button style={{
                  ...btnPrimary,
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  padding: "15px 40px", fontSize: 16
                }} onClick={() => alert("🎉 Order placed successfully!\n\nReference: AGV-" + Date.now().toString().slice(-6) + "\n\nYou will receive a confirmation email at " + (farmer.email || "your email") + "\n\nShipping in 5-7 business days.")}>
                  🔒 Pay ${config.total.toLocaleString()} USD
                </button>
              </div>

              <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#9ca3af" }}>
                Estimated delivery: 5-7 business days • Free installation support via WhatsApp
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "32px 0 20px", fontSize: 11, color: "#9ca3af" }}>
        © 2026 AgriVision — Performance Cristal Technologies Avancées S.A. • Made in Canada 🇨🇦
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";

// ============================================================
// MOCK DATA (Replace with API calls in production)
// ============================================================
const MOCK_FARMER = { id: 1, name: "Ahmed Al-Rashidi", email: "ahmed@farm.com", country: "🇦🇪 UAE", language: "en", plan: "Professional" };

const MOCK_FARMS = [
  { id: 1, name: "Al-Rashidi Olive Farm", area: 5.2, terrain: "Flat", lat: 25.276, lng: 55.296, country: "UAE", crops: [
    { id: 1, name: "Olive", category: "fruits", area: 3.0, organic: true },
    { id: 2, name: "Date Palm", category: "fruits", area: 1.5, organic: false },
    { id: 3, name: "Tomato", category: "vegetables", area: 0.7, organic: false }
  ]}
];

const MOCK_SYSTEM = {
  id: 1, hub_serial: "HUB-A3F7C1D2", is_online: true, battery: 78, temperature: 42,
  signal: -65, storage: 12.4, firmware: "3.0.1", plan: "Professional",
  cameras: [
    { id: 1, serial: "CAM-001", online: true, battery: 92, lastImage: "2h ago", images_today: 48 },
    { id: 2, serial: "CAM-002", online: true, battery: 85, lastImage: "2h ago", images_today: 47 },
    { id: 3, serial: "CAM-003", online: true, battery: 71, lastImage: "2h ago", images_today: 46 },
    { id: 4, serial: "CAM-004", online: false, battery: 12, lastImage: "6h ago", images_today: 24 },
    { id: 5, serial: "CAM-005", online: true, battery: 88, lastImage: "2h ago", images_today: 48 },
    { id: 6, serial: "CAM-006", online: true, battery: 95, lastImage: "2h ago", images_today: 47 },
    { id: 7, serial: "CAM-007", online: true, battery: 67, lastImage: "2h ago", images_today: 45 },
    { id: 8, serial: "CAM-008", online: true, battery: 80, lastImage: "3h ago", images_today: 44 },
  ]
};

const MOCK_DETECTIONS = [
  { id: 1, disease: "Olive Leaf Spot", category: "Fungal", confidence: 0.94, severity: "high", crop: "Olive", time: "2h ago", treatment: "Apply copper-based fungicide (Bordeaux mixture). Remove affected leaves.", acknowledged: false },
  { id: 2, disease: "Spider Mite Infestation", category: "Pest", confidence: 0.87, severity: "medium", crop: "Tomato", time: "5h ago", treatment: "Apply neem oil spray. Introduce predatory mites.", acknowledged: true },
  { id: 3, disease: "Date Palm Scale", category: "Pest", confidence: 0.91, severity: "medium", crop: "Date Palm", time: "8h ago", treatment: "Prune heavily infested fronds. Apply horticultural oil.", acknowledged: false },
  { id: 4, disease: "Bayoud Disease", category: "Fungal", confidence: 0.78, severity: "critical", crop: "Date Palm", time: "1d ago", treatment: "URGENT: Isolate affected trees. No chemical cure available. Remove and destroy infected palms.", acknowledged: false },
  { id: 5, disease: "Early Blight", category: "Fungal", confidence: 0.92, severity: "low", crop: "Tomato", time: "1d ago", treatment: "Apply chlorothalonil. Improve air circulation.", acknowledged: true },
  { id: 6, disease: "Olive Knot", category: "Bacterial", confidence: 0.85, severity: "medium", crop: "Olive", time: "2d ago", treatment: "Prune infected branches. Apply copper spray after pruning.", acknowledged: true },
];

const MOCK_SENSORS = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}:00`,
  temp: 28 + Math.sin(i / 4) * 12 + Math.random() * 2,
  humidity: 45 + Math.cos(i / 5) * 20 + Math.random() * 3,
  soil: 32 + Math.sin(i / 6) * 8 + Math.random() * 2,
  light: i > 5 && i < 19 ? 400 + Math.sin((i - 6) / 4) * 600 + Math.random() * 50 : Math.random() * 20
}));

const MOCK_NOTIFICATIONS = [
  { id: 1, title: "🚨 Critical: Bayoud Disease Detected", message: "Date Palm zone - immediate action required", type: "alert", time: "1d ago", read: false },
  { id: 2, title: "🔴 High: Olive Leaf Spot", message: "Camera CAM-003 detected fungal infection", type: "alert", time: "2h ago", read: false },
  { id: 3, title: "⚠️ Low Battery: CAM-004", message: "Battery at 12%. Solar panel may be obstructed", type: "warning", time: "3h ago", read: false },
  { id: 4, title: "✅ System Update Complete", message: "Hub firmware updated to v3.0.1", type: "info", time: "1d ago", read: true },
  { id: 5, title: "📊 Weekly Report Ready", message: "Your farm performance report for this week", type: "info", time: "2d ago", read: true },
];

// ============================================================
// COMPONENTS
// ============================================================

const COLORS = {
  bg: "#f5f7f3",
  card: "#ffffff",
  primary: "#1e3a2f",
  primaryLight: "#2d5a3f",
  accent: "#16a34a",
  accentLight: "#dcfce7",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  danger: "#ef4444",
  dangerLight: "#fee2e2",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
};

function SeverityBadge({ severity }) {
  const map = {
    critical: { bg: "#7f1d1d", color: "#fecaca", label: "CRITICAL" },
    high: { bg: "#dc2626", color: "#fff", label: "HIGH" },
    medium: { bg: "#f59e0b", color: "#000", label: "MEDIUM" },
    low: { bg: "#16a34a", color: "#fff", label: "LOW" },
  };
  const s = map[severity] || map.low;
  return (
    <span style={{
      background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 20,
      fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase"
    }}>{s.label}</span>
  );
}

function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "18px 20px",
      border: `1px solid ${COLORS.border}`, flex: 1, minWidth: 150,
      transition: "transform 0.15s", cursor: "default"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: color || COLORS.primary, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{sub}</div>}
        </div>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
      {trend && <div style={{ fontSize: 11, color: trend > 0 ? COLORS.accent : COLORS.danger, marginTop: 6, fontWeight: 600 }}>{trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% vs last week</div>}
    </div>
  );
}

function MiniChart({ data, dataKey, color, height = 60 }) {
  const max = Math.max(...data.map(d => d[dataKey]));
  const min = Math.min(...data.map(d => d[dataKey]));
  const range = max - min || 1;
  return (
    <div style={{ display: "flex", alignItems: "end", gap: 2, height }}>
      {data.map((d, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: "3px 3px 0 0",
          background: `${color}${i === data.length - 1 ? "" : "80"}`,
          height: `${((d[dataKey] - min) / range) * 100}%`,
          minHeight: 3, transition: "height 0.3s"
        }} title={`${d.hour}: ${d[dataKey].toFixed(1)}`} />
      ))}
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================

export default function FarmerDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFarm, setSelectedFarm] = useState(MOCK_FARMS[0]);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [sensorView, setSensorView] = useState("temperature");

  const unread = notifications.filter(n => !n.read).length;

  const tabs = [
    { id: "overview", icon: "📊", label: "Overview" },
    { id: "cameras", icon: "📷", label: "Cameras" },
    { id: "detections", icon: "🔬", label: "Detections" },
    { id: "sensors", icon: "🌡️", label: "Sensors" },
    { id: "map", icon: "🗺️", label: "Farm Map" },
    { id: "reports", icon: "📄", label: "Reports" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const markAllRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      {/* TOP NAV */}
      <div style={{
        background: COLORS.primary, padding: "0 24px", display: "flex",
        alignItems: "center", justifyContent: "space-between", height: 56,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>🌱</span>
          <span style={{ color: "#fff", fontSize: 17, fontWeight: 800, fontFamily: "'Playfair Display', serif", letterSpacing: -0.3 }}>AgriVision</span>
          <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 6px" }}>|</span>
          <select value={selectedFarm.id} onChange={e => setSelectedFarm(MOCK_FARMS.find(f => f.id === +e.target.value))}
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "5px 10px", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
            {MOCK_FARMS.map(f => <option key={f.id} value={f.id} style={{ color: "#000" }}>{f.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* System Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: MOCK_SYSTEM.is_online ? "#22c55e" : "#ef4444", boxShadow: `0 0 6px ${MOCK_SYSTEM.is_online ? "#22c55e" : "#ef4444"}` }} />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600 }}>{MOCK_SYSTEM.is_online ? "System Online" : "Offline"}</span>
          </div>
          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowNotifs(!showNotifs)} style={{
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
              padding: "6px 10px", cursor: "pointer", color: "#fff", fontSize: 16, position: "relative"
            }}>
              🔔
              {unread > 0 && <span style={{
                position: "absolute", top: -2, right: -2, background: "#ef4444", color: "#fff",
                fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>{unread}</span>}
            </button>
            {showNotifs && (
              <div style={{
                position: "absolute", top: 42, right: 0, width: 340, maxHeight: 420,
                background: "#fff", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                border: `1px solid ${COLORS.border}`, overflow: "hidden", zIndex: 200
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.primary }}>Notifications</span>
                  <button onClick={markAllRead} style={{ background: "none", border: "none", color: COLORS.accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Mark all read</button>
                </div>
                <div style={{ maxHeight: 360, overflow: "auto" }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{
                      padding: "12px 16px", borderBottom: `1px solid ${COLORS.borderLight}`,
                      background: n.read ? "#fff" : "#f0fdf4", cursor: "pointer"
                    }} onClick={() => setNotifications(notifications.map(x => x.id === n.id ? { ...x, read: true } : x))}>
                      <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: COLORS.text, marginBottom: 3 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>{n.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700 }}>
              {MOCK_FARMER.name.charAt(0)}
            </div>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600 }}>{MOCK_FARMER.name.split(" ")[0]}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        {/* SIDEBAR */}
        <div style={{
          width: 200, background: "#fff", borderRight: `1px solid ${COLORS.border}`,
          padding: "16px 8px", flexShrink: 0
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: activeTab === t.id ? COLORS.accentLight : "transparent",
              color: activeTab === t.id ? COLORS.primary : COLORS.textMuted,
              fontWeight: activeTab === t.id ? 700 : 500, fontSize: 13,
              fontFamily: "'DM Sans', sans-serif", marginBottom: 2,
              transition: "all 0.15s"
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>{t.label}
            </button>
          ))}

          {/* Hub Status Mini */}
          <div style={{
            margin: "20px 8px 0", padding: 14, background: COLORS.borderLight,
            borderRadius: 12, fontSize: 11
          }}>
            <div style={{ fontWeight: 700, color: COLORS.primary, marginBottom: 8 }}>Hub Status</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: COLORS.textMuted }}>Battery</span>
              <span style={{ fontWeight: 600, color: MOCK_SYSTEM.battery > 20 ? COLORS.accent : COLORS.danger }}>{MOCK_SYSTEM.battery}%</span>
            </div>
            <div style={{ height: 4, background: COLORS.border, borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${MOCK_SYSTEM.battery}%`, background: MOCK_SYSTEM.battery > 20 ? COLORS.accent : COLORS.danger, borderRadius: 2 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: COLORS.textMuted }}>Temp</span>
              <span style={{ fontWeight: 600 }}>{MOCK_SYSTEM.temperature}°C</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: COLORS.textMuted }}>Signal</span>
              <span style={{ fontWeight: 600 }}>{MOCK_SYSTEM.signal} dBm</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: COLORS.textMuted }}>Storage</span>
              <span style={{ fontWeight: 600 }}>{MOCK_SYSTEM.storage} GB</span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, padding: "20px 28px", overflow: "auto" }}>

          {/* ============ OVERVIEW TAB ============ */}
          {activeTab === "overview" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 22, color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>
                  Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {MOCK_FARMER.name.split(" ")[0]}
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.textMuted }}>
                  {selectedFarm.name} • {selectedFarm.area} hectares • {selectedFarm.crops.length} crops
                </p>
              </div>

              {/* Alert Banner */}
              {MOCK_DETECTIONS.filter(d => d.severity === "critical" && !d.acknowledged).length > 0 && (
                <div style={{
                  background: "linear-gradient(135deg, #7f1d1d, #991b1b)", borderRadius: 12,
                  padding: "14px 20px", marginBottom: 20, display: "flex",
                  alignItems: "center", justifyContent: "space-between", color: "#fff"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>🚨</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Critical Alert: Bayoud Disease Detected</div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>Date Palm zone requires immediate attention — no chemical cure available</div>
                    </div>
                  </div>
                  <button onClick={() => { setActiveTab("detections"); setSelectedDetection(MOCK_DETECTIONS[3]); }}
                    style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    View Details →
                  </button>
                </div>
              )}

              {/* Stat Cards */}
              <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
                <StatCard icon="📷" label="Cameras" value={`${MOCK_SYSTEM.cameras.filter(c => c.online).length}/${MOCK_SYSTEM.cameras.length}`} sub="Online" color={COLORS.accent} />
                <StatCard icon="🔬" label="Detections" value={MOCK_DETECTIONS.length} sub="Last 7 days" color={COLORS.warning} trend={-12} />
                <StatCard icon="🌡️" label="Temperature" value={`${MOCK_SENSORS[MOCK_SENSORS.length - 1].temp.toFixed(1)}°`} sub="Current" color="#e65100" />
                <StatCard icon="💧" label="Soil Moisture" value={`${MOCK_SENSORS[MOCK_SENSORS.length - 1].soil.toFixed(0)}%`} sub="Average" color="#0277bd" />
                <StatCard icon="🔋" label="Hub Battery" value={`${MOCK_SYSTEM.battery}%`} sub="Charging ☀️" color={MOCK_SYSTEM.battery > 20 ? COLORS.accent : COLORS.danger} />
              </div>

              {/* Charts Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {/* Temperature Chart */}
                <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>🌡️ Temperature (24h)</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 12 }}>
                    Min: {Math.min(...MOCK_SENSORS.map(s => s.temp)).toFixed(1)}° | Max: {Math.max(...MOCK_SENSORS.map(s => s.temp)).toFixed(1)}°
                  </div>
                  <MiniChart data={MOCK_SENSORS} dataKey="temp" color="#e65100" height={80} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: COLORS.textMuted, marginTop: 4 }}>
                    <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
                  </div>
                </div>
                {/* Humidity Chart */}
                <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>💧 Humidity (24h)</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 12 }}>
                    Min: {Math.min(...MOCK_SENSORS.map(s => s.humidity)).toFixed(0)}% | Max: {Math.max(...MOCK_SENSORS.map(s => s.humidity)).toFixed(0)}%
                  </div>
                  <MiniChart data={MOCK_SENSORS} dataKey="humidity" color="#0277bd" height={80} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: COLORS.textMuted, marginTop: 4 }}>
                    <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
                  </div>
                </div>
              </div>

              {/* Recent Detections */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>🔬 Recent Detections</div>
                  <button onClick={() => setActiveTab("detections")} style={{ background: "none", border: "none", color: COLORS.accent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View All →</button>
                </div>
                {MOCK_DETECTIONS.slice(0, 4).map(d => (
                  <div key={d.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 0", borderBottom: `1px solid ${COLORS.borderLight}`
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, background: COLORS.borderLight,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
                      }}>
                        {d.category === "Fungal" ? "🍄" : d.category === "Pest" ? "🐛" : d.category === "Bacterial" ? "🦠" : "⚠️"}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{d.disease}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{d.crop} • {d.time} • {(d.confidence * 100).toFixed(0)}% confidence</div>
                      </div>
                    </div>
                    <SeverityBadge severity={d.severity} />
                  </div>
                ))}
              </div>

              {/* Crop Summary */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>🌾 Your Crops</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {selectedFarm.crops.map(c => (
                    <div key={c.id} style={{
                      background: COLORS.borderLight, borderRadius: 12, padding: 16, textAlign: "center"
                    }}>
                      <span style={{ fontSize: 30 }}>{c.name === "Olive" ? "🫒" : c.name === "Date Palm" ? "🌴" : c.name === "Tomato" ? "🍅" : "🌱"}</span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginTop: 6 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{c.area} ha • {c.category}</div>
                      {c.organic && <span style={{ fontSize: 10, color: COLORS.accent, fontWeight: 700 }}>🟢 Organic</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============ CAMERAS TAB ============ */}
          {activeTab === "cameras" && (
            <div>
              <h2 style={{ margin: "0 0 20px", fontSize: 20, color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>📷 Camera Network</h2>
              <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
                <StatCard icon="📷" label="Total Cameras" value={MOCK_SYSTEM.cameras.length} color={COLORS.primary} />
                <StatCard icon="🟢" label="Online" value={MOCK_SYSTEM.cameras.filter(c => c.online).length} color={COLORS.accent} />
                <StatCard icon="🔴" label="Offline" value={MOCK_SYSTEM.cameras.filter(c => !c.online).length} color={COLORS.danger} />
                <StatCard icon="📸" label="Images Today" value={MOCK_SYSTEM.cameras.reduce((a, c) => a + c.images_today, 0)} color={COLORS.primary} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280, 1fr))", gap: 14 }}>
                {MOCK_SYSTEM.cameras.map(cam => (
                  <div key={cam.id} style={{
                    background: "#fff", borderRadius: 14, overflow: "hidden",
                    border: `1px solid ${cam.online ? COLORS.border : COLORS.danger}`,
                    opacity: cam.online ? 1 : 0.75
                  }}>
                    {/* Camera Preview */}
                    <div style={{
                      height: 140, background: cam.online
                        ? "linear-gradient(135deg, #1a472a 0%, #2d5a3f 50%, #1e3a2f 100%)"
                        : "linear-gradient(135deg, #374151 0%, #1f2937 100%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative"
                    }}>
                      <span style={{ fontSize: 40, opacity: 0.5 }}>📷</span>
                      <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: cam.online ? "#22c55e" : "#ef4444", boxShadow: `0 0 6px ${cam.online ? "#22c55e" : "#ef4444"}` }} />
                        <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{cam.online ? "LIVE" : "OFFLINE"}</span>
                      </div>
                      <div style={{ position: "absolute", top: 10, right: 10, fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{cam.serial}</div>
                      <div style={{ position: "absolute", bottom: 10, left: 10, fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Last: {cam.lastImage}</div>
                    </div>
                    {/* Camera Info */}
                    <div style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>{cam.serial}</span>
                        <span style={{ fontSize: 11, color: COLORS.textMuted }}>{cam.images_today} shots today</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: COLORS.textMuted }}>🔋</span>
                        <div style={{ flex: 1, height: 6, background: COLORS.borderLight, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 3,
                            width: `${cam.battery}%`,
                            background: cam.battery > 30 ? COLORS.accent : cam.battery > 15 ? COLORS.warning : COLORS.danger
                          }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: cam.battery > 30 ? COLORS.accent : COLORS.danger }}>{cam.battery}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ DETECTIONS TAB ============ */}
          {activeTab === "detections" && (
            <div>
              <h2 style={{ margin: "0 0 20px", fontSize: 20, color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>🔬 Disease Detections</h2>

              <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
                <StatCard icon="🚨" label="Critical" value={MOCK_DETECTIONS.filter(d => d.severity === "critical").length} color={COLORS.danger} />
                <StatCard icon="🔴" label="High" value={MOCK_DETECTIONS.filter(d => d.severity === "high").length} color="#dc2626" />
                <StatCard icon="🟠" label="Medium" value={MOCK_DETECTIONS.filter(d => d.severity === "medium").length} color={COLORS.warning} />
                <StatCard icon="🟢" label="Low" value={MOCK_DETECTIONS.filter(d => d.severity === "low").length} color={COLORS.accent} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: selectedDetection ? "1fr 1fr" : "1fr", gap: 16 }}>
                {/* Detection List */}
                <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
                  {MOCK_DETECTIONS.map(d => (
                    <div key={d.id} onClick={() => setSelectedDetection(d)} style={{
                      padding: "16px 20px", borderBottom: `1px solid ${COLORS.borderLight}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                      background: selectedDetection?.id === d.id ? COLORS.accentLight : d.acknowledged ? "#fff" : "#fffbeb",
                      transition: "background 0.15s"
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: d.severity === "critical" ? COLORS.dangerLight : d.severity === "high" ? "#fee2e2" : d.severity === "medium" ? COLORS.warningLight : COLORS.accentLight,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0
                      }}>
                        {d.category === "Fungal" ? "🍄" : d.category === "Pest" ? "🐛" : "🦠"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{d.disease}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{d.crop} • {d.time} • {(d.confidence * 100).toFixed(0)}%</div>
                      </div>
                      <SeverityBadge severity={d.severity} />
                    </div>
                  ))}
                </div>

                {/* Detection Detail */}
                {selectedDetection && (
                  <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px", fontSize: 18, color: COLORS.primary }}>{selectedDetection.disease}</h3>
                        <div style={{ fontSize: 12, color: COLORS.textMuted }}>{selectedDetection.category} • {selectedDetection.crop} • {selectedDetection.time}</div>
                      </div>
                      <SeverityBadge severity={selectedDetection.severity} />
                    </div>

                    {/* Detection Image Placeholder */}
                    <div style={{
                      height: 180, borderRadius: 12, marginBottom: 16,
                      background: "linear-gradient(135deg, #1a472a, #2d5a3f)",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
                        <span style={{ fontSize: 40 }}>🔬</span>
                        <div style={{ fontSize: 12, marginTop: 6 }}>Detection Image</div>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: COLORS.textMuted }}>AI Confidence</span>
                        <span style={{ fontWeight: 700 }}>{(selectedDetection.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 8, background: COLORS.borderLight, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${selectedDetection.confidence * 100}%`, background: COLORS.accent, borderRadius: 4 }} />
                      </div>
                    </div>

                    {/* Treatment */}
                    <div style={{
                      background: "#f0fdf4", borderRadius: 12, padding: 16, marginBottom: 16,
                      border: "1px solid #bbf7d0"
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>💊 Recommended Treatment</div>
                      <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{selectedDetection.treatment}</div>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button style={{
                        flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                        background: COLORS.primary, color: "#fff", fontWeight: 700, fontSize: 12,
                        fontFamily: "'DM Sans', sans-serif"
                      }}>✅ Mark Treated</button>
                      <button style={{
                        flex: 1, padding: "10px 16px", borderRadius: 10, cursor: "pointer",
                        background: "#fff", color: COLORS.text, fontWeight: 700, fontSize: 12,
                        border: `1px solid ${COLORS.border}`, fontFamily: "'DM Sans', sans-serif"
                      }}>📄 Export Report</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ SENSORS TAB ============ */}
          {activeTab === "sensors" && (
            <div>
              <h2 style={{ margin: "0 0 20px", fontSize: 20, color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>🌡️ Sensor Readings</h2>

              {/* Live Values */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                {[
                  { icon: "🌡️", label: "Temperature", value: `${MOCK_SENSORS[MOCK_SENSORS.length-1].temp.toFixed(1)}°C`, color: "#e65100", key: "temp" },
                  { icon: "💧", label: "Humidity", value: `${MOCK_SENSORS[MOCK_SENSORS.length-1].humidity.toFixed(0)}%`, color: "#0277bd", key: "humidity" },
                  { icon: "🌱", label: "Soil Moisture", value: `${MOCK_SENSORS[MOCK_SENSORS.length-1].soil.toFixed(0)}%`, color: "#2e7d32", key: "soil" },
                  { icon: "☀️", label: "Light", value: `${MOCK_SENSORS[MOCK_SENSORS.length-1].light.toFixed(0)} lux`, color: "#f57f17", key: "light" }
                ].map(s => (
                  <div key={s.key} onClick={() => setSensorView(s.key === "temp" ? "temperature" : s.key)}
                    style={{
                      background: "#fff", borderRadius: 14, padding: 20, cursor: "pointer",
                      border: `2px solid ${sensorView === s.key || (sensorView === "temperature" && s.key === "temp") ? s.color : COLORS.border}`,
                      transition: "all 0.15s"
                    }}>
                    <span style={{ fontSize: 28 }}>{s.icon}</span>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 8 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{s.label}</div>
                    <MiniChart data={MOCK_SENSORS.slice(-12)} dataKey={s.key === "temp" ? "temp" : s.key} color={s.color} height={40} />
                  </div>
                ))}
              </div>

              {/* Detailed Chart */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>
                  📈 24-Hour Trend
                </div>
                <MiniChart data={MOCK_SENSORS} dataKey={sensorView === "temperature" ? "temp" : sensorView} color={
                  sensorView === "temperature" ? "#e65100" : sensorView === "humidity" ? "#0277bd" : sensorView === "soil" ? "#2e7d32" : "#f57f17"
                } height={160} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: COLORS.textMuted, marginTop: 6 }}>
                  {MOCK_SENSORS.filter((_, i) => i % 4 === 0).map(s => <span key={s.hour}>{s.hour}</span>)}
                </div>
                <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 16 }}>
                  {["Min", "Avg", "Max"].map(stat => {
                    const key = sensorView === "temperature" ? "temp" : sensorView;
                    const vals = MOCK_SENSORS.map(s => s[key]);
                    const val = stat === "Min" ? Math.min(...vals) : stat === "Max" ? Math.max(...vals) : vals.reduce((a, b) => a + b) / vals.length;
                    return (
                      <div key={stat} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{stat}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary }}>{val.toFixed(1)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============ FARM MAP TAB ============ */}
          {activeTab === "map" && (
            <div>
              <h2 style={{ margin: "0 0 20px", fontSize: 20, color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>🗺️ Farm Map</h2>
              <div style={{
                background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`,
                overflow: "hidden"
              }}>
                <div style={{
                  height: 500, background: "linear-gradient(145deg, #e8f5e9, #c8e6c9, #a5d6a7)",
                  position: "relative", display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {/* Farm boundary */}
                  <div style={{
                    width: "70%", height: "70%", border: "3px dashed #43a047",
                    borderRadius: 20, position: "relative", background: "rgba(76,175,80,0.08)"
                  }}>
                    {/* Hub */}
                    <div style={{
                      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                      width: 50, height: 50, borderRadius: "50%", background: COLORS.primary,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 0 8px rgba(30,58,47,0.2), 0 0 0 16px rgba(30,58,47,0.08)",
                      zIndex: 10, cursor: "pointer"
                    }} title="Central Hub">
                      <span style={{ color: "#fff", fontSize: 20 }}>🏠</span>
                    </div>
                    {/* Camera Nodes */}
                    {MOCK_SYSTEM.cameras.map((cam, i) => {
                      const angle = (i / MOCK_SYSTEM.cameras.length) * Math.PI * 2;
                      const x = 50 + Math.cos(angle) * 37;
                      const y = 50 + Math.sin(angle) * 37;
                      return (
                        <div key={cam.id} style={{
                          position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)",
                          zIndex: 5, cursor: "pointer"
                        }} title={`${cam.serial} — ${cam.online ? "Online" : "Offline"} — ${cam.battery}%`}>
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%",
                            background: cam.online ? COLORS.accent : COLORS.danger,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: `0 0 0 ${cam.online ? "20px rgba(22,163,74,0.08)" : "4px rgba(239,68,68,0.2)"}`,
                          }}>
                            <span style={{ fontSize: 14, color: "#fff" }}>📷</span>
                          </div>
                          <div style={{
                            position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)",
                            fontSize: 9, fontWeight: 700, color: cam.online ? COLORS.primary : COLORS.danger,
                            whiteSpace: "nowrap", background: "rgba(255,255,255,0.9)", padding: "1px 6px", borderRadius: 4
                          }}>{cam.serial}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ position: "absolute", bottom: 16, left: 16, background: "rgba(255,255,255,0.9)", padding: "8px 14px", borderRadius: 8, fontSize: 11 }}>
                    <span style={{ fontWeight: 700 }}>📍 {selectedFarm.lat.toFixed(3)}, {selectedFarm.lng.toFixed(3)}</span>
                    <span style={{ color: COLORS.textMuted }}> • {selectedFarm.area} ha</span>
                  </div>
                  <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.9)", padding: "8px 14px", borderRadius: 8, fontSize: 11 }}>
                    🏠 Hub • <span style={{ color: COLORS.accent }}>📷 Online</span> • <span style={{ color: COLORS.danger }}>📷 Offline</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ REPORTS TAB ============ */}
          {activeTab === "reports" && (
            <div>
              <h2 style={{ margin: "0 0 20px", fontSize: 20, color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>📄 Reports</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300, 1fr))", gap: 16 }}>
                {[
                  { icon: "📊", title: "Weekly Farm Report", desc: "Overview of detections, sensor averages, and system status", period: "This Week", ready: true },
                  { icon: "🔬", title: "Disease Analysis", desc: "Detailed breakdown of all detections with treatment effectiveness", period: "Last 30 Days", ready: true },
                  { icon: "🌡️", title: "Sensor History", desc: "Temperature, humidity, soil moisture trends and anomalies", period: "Last 30 Days", ready: true },
                  { icon: "📷", title: "Camera Performance", desc: "Uptime, image quality, and coverage analysis per camera", period: "This Month", ready: false },
                  { icon: "💰", title: "ROI Report", desc: "Estimated savings from early disease detection", period: "This Season", ready: false },
                  { icon: "📋", title: "Insurance Report", desc: "Timestamped detection logs for insurance claims", period: "Custom", ready: true },
                ].map((r, i) => (
                  <div key={i} style={{
                    background: "#fff", borderRadius: 14, padding: 20,
                    border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between"
                  }}>
                    <div>
                      <span style={{ fontSize: 28 }}>{r.icon}</span>
                      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginTop: 8 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.5 }}>{r.desc}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>📅 {r.period}</div>
                    </div>
                    <button style={{
                      marginTop: 14, padding: "10px 16px", borderRadius: 10, border: "none", cursor: r.ready ? "pointer" : "default",
                      background: r.ready ? COLORS.primary : COLORS.borderLight,
                      color: r.ready ? "#fff" : COLORS.textMuted, fontWeight: 700, fontSize: 12,
                      fontFamily: "'DM Sans', sans-serif", opacity: r.ready ? 1 : 0.6
                    }}>
                      {r.ready ? "📥 Download PDF" : "Coming Soon"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ SETTINGS TAB ============ */}
          {activeTab === "settings" && (
            <div>
              <h2 style={{ margin: "0 0 20px", fontSize: 20, color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>⚙️ Settings</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Profile */}
                <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>👤 Profile</div>
                  {[
                    { label: "Name", value: MOCK_FARMER.name },
                    { label: "Email", value: MOCK_FARMER.email },
                    { label: "Country", value: MOCK_FARMER.country },
                    { label: "Language", value: "English" },
                    { label: "Plan", value: MOCK_FARMER.plan }
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.borderLight}`, fontSize: 13 }}>
                      <span style={{ color: COLORS.textMuted }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: COLORS.text }}>{item.value}</span>
                    </div>
                  ))}
                  <button style={{
                    marginTop: 14, padding: "10px 20px", borderRadius: 10, border: `1px solid ${COLORS.border}`,
                    background: "#fff", color: COLORS.primary, fontWeight: 700, fontSize: 12, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif"
                  }}>Edit Profile</button>
                </div>

                {/* Alert Settings */}
                <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>🔔 Alert Thresholds</div>
                  {[
                    { label: "Max Temperature", value: "45°C", icon: "🌡️" },
                    { label: "Min Temperature", value: "-5°C", icon: "❄️" },
                    { label: "Max Humidity", value: "90%", icon: "💧" },
                    { label: "Min Soil Moisture", value: "15%", icon: "🌱" },
                    { label: "Min Battery", value: "15%", icon: "🔋" }
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${COLORS.borderLight}`, fontSize: 13 }}>
                      <span style={{ color: COLORS.textMuted }}>{item.icon} {item.label}</span>
                      <span style={{ fontWeight: 600, color: COLORS.text }}>{item.value}</span>
                    </div>
                  ))}
                  <button style={{
                    marginTop: 14, padding: "10px 20px", borderRadius: 10, border: `1px solid ${COLORS.border}`,
                    background: "#fff", color: COLORS.primary, fontWeight: 700, fontSize: 12, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif"
                  }}>Customize Alerts</button>
                </div>

                {/* System Info */}
                <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>🖥️ System</div>
                  {[
                    { label: "Hub Serial", value: MOCK_SYSTEM.hub_serial },
                    { label: "Firmware", value: `v${MOCK_SYSTEM.firmware}` },
                    { label: "Cameras", value: `${MOCK_SYSTEM.cameras.length} deployed` },
                    { label: "WiFi Repeaters", value: "0" },
                    { label: "Storage Used", value: `${MOCK_SYSTEM.storage} GB / 256 GB` }
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.borderLight}`, fontSize: 13 }}>
                      <span style={{ color: COLORS.textMuted }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: COLORS.text }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Privacy */}
                <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>🔒 Privacy & Data</div>
                  {[
                    { label: "Data sharing with partners", checked: true },
                    { label: "Marketing emails", checked: false },
                    { label: "WhatsApp notifications", checked: true },
                    { label: "Push notifications (browser)", checked: true },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
                      <span style={{ fontSize: 13, color: COLORS.text }}>{item.label}</span>
                      <div style={{
                        width: 40, height: 22, borderRadius: 11, cursor: "pointer",
                        background: item.checked ? COLORS.accent : COLORS.border, position: "relative",
                        transition: "background 0.2s"
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", background: "#fff",
                          position: "absolute", top: 2, left: item.checked ? 20 : 2,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s"
                        }} />
                      </div>
                    </div>
                  ))}
                  <button style={{
                    marginTop: 14, padding: "10px 20px", borderRadius: 10, border: `1px solid ${COLORS.danger}`,
                    background: "#fff", color: COLORS.danger, fontWeight: 700, fontSize: 12, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif"
                  }}>🗑️ Delete Account</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

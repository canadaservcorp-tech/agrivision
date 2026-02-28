"use client";

import { useState } from "react";

// ============================================================
// MOCK DATA — Admin View
// ============================================================
const MOCK_METRICS = {
  farmers: 347, farms: 412, systems: 289, online: 251,
  orders: 198, revenue: 142650, monthRevenue: 18420,
  cameras_deployed: 2312, detections_30d: 4891, countries: 12
};

const MOCK_COUNTRIES = [
  { country: "🇦🇪 UAE", farmers: 87, farms: 102, revenue: 38200 },
  { country: "🇸🇦 Saudi Arabia", farmers: 64, farms: 78, revenue: 29100 },
  { country: "🇹🇷 Turkey", farmers: 52, farms: 61, revenue: 22400 },
  { country: "🇪🇬 Egypt", farmers: 41, farms: 48, revenue: 15600 },
  { country: "🇯🇴 Jordan", farmers: 28, farms: 33, revenue: 11200 },
  { country: "🇲🇦 Morocco", farmers: 24, farms: 29, revenue: 9800 },
  { country: "🇱🇧 Lebanon", farmers: 19, farms: 22, revenue: 7400 },
  { country: "🇶🇦 Qatar", farmers: 12, farms: 14, revenue: 5200 },
  { country: "🇰🇼 Kuwait", farmers: 8, farms: 10, revenue: 3600 },
  { country: "🇨🇦 Canada", farmers: 6, farms: 8, revenue: 2400 },
];

const MOCK_TOP_CROPS = [
  { name: "Olive", category: "fruits", farms: 89, area: 342.5, icon: "🫒" },
  { name: "Date Palm", category: "fruits", farms: 76, area: 285.0, icon: "🌴" },
  { name: "Tomato", category: "vegetables", farms: 68, area: 124.3, icon: "🍅" },
  { name: "Wheat", category: "grains", farms: 54, area: 410.2, icon: "🌾" },
  { name: "Grape", category: "fruits", farms: 42, area: 98.6, icon: "🍇" },
  { name: "Cucumber", category: "vegetables", farms: 38, area: 67.1, icon: "🥒" },
  { name: "Pepper", category: "vegetables", farms: 35, area: 54.8, icon: "🌶️" },
  { name: "Orange", category: "fruits", farms: 31, area: 112.4, icon: "🍊" },
  { name: "Cotton", category: "industrial", farms: 22, area: 320.0, icon: "☁️" },
  { name: "Coffee", category: "industrial", farms: 15, area: 45.0, icon: "☕" },
];

const MOCK_DISEASES = [
  { disease: "Olive Leaf Spot", detections: 342, severity: "high", region: "MENA" },
  { disease: "Tomato Early Blight", detections: 287, severity: "medium", region: "Global" },
  { disease: "Date Palm Scale", detections: 198, severity: "medium", region: "Gulf" },
  { disease: "Powdery Mildew", detections: 176, severity: "low", region: "Global" },
  { disease: "Bayoud Disease", detections: 45, severity: "critical", region: "MENA" },
  { disease: "Citrus Canker", detections: 89, severity: "high", region: "Mediterranean" },
];

const MOCK_ORDERS = [
  { ref: "AGV-A3F7C1", farmer: "Ahmed Al-Rashidi", country: "🇦🇪 UAE", cameras: 8, total: 685, status: "delivered", date: "2026-02-25" },
  { ref: "AGV-B8D2E4", farmer: "Mehmet Yilmaz", country: "🇹🇷 Turkey", cameras: 12, total: 809, status: "shipped", date: "2026-02-24" },
  { ref: "AGV-C1F5A9", farmer: "Omar Hassan", country: "🇪🇬 Egypt", cameras: 6, total: 623, status: "paid", date: "2026-02-23" },
  { ref: "AGV-D4E8B2", farmer: "Khalid Al-Saud", country: "🇸🇦 Saudi", cameras: 15, total: 1046, status: "processing", date: "2026-02-22" },
  { ref: "AGV-E7F3C6", farmer: "Youssef Mansour", country: "🇱🇧 Lebanon", cameras: 4, total: 561, status: "paid", date: "2026-02-21" },
  { ref: "AGV-F2A9D1", farmer: "Fatima Benali", country: "🇲🇦 Morocco", cameras: 10, total: 747, status: "pending", date: "2026-02-20" },
];

const MOCK_FARMERS_LIST = [
  { id: 1, name: "Ahmed Al-Rashidi", email: "ahmed@farm.ae", phone: "+971501234567", country: "🇦🇪 UAE", crops: ["Olive", "Date Palm", "Tomato"], area: 5.2, consent: true, joined: "2026-01-15", active: "2h ago" },
  { id: 2, name: "Mehmet Yilmaz", email: "mehmet@ciftlik.tr", phone: "+905321234567", country: "🇹🇷 Turkey", crops: ["Grape", "Olive", "Wheat"], area: 8.4, consent: true, joined: "2026-01-18", active: "5h ago" },
  { id: 3, name: "Omar Hassan", email: "omar@mazraa.eg", phone: "+201012345678", country: "🇪🇬 Egypt", crops: ["Cotton", "Wheat", "Tomato"], area: 12.0, consent: false, joined: "2026-01-22", active: "1d ago" },
  { id: 4, name: "Khalid Al-Saud", email: "khalid@farm.sa", phone: "+966501234567", country: "🇸🇦 Saudi", crops: ["Date Palm", "Wheat"], area: 20.5, consent: true, joined: "2026-02-01", active: "3h ago" },
  { id: 5, name: "Youssef Mansour", email: "youssef@farm.lb", phone: "+9613456789", country: "🇱🇧 Lebanon", crops: ["Olive", "Grape", "Orange"], area: 3.1, consent: true, joined: "2026-02-05", active: "12h ago" },
  { id: 6, name: "Fatima Benali", email: "fatima@ferme.ma", phone: "+212612345678", country: "🇲🇦 Morocco", crops: ["Orange", "Olive"], area: 4.8, consent: true, joined: "2026-02-10", active: "6h ago" },
  { id: 7, name: "Ali Al-Thani", email: "ali@qatarfarm.qa", phone: "+97433123456", country: "🇶🇦 Qatar", crops: ["Date Palm", "Tomato", "Pepper"], area: 2.5, consent: true, joined: "2026-02-12", active: "1d ago" },
  { id: 8, name: "Ibrahim Demir", email: "ibrahim@tarim.tr", phone: "+905421234567", country: "🇹🇷 Turkey", crops: ["Wheat", "Cotton", "Soybean"], area: 15.0, consent: false, joined: "2026-02-14", active: "4h ago" },
];

// ============================================================
// STYLES
// ============================================================
const C = {
  bg: "#0f1419", card: "#1a2332", cardHover: "#1e2940",
  primary: "#3b82f6", accent: "#10b981", warning: "#f59e0b", danger: "#ef4444",
  text: "#e2e8f0", textMuted: "#94a3b8", border: "#2d3748",
  surface: "#151e2b"
};

// ============================================================
// ADMIN PANEL
// ============================================================

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  const sections = [
    { id: "overview", icon: "📊", label: "Overview" },
    { id: "farmers", icon: "👥", label: "Farmers" },
    { id: "orders", icon: "📦", label: "Orders" },
    { id: "crops", icon: "🌾", label: "Crop Intelligence" },
    { id: "diseases", icon: "🔬", label: "Disease Map" },
    { id: "revenue", icon: "💰", label: "Revenue" },
    { id: "systems", icon: "🖥️", label: "Systems" },
    { id: "b2b", icon: "🏢", label: "B2B Data" },
  ];

  const statusColor = (s) => ({ delivered: C.accent, shipped: C.primary, paid: "#8b5cf6", processing: C.warning, pending: C.textMuted, cancelled: C.danger }[s] || C.textMuted);

  const MetricCard = ({ icon, label, value, sub, color }) => (
    <div style={{ background: C.card, borderRadius: 14, padding: "18px 20px", border: `1px solid ${C.border}`, flex: 1, minWidth: 140 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: color || C.text }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
        </div>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
    </div>
  );

  const BarChart = ({ data, valueKey, labelKey, color, max }) => {
    const maxVal = max || Math.max(...data.map(d => d[valueKey]));
    return (
      <div style={{ display: "grid", gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: C.textMuted, width: 120, textAlign: "right", flexShrink: 0 }}>{d[labelKey]}</span>
            <div style={{ flex: 1, height: 20, background: C.surface, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(d[valueKey] / maxVal) * 100}%`, background: `${color}cc`, borderRadius: 4, transition: "width 0.5s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text, width: 50, flexShrink: 0 }}>{typeof d[valueKey] === "number" && d[valueKey] > 999 ? `${(d[valueKey]/1000).toFixed(1)}k` : d[valueKey]}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* TOP BAR */}
      <div style={{
        background: C.surface, padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 52, borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🌱</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>AgriVision</span>
          <span style={{ background: C.primary, color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, letterSpacing: 1 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            {MOCK_METRICS.online}/{MOCK_METRICS.systems} systems online •
            <span style={{ color: C.accent }}> All services operational</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>H</div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Hicham</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 52px)" }}>
        {/* SIDEBAR */}
        <div style={{ width: 190, background: C.surface, borderRight: `1px solid ${C.border}`, padding: "12px 8px", flexShrink: 0 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeSection === s.id ? "rgba(59,130,246,0.15)" : "transparent",
              color: activeSection === s.id ? C.primary : C.textMuted,
              fontWeight: activeSection === s.id ? 700 : 500, fontSize: 12,
              fontFamily: "'DM Sans', sans-serif", marginBottom: 1, transition: "all 0.1s"
            }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>

          {/* ============ OVERVIEW ============ */}
          {activeSection === "overview" && (
            <div>
              <h1 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>Dashboard Overview</h1>

              <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                <MetricCard icon="👥" label="Farmers" value={MOCK_METRICS.farmers} sub={`${MOCK_METRICS.countries} countries`} color={C.primary} />
                <MetricCard icon="🌾" label="Farms" value={MOCK_METRICS.farms} sub={`${MOCK_METRICS.cameras_deployed} cameras`} color={C.accent} />
                <MetricCard icon="🖥️" label="Systems Online" value={`${MOCK_METRICS.online}/${MOCK_METRICS.systems}`} sub={`${((MOCK_METRICS.online/MOCK_METRICS.systems)*100).toFixed(0)}% uptime`} color={C.accent} />
                <MetricCard icon="📦" label="Orders" value={MOCK_METRICS.orders} color={C.warning} />
                <MetricCard icon="💰" label="Total Revenue" value={`$${(MOCK_METRICS.revenue/1000).toFixed(1)}k`} sub={`$${(MOCK_METRICS.monthRevenue/1000).toFixed(1)}k this month`} color={C.accent} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {/* Top Countries */}
                <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>🌍 Farmers by Country</div>
                  <BarChart data={MOCK_COUNTRIES.slice(0, 8)} valueKey="farmers" labelKey="country" color={C.primary} />
                </div>

                {/* Top Crops */}
                <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>🌾 Top Crops (by farm count)</div>
                  <BarChart data={MOCK_TOP_CROPS.slice(0, 8)} valueKey="farms" labelKey="name" color={C.accent} />
                </div>
              </div>

              {/* Recent Orders */}
              <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>📦 Recent Orders</span>
                  <button onClick={() => setActiveSection("orders")} style={{ background: "none", border: "none", color: C.primary, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>View All →</button>
                </div>
                <div style={{ fontSize: 10, color: C.textMuted, display: "grid", gridTemplateColumns: "100px 1fr 80px 60px 80px 90px 90px", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <span>Reference</span><span>Farmer</span><span>Country</span><span>Cams</span><span>Total</span><span>Status</span><span>Date</span>
                </div>
                {MOCK_ORDERS.map((o, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px 60px 80px 90px 90px", gap: 8, padding: "10px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 12, alignItems: "center" }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.primary }}>{o.ref}</span>
                    <span style={{ fontWeight: 600 }}>{o.farmer}</span>
                    <span style={{ fontSize: 11 }}>{o.country}</span>
                    <span>{o.cameras}</span>
                    <span style={{ fontWeight: 700 }}>${o.total}</span>
                    <span style={{ color: statusColor(o.status), fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{o.status}</span>
                    <span style={{ color: C.textMuted, fontSize: 11 }}>{o.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ FARMERS ============ */}
          {activeSection === "farmers" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>👥 Farmer Database</h1>
                <div style={{ display: "flex", gap: 10 }}>
                  <input placeholder="🔍 Search farmers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 12, width: 220, fontFamily: "'DM Sans', sans-serif" }} />
                  <button style={{ background: C.primary, border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📥 Export CSV</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {["All", ...MOCK_COUNTRIES.slice(0, 6).map(c => c.country)].map(c => (
                  <button key={c} style={{
                    background: c === "All" ? C.primary : C.card, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: "5px 12px", color: c === "All" ? "#fff" : C.textMuted,
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                  }}>{c}</button>
                ))}
              </div>

              {/* Farmer Table */}
              <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ fontSize: 10, color: C.textMuted, display: "grid", gridTemplateColumns: "2fr 2fr 1fr 2fr 1fr 80px 80px", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <span>Farmer</span><span>Email</span><span>Country</span><span>Crops</span><span>Area</span><span>Consent</span><span>Active</span>
                </div>
                {MOCK_FARMERS_LIST.filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.email.toLowerCase().includes(searchQuery.toLowerCase())).map(f => (
                  <div key={f.id} onClick={() => setSelectedFarmer(selectedFarmer?.id === f.id ? null : f)}
                    style={{
                      display: "grid", gridTemplateColumns: "2fr 2fr 1fr 2fr 1fr 80px 80px", gap: 8,
                      padding: "12px 16px", borderBottom: `1px solid ${C.border}22`, fontSize: 12,
                      cursor: "pointer", alignItems: "center",
                      background: selectedFarmer?.id === f.id ? "rgba(59,130,246,0.08)" : "transparent",
                      transition: "background 0.1s"
                    }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>{f.phone}</div>
                    </div>
                    <span style={{ color: C.textMuted, fontSize: 11 }}>{f.email}</span>
                    <span style={{ fontSize: 11 }}>{f.country}</span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {f.crops.map(c => <span key={c} style={{ background: C.surface, padding: "2px 8px", borderRadius: 4, fontSize: 10, color: C.accent }}>{c}</span>)}
                    </div>
                    <span>{f.area} ha</span>
                    <span style={{ color: f.consent ? C.accent : C.danger, fontWeight: 700, fontSize: 11 }}>{f.consent ? "✅ Yes" : "❌ No"}</span>
                    <span style={{ color: C.textMuted, fontSize: 10 }}>{f.active}</span>
                  </div>
                ))}
              </div>

              {/* Farmer Detail */}
              {selectedFarmer && (
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#fff" }}>{selectedFarmer.name}</h3>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{selectedFarmer.email} • {selectedFarmer.phone} • {selectedFarmer.country}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>💬 WhatsApp</button>
                      <button style={{ background: C.primary, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>📧 Email</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 16 }}>
                    <div style={{ background: C.surface, borderRadius: 10, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.primary }}>{selectedFarmer.area}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>Hectares</div>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 10, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{selectedFarmer.crops.length}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>Crops</div>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 10, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.warning }}>8</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>Cameras</div>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 10, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{selectedFarmer.joined}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>Joined</div>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 10, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: selectedFarmer.consent ? C.accent : C.danger }}>{selectedFarmer.consent ? "✅" : "❌"}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>Data Consent</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, fontSize: 11, color: C.textMuted, textAlign: "center" }}>
                Showing {MOCK_FARMERS_LIST.length} of {MOCK_METRICS.farmers} farmers • Page 1 of {Math.ceil(MOCK_METRICS.farmers / 25)}
              </div>
            </div>
          )}

          {/* ============ ORDERS ============ */}
          {activeSection === "orders" && (
            <div>
              <h1 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>📦 Orders</h1>
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <MetricCard icon="📦" label="Total Orders" value={MOCK_METRICS.orders} color={C.primary} />
                <MetricCard icon="✅" label="Delivered" value="142" color={C.accent} />
                <MetricCard icon="🚚" label="In Transit" value="31" color={C.warning} />
                <MetricCard icon="⏳" label="Pending" value="25" color={C.textMuted} />
              </div>
              <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ fontSize: 10, color: C.textMuted, display: "grid", gridTemplateColumns: "100px 1fr 80px 60px 80px 90px 90px 100px", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <span>Reference</span><span>Farmer</span><span>Country</span><span>Cams</span><span>Total</span><span>Status</span><span>Date</span><span>Action</span>
                </div>
                {MOCK_ORDERS.map((o, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px 60px 80px 90px 90px 100px", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${C.border}22`, fontSize: 12, alignItems: "center" }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.primary }}>{o.ref}</span>
                    <span style={{ fontWeight: 600 }}>{o.farmer}</span>
                    <span style={{ fontSize: 11 }}>{o.country}</span>
                    <span>{o.cameras}</span>
                    <span style={{ fontWeight: 700 }}>${o.total}</span>
                    <span style={{ color: statusColor(o.status), fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>{o.status}</span>
                    <span style={{ color: C.textMuted, fontSize: 11 }}>{o.date}</span>
                    <select style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 10, padding: "4px", cursor: "pointer" }}>
                      <option>Update...</option>
                      <option>Processing</option>
                      <option>Shipped</option>
                      <option>Delivered</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ CROP INTELLIGENCE ============ */}
          {activeSection === "crops" && (
            <div>
              <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>🌾 Crop Intelligence</h1>
              <p style={{ margin: "0 0 24px", fontSize: 12, color: C.textMuted }}>Aggregated crop data across all farms — sellable to agri-pharma companies</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>📊 Crops by Farm Count</div>
                  <BarChart data={MOCK_TOP_CROPS} valueKey="farms" labelKey="name" color={C.accent} />
                </div>
                <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>📐 Crops by Total Area (ha)</div>
                  <BarChart data={MOCK_TOP_CROPS} valueKey="area" labelKey="name" color={C.primary} />
                </div>
              </div>

              {/* Crop Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                {MOCK_TOP_CROPS.map((c, i) => (
                  <div key={i} style={{ background: C.card, borderRadius: 12, padding: 16, border: `1px solid ${C.border}`, textAlign: "center" }}>
                    <span style={{ fontSize: 32 }}>{c.icon}</span>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{c.category}</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
                      <div><div style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{c.farms}</div><div style={{ fontSize: 9, color: C.textMuted }}>Farms</div></div>
                      <div><div style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>{c.area}</div><div style={{ fontSize: 9, color: C.textMuted }}>Hectares</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ DISEASE MAP ============ */}
          {activeSection === "diseases" && (
            <div>
              <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>🔬 Disease Intelligence</h1>
              <p style={{ margin: "0 0 24px", fontSize: 12, color: C.textMuted }}>Disease prevalence data across all farms — last 90 days</p>

              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <MetricCard icon="🔬" label="Total Detections" value={MOCK_METRICS.detections_30d} sub="Last 30 days" color={C.warning} />
                <MetricCard icon="🚨" label="Critical" value="45" color={C.danger} />
                <MetricCard icon="🍄" label="Fungal" value="58%" color="#a855f7" />
                <MetricCard icon="🐛" label="Pest" value="27%" color={C.warning} />
              </div>

              <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ fontSize: 10, color: C.textMuted, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <span>Disease</span><span>Detections</span><span>Severity</span><span>Region</span><span>Trend</span>
                </div>
                {MOCK_DISEASES.map((d, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "14px 16px", borderBottom: `1px solid ${C.border}22`, fontSize: 12, alignItems: "center" }}>
                    <span style={{ fontWeight: 700 }}>{d.disease}</span>
                    <span style={{ fontWeight: 700, color: C.warning }}>{d.detections}</span>
                    <span style={{
                      color: d.severity === "critical" ? C.danger : d.severity === "high" ? "#f87171" : d.severity === "medium" ? C.warning : C.accent,
                      fontWeight: 700, textTransform: "uppercase", fontSize: 10
                    }}>{d.severity}</span>
                    <span style={{ color: C.textMuted }}>{d.region}</span>
                    <span style={{ color: C.danger, fontSize: 11 }}>↑ {Math.floor(Math.random() * 20 + 5)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ REVENUE ============ */}
          {activeSection === "revenue" && (
            <div>
              <h1 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>💰 Revenue</h1>
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <MetricCard icon="💰" label="Total Revenue" value={`$${(MOCK_METRICS.revenue/1000).toFixed(1)}k`} color={C.accent} />
                <MetricCard icon="📈" label="This Month" value={`$${(MOCK_METRICS.monthRevenue/1000).toFixed(1)}k`} sub="+24% vs last month" color={C.primary} />
                <MetricCard icon="🧾" label="Avg Order" value={`$${Math.round(MOCK_METRICS.revenue / MOCK_METRICS.orders)}`} color={C.warning} />
                <MetricCard icon="📦" label="Avg Cameras/Order" value="8.2" color={C.text} />
              </div>

              <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>💵 Revenue by Country</div>
                <BarChart data={MOCK_COUNTRIES} valueKey="revenue" labelKey="country" color={C.accent} />
              </div>

              {/* Monthly Trend */}
              <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>📈 Monthly Revenue Trend</div>
                <div style={{ display: "flex", alignItems: "end", gap: 8, height: 140 }}>
                  {[4200, 6800, 9400, 12100, 14500, 16300, 18420].map((v, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 10, color: C.textMuted }}>${(v/1000).toFixed(1)}k</span>
                      <div style={{
                        width: "100%", borderRadius: "4px 4px 0 0",
                        background: i === 6 ? C.accent : `${C.primary}80`,
                        height: `${(v / 18420) * 100}%`, minHeight: 8
                      }} />
                      <span style={{ fontSize: 9, color: C.textMuted }}>
                        {["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============ B2B DATA ============ */}
          {activeSection === "b2b" && (
            <div>
              <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>🏢 B2B Data Marketplace</h1>
              <p style={{ margin: "0 0 24px", fontSize: 12, color: C.textMuted }}>Aggregated, anonymized farm data for agri-pharma companies</p>

              <div style={{
                background: `linear-gradient(135deg, ${C.primary}, #6366f1)`, borderRadius: 14,
                padding: 24, marginBottom: 24, color: "#fff"
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Data Assets Summary</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>Ready-to-sell aggregated datasets from {MOCK_METRICS.farmers} farmers across {MOCK_METRICS.countries} countries</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {[
                    { label: "Farmer Profiles", value: `${MOCK_METRICS.farmers}`, sub: "with consent" },
                    { label: "Crop Records", value: "1,284", sub: "active crops" },
                    { label: "Disease Detections", value: `${MOCK_METRICS.detections_30d}+`, sub: "with images" },
                    { label: "Sensor Readings", value: "2.4M", sub: "data points" }
                  ].map((d, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{d.value}</div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{d.label}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{d.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { title: "Regional Crop Report", desc: "Crop distribution by country, region, area. Includes organic percentages.", price: "$500", icon: "🌾" },
                  { title: "Disease Prevalence Report", desc: "Disease frequency by region, crop, and season. AI confidence scores.", price: "$750", icon: "🔬" },
                  { title: "Farmer Directory Access", desc: "Direct farmer contact (with consent). Filter by crop, region, size.", price: "$299/mo", icon: "👥" },
                  { title: "Market Size Analysis", desc: "Total farming area, production estimates by crop and country.", price: "$1,000", icon: "📊" },
                  { title: "Treatment Effectiveness Data", desc: "Which treatments work for which diseases. Farmer feedback data.", price: "$500", icon: "💊" },
                  { title: "Custom API Access", desc: "Real-time data feed. Crop alerts, disease trends, sensor aggregation.", price: "$1,999/mo", icon: "🔗" },
                ].map((p, i) => (
                  <div key={i} style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontSize: 28 }}>{p.icon}</span>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>{p.desc}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{p.price}</span>
                      <button style={{ background: C.primary, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Generate</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ SYSTEMS ============ */}
          {activeSection === "systems" && (
            <div>
              <h1 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>🖥️ Deployed Systems</h1>
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <MetricCard icon="🖥️" label="Total Systems" value={MOCK_METRICS.systems} color={C.primary} />
                <MetricCard icon="🟢" label="Online" value={MOCK_METRICS.online} color={C.accent} />
                <MetricCard icon="🔴" label="Offline" value={MOCK_METRICS.systems - MOCK_METRICS.online} color={C.danger} />
                <MetricCard icon="📷" label="Total Cameras" value={MOCK_METRICS.cameras_deployed} color={C.warning} />
              </div>
              <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, textAlign: "center", color: C.textMuted }}>
                <span style={{ fontSize: 40 }}>🗺️</span>
                <div style={{ fontSize: 14, marginTop: 8 }}>Global System Map</div>
                <div style={{ fontSize: 12 }}>Interactive map showing all deployed systems worldwide</div>
                <div style={{ fontSize: 11, marginTop: 8, color: C.primary }}>Google Maps integration — coming with production deployment</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

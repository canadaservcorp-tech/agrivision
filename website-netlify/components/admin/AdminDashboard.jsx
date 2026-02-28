"use client";

import { useState, createContext, useContext } from "react";

// ═══ MULTI-LANGUAGE SUPPORT (Arabic, English, Turkish) ═══
const TRANSLATIONS = {
  en: {
    overview:"Overview", users:"Users", dealers:"Dealers", payments:"Payments", subscriptions:"Subscriptions",
    invoices:"Invoices", detections:"Detections", library:"Library", diseases:"Diseases",
    search:"Search", reports:"Reports", settings:"Settings", disease_analysis:"Disease Analysis",
    farmer_mgmt:"Farmer Management", admin_dashboard:"Admin Dashboard", language:"Language",
    total_users:"Total Users", active_farms:"Active Farms", total_detections:"Total Detections",
    revenue:"Revenue", critical_alerts:"Critical Alerts", active_subscriptions:"Active Subscriptions",
    farms_by_country:"Farms by Country", monthly_revenue:"Monthly Revenue",
    // Disease Analysis
    disease_overview:"Disease Overview", total_detected:"Total Detected", critical_cases:"Critical Cases",
    high_severity:"High Severity", detection_rate:"Detection Rate", disease_map:"Disease Map by Location",
    top_diseases:"Top Diseases", severity_dist:"Severity Distribution", recent_detections:"Recent Detections",
    location:"Location", severity:"Severity", crop:"Crop", date:"Date", confidence:"Confidence",
    send_alert:"Send Alert", view_details:"View Details",
    // Farmer Management
    mode_a_cctv:"Mode A (CCTV)", mode_b_monitor:"Mode B (Monitoring)", farmer_mode_dist:"Farmer Mode Distribution",
    total_farmers:"Total Farmers", send_notification:"Send Notification", send_link:"Send Link",
    farmer_name:"Farmer Name", farm_location:"Farm Location", current_mode:"Current Mode",
    last_active:"Last Active", actions:"Actions", notification_type:"Notification Type",
    update:"Update", repair:"Repair", maintenance:"Maintenance", message:"Message",
    send:"Send", cancel:"Cancel", select_farmer:"Select Farmer", select_all:"Select All",
    link_url:"Link URL", send_to_selected:"Send to Selected", farmers_selected:"farmers selected",
    // Settings
    save:"Save", language_preference:"Language Preference", select_language:"Select Language",
  },
  ar: {
    overview:"نظرة عامة", users:"المستخدمين", dealers:"الوكلاء", payments:"المدفوعات", subscriptions:"الاشتراكات",
    invoices:"الفواتير", detections:"الكشوفات", library:"المكتبة", diseases:"الأمراض",
    search:"بحث", reports:"التقارير", settings:"الإعدادات", disease_analysis:"تحليل الأمراض",
    farmer_mgmt:"إدارة المزارعين", admin_dashboard:"لوحة الإدارة", language:"اللغة",
    total_users:"إجمالي المستخدمين", active_farms:"المزارع النشطة", total_detections:"إجمالي الكشوفات",
    revenue:"الإيرادات", critical_alerts:"تنبيهات حرجة", active_subscriptions:"الاشتراكات النشطة",
    farms_by_country:"المزارع حسب الدولة", monthly_revenue:"الإيرادات الشهرية",
    disease_overview:"نظرة عامة على الأمراض", total_detected:"إجمالي المكتشف", critical_cases:"حالات حرجة",
    high_severity:"شدة عالية", detection_rate:"معدل الكشف", disease_map:"خريطة الأمراض حسب الموقع",
    top_diseases:"أهم الأمراض", severity_dist:"توزيع الشدة", recent_detections:"الكشوفات الأخيرة",
    location:"الموقع", severity:"الشدة", crop:"المحصول", date:"التاريخ", confidence:"الثقة",
    send_alert:"إرسال تنبيه", view_details:"عرض التفاصيل",
    mode_a_cctv:"الوضع أ (كاميرات)", mode_b_monitor:"الوضع ب (مراقبة)", farmer_mode_dist:"توزيع أوضاع المزارعين",
    total_farmers:"إجمالي المزارعين", send_notification:"إرسال إشعار", send_link:"إرسال رابط",
    farmer_name:"اسم المزارع", farm_location:"موقع المزرعة", current_mode:"الوضع الحالي",
    last_active:"آخر نشاط", actions:"إجراءات", notification_type:"نوع الإشعار",
    update:"تحديث", repair:"إصلاح", maintenance:"صيانة", message:"رسالة",
    send:"إرسال", cancel:"إلغاء", select_farmer:"اختر مزارع", select_all:"تحديد الكل",
    link_url:"رابط", send_to_selected:"إرسال للمحددين", farmers_selected:"مزارعين محددين",
    save:"حفظ", language_preference:"تفضيل اللغة", select_language:"اختر اللغة",
  },
  tr: {
    overview:"Genel Bakis", users:"Kullanicilar", dealers:"Bayiler", payments:"Odemeler", subscriptions:"Abonelikler",
    invoices:"Faturalar", detections:"Tespitler", library:"Kutuphane", diseases:"Hastaliklar",
    search:"Arama", reports:"Raporlar", settings:"Ayarlar", disease_analysis:"Hastalik Analizi",
    farmer_mgmt:"Ciftci Yonetimi", admin_dashboard:"Yonetim Paneli", language:"Dil",
    total_users:"Toplam Kullanici", active_farms:"Aktif Ciftlikler", total_detections:"Toplam Tespit",
    revenue:"Gelir", critical_alerts:"Kritik Uyarilar", active_subscriptions:"Aktif Abonelikler",
    farms_by_country:"Ulkeye Gore Ciftlikler", monthly_revenue:"Aylik Gelir",
    disease_overview:"Hastalik Ozeti", total_detected:"Toplam Tespit", critical_cases:"Kritik Vakalar",
    high_severity:"Yuksek Siddet", detection_rate:"Tespit Orani", disease_map:"Konuma Gore Hastalik Haritasi",
    top_diseases:"En Cok Gorulen", severity_dist:"Siddet Dagilimi", recent_detections:"Son Tespitler",
    location:"Konum", severity:"Siddet", crop:"Urun", date:"Tarih", confidence:"Guven",
    send_alert:"Uyari Gonder", view_details:"Detaylari Gor",
    mode_a_cctv:"Mod A (CCTV)", mode_b_monitor:"Mod B (Izleme)", farmer_mode_dist:"Ciftci Mod Dagilimi",
    total_farmers:"Toplam Ciftci", send_notification:"Bildirim Gonder", send_link:"Link Gonder",
    farmer_name:"Ciftci Adi", farm_location:"Ciftlik Konumu", current_mode:"Mevcut Mod",
    last_active:"Son Aktif", actions:"Islemler", notification_type:"Bildirim Turu",
    update:"Guncelleme", repair:"Onarim", maintenance:"Bakim", message:"Mesaj",
    send:"Gonder", cancel:"Iptal", select_farmer:"Ciftci Sec", select_all:"Tumunu Sec",
    link_url:"Link URL", send_to_selected:"Secilenlere Gonder", farmers_selected:"ciftci secildi",
    save:"Kaydet", language_preference:"Dil Tercihi", select_language:"Dil Secin",
  },
};

const LangContext = createContext({ lang:"en", setLang:()=>{}, t:(k)=>k });
const useLang = () => useContext(LangContext);

const API = "/api";

// ═══ MOCK DATA (remove when connected to backend) ═══
const MOCK = {
  overview: {
    users: { total: 847, farmers: 692, dealers: 48, managers: 12, active: 789, new_this_month: 34, new_this_week: 8 },
    farms: { total: 1243, active: 1187, total_cameras: 4892, active_cameras: 4201, total_hectares: 28450, by_country: [
      { country: "UAE", count: 312 }, { country: "Saudi Arabia", count: 287 }, { country: "Qatar", count: 156 },
      { country: "Turkey", count: 134 }, { country: "Egypt", count: 98 }, { country: "Morocco", count: 87 },
      { country: "Jordan", count: 62 }, { country: "Oman", count: 54 }, { country: "Kuwait", count: 28 }, { country: "Tunisia", count: 25 }
    ]},
    detections: { total: 23847, this_month: 3421, this_week: 892, critical: 127 },
    revenue: { total_all_time: 487920, this_month: 34850, this_week: 8920, pending: 4280 },
    subscriptions: { total_active: 523, mrr: 28750, trial: 89 },
    invoices: { total: 1847, unpaid: 67, overdue: 12 }
  },
  users: Array.from({length: 25}, (_, i) => ({
    id: i+1, email: `farmer${i+1}@farm.com`, first_name: ["Mohammed","Ali","Hassan","Fatima","Aisha","Youssef","Ibrahim","Khalid","Nour","Layla"][i%10],
    last_name: `Farm${i+1}`, role: i<3?"dealer":i<5?"account_manager":"farmer", status: i%8===0?"suspended":"active",
    phone: `+971${5000000+i}`, company: `${["Al","El","Abu"][i%3]} ${["Rashid","Salem","Noor"][i%3]} Farms`,
    country: ["UAE","Saudi Arabia","Qatar","Turkey","Egypt","Morocco"][i%6], region: ["North","South"][i%2],
    created_at: new Date(Date.now()-i*86400000*3).toISOString(), last_login: new Date(Date.now()-i*3600000).toISOString(),
    login_count: Math.floor(Math.random()*100)
  })),
  payments: Array.from({length: 20}, (_, i) => ({
    id: i+1, user_id: i+1, user_name: `Farmer ${i+1}`, user_email: `farmer${i+1}@farm.com`,
    amount: [29.99,79.99,199.99,49.99][i%4], currency: "USD",
    status: i%7===0?"refunded":i%5===0?"pending":"completed",
    method: ["paypal","stripe","bank_transfer"][i%3], description: "Monthly subscription",
    paypal_order_id: i%3===0?`PP-${Math.random().toString(36).substr(2,8).toUpperCase()}`:"",
    paid_at: new Date(Date.now()-i*86400000*2).toISOString(), created_at: new Date(Date.now()-i*86400000*2).toISOString()
  })),
  invoices: Array.from({length: 15}, (_, i) => ({
    id: i+1, user_id: i+1, user_name: `Farmer ${i+1}`, invoice_number: `INV-202602-${(i+1).toString().padStart(3,'0')}`,
    status: ["paid","paid","paid","sent","overdue","draft"][i%6], subtotal: [29.99,79.99,199.99][i%3],
    tax_rate: 5, tax_amount: [1.50,4.00,10.00][i%3], discount_amount: 0,
    total: [31.49,83.99,209.99][i%3], currency: "USD",
    line_items: [{ desc: "Monthly Subscription", qty: 1, price: [29.99,79.99,199.99][i%3] }],
    billing_name: `Farmer ${i+1}`, billing_country: ["UAE","Saudi Arabia","Qatar"][i%3],
    due_date: new Date(Date.now()+i*86400000).toISOString().split('T')[0],
    created_at: new Date(Date.now()-i*86400000*5).toISOString()
  })),
  subscriptions: Array.from({length: 20}, (_, i) => ({
    id: i+1, user_id: i+1, user_name: `Farmer ${i+1}`, user_email: `farmer${i+1}@farm.com`,
    plan: ["trial","basic","pro","enterprise"][i%4], status: i%5===0?"trial":"active",
    max_cameras: [5,10,25,100][i%4], max_farms: [1,2,5,20][i%4],
    price_monthly: [0,29.99,79.99,199.99][i%4], billing_cycle: "monthly",
    user_country: ["UAE","Saudi Arabia","Qatar","Turkey"][i%4],
    current_period_end: new Date(Date.now()+30*86400000).toISOString()
  })),
  detections: Array.from({length: 20}, (_, i) => ({
    id: i+1, farm_id: i%10+1, camera_serial: `CAM-${(i+1).toString(16).toUpperCase().padStart(6,'0')}`,
    disease_name: ["Powdery Mildew","Leaf Rust","Tomato Blight","Bacterial Spot","Mosaic Virus","Aphid Infestation","Root Rot","Downy Mildew"][i%8],
    confidence: +(0.6+Math.random()*0.35).toFixed(2), severity: ["low","medium","high","critical"][i%4],
    crop_type: ["wheat","tomato","olive","date palm","citrus"][i%5], zone: ["north","south","east","west"][i%4],
    is_confirmed: i%3===0, detected_at: new Date(Date.now()-i*86400000).toISOString()
  })),
  library: Array.from({length: 12}, (_, i) => ({
    id: i+1, item_type: ["document","news","advertisement","guide","video","firmware"][i%6],
    title: ["Crop Protection Guide","Market Analysis Q1","New: AI Disease Detection v3","Precision Agriculture Tips","Seasonal Alert: Winter","Partner Spotlight: Dubai AgriTech",
            "Research Paper: NDVI Analysis","Product Update: Fleet Manager","Ad: Premium Sensors","Quick Start Guide","Video: Camera Installation","Firmware v1.3.0 Release"][i],
    summary: `Summary for item ${i+1}`, category: ["agriculture","technology","business","research"][i%4],
    tags: [["AI","farming"],["market","analysis"],["product","AI"],["tips","guide"]][i%4],
    is_published: i%4!==3, is_featured: i<3, view_count: Math.floor(Math.random()*5000),
    download_count: Math.floor(Math.random()*500), language: ["en","ar","fr"][i%3],
    ad_impressions: i%6===2?Math.floor(Math.random()*50000):null,
    ad_clicks: i%6===2?Math.floor(Math.random()*3000):null,
    ad_budget: i%6===2?Math.floor(Math.random()*5000):null,
    created_at: new Date(Date.now()-i*86400000*4).toISOString()
  })),
  diseases: [
    { id:1, name:"Powdery Mildew", scientific_name:"Erysiphales", category:"fungal", affected_crops:["wheat","grape","cucumber"], severity_default:"medium" },
    { id:2, name:"Leaf Rust", scientific_name:"Puccinia triticina", category:"fungal", affected_crops:["wheat","barley"], severity_default:"high" },
    { id:3, name:"Tomato Blight", scientific_name:"Phytophthora infestans", category:"fungal", affected_crops:["tomato","potato"], severity_default:"critical" },
    { id:4, name:"Bacterial Spot", scientific_name:"Xanthomonas campestris", category:"bacterial", affected_crops:["pepper","tomato"], severity_default:"medium" },
    { id:5, name:"Mosaic Virus", scientific_name:"TMV", category:"viral", affected_crops:["tomato","pepper","tobacco"], severity_default:"high" },
    { id:6, name:"Aphid Infestation", scientific_name:"Aphididae", category:"pest", affected_crops:["wheat","lettuce","citrus"], severity_default:"medium" },
    { id:7, name:"Root Rot", scientific_name:"Fusarium oxysporum", category:"fungal", affected_crops:["tomato","strawberry"], severity_default:"critical" },
    { id:8, name:"Whitefly", scientific_name:"Bemisia tabaci", category:"pest", affected_crops:["tomato","cucumber","cotton"], severity_default:"medium" },
  ],
  revenueChart: Array.from({length: 30}, (_, i) => ({
    date: new Date(Date.now()-(29-i)*86400000).toISOString().split('T')[0],
    revenue: Math.floor(800+Math.random()*1200), transactions: Math.floor(5+Math.random()*20)
  })),
  // Disease Analysis mock data with locations
  diseaseAnalysis: {
    summary: { total: 23847, critical: 127, high: 892, medium: 4521, low: 18307, detectionRate: 94.2 },
    byLocation: [
      { id:1, region:"Abu Dhabi", country:"UAE", lat:24.45, lng:54.65, totalDetections:3421, critical:18, diseases:["Powdery Mildew","Leaf Rust"], topCrop:"date palm", farmCount:52 },
      { id:2, region:"Riyadh", country:"Saudi Arabia", lat:24.71, lng:46.67, totalDetections:2987, critical:24, diseases:["Tomato Blight","Aphid Infestation"], topCrop:"tomato", farmCount:41 },
      { id:3, region:"Doha", country:"Qatar", lat:25.28, lng:51.52, totalDetections:1842, critical:11, diseases:["Bacterial Spot","Root Rot"], topCrop:"cucumber", farmCount:28 },
      { id:4, region:"Antalya", country:"Turkey", lat:36.89, lng:30.71, totalDetections:2156, critical:15, diseases:["Downy Mildew","Whitefly"], topCrop:"olive", farmCount:34 },
      { id:5, region:"Cairo", country:"Egypt", lat:30.04, lng:31.24, totalDetections:1654, critical:9, diseases:["Mosaic Virus","Leaf Rust"], topCrop:"wheat", farmCount:22 },
      { id:6, region:"Casablanca", country:"Morocco", lat:33.57, lng:-7.59, totalDetections:1243, critical:7, diseases:["Powdery Mildew","Aphid Infestation"], topCrop:"citrus", farmCount:18 },
      { id:7, region:"Amman", country:"Jordan", lat:31.95, lng:35.93, totalDetections:987, critical:5, diseases:["Bacterial Spot","Root Rot"], topCrop:"tomato", farmCount:14 },
      { id:8, region:"Muscat", country:"Oman", lat:23.61, lng:58.59, totalDetections:756, critical:4, diseases:["Whitefly","Downy Mildew"], topCrop:"date palm", farmCount:11 },
    ],
    topDiseases: [
      { name:"Powdery Mildew", count:5847, pct:24.5, trend:"+3.2%", color:"#f59e0b" },
      { name:"Leaf Rust", count:4231, pct:17.7, trend:"+1.8%", color:"#ef4444" },
      { name:"Tomato Blight", count:3654, pct:15.3, trend:"-2.1%", color:"#8b5cf6" },
      { name:"Aphid Infestation", count:2987, pct:12.5, trend:"+5.4%", color:"#3b82f6" },
      { name:"Bacterial Spot", count:2156, pct:9.0, trend:"-0.8%", color:"#ec4899" },
      { name:"Other", count:4972, pct:20.8, trend:"+0.5%", color:"#64748b" },
    ],
    severityDist: [ { label:"Critical", count:127, pct:0.5, color:"#dc2626" }, { label:"High", count:892, pct:3.7, color:"#ef4444" }, { label:"Medium", count:4521, pct:19.0, color:"#f59e0b" }, { label:"Low", count:18307, pct:76.8, color:"#10b981" } ],
  },
  // Farmer management data with modes
  farmers: Array.from({length:30}, (_,i) => ({
    id:i+1, name:["Mohammed Al-Rashid","Ali Hassan","Fatima Noor","Youssef Ibrahim","Aisha Khalid","Hassan Salem","Nour Ahmed","Ibrahim Farid","Khalid Omar","Layla Zaid"][i%10],
    email:`farmer${i+1}@farm.com`, phone:`+971${5000000+i}`,
    farm:["Al Rashid Date Farm","Green Valley Tomatoes","Desert Rose Citrus","Nile Valley Wheat","Mediterranean Olives","Gulf Date Plantation","Anatolian Vineyards","Sahara Greenhouse","Emirates Hydroponics","Atlas Mountain Herbs"][i%10],
    country:["UAE","Saudi Arabia","Qatar","Turkey","Egypt","Morocco","Jordan","Oman","Kuwait","Tunisia"][i%10],
    region:["Abu Dhabi","Riyadh","Doha","Antalya","Cairo","Casablanca","Amman","Muscat","Kuwait City","Tunis"][i%10],
    mode: i%3===0?"cctv":"monitoring",
    cameras: Math.floor(2+Math.random()*8),
    lastActive: new Date(Date.now()-i*3600000*2).toISOString(),
    status: i%7===0?"offline":"online",
    detections: Math.floor(Math.random()*200),
  })),
};

// ═══ STYLES ═══
const C = {
  bg: "#0a0e17", card: "#111827", border: "#1e293b", accent: "#10b981", accentDim: "#064e3b",
  red: "#ef4444", orange: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6", pink: "#ec4899",
  text: "#e2e8f0", textDim: "#94a3b8", textMuted: "#64748b", white: "#fff",
  success: "#10b981", warning: "#f59e0b", danger: "#ef4444", info: "#3b82f6"
};

const StatusBadge = ({ status }) => {
  const colors = { active:"#10b981", completed:"#10b981", paid:"#10b981", published:"#10b981",
    pending:"#f59e0b", trial:"#3b82f6", sent:"#3b82f6", draft:"#64748b",
    suspended:"#ef4444", failed:"#ef4444", overdue:"#ef4444", cancelled:"#6b7280",
    refunded:"#8b5cf6", deactivated:"#6b7280", expired:"#6b7280", disputed:"#ef4444",
    past_due:"#f59e0b", low:"#10b981", medium:"#f59e0b", high:"#ef4444", critical:"#dc2626" };
  const c = colors[status] || "#64748b";
  return <span style={{ background:`${c}22`, color:c, padding:"2px 10px", borderRadius:12, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>{status}</span>;
};

const MetricCard = ({ icon, label, value, sub, color=C.accent }) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", flex:1, minWidth:160 }}>
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
      <span style={{ fontSize:20 }}>{icon}</span>
      <span style={{ color:C.textDim, fontSize:12, fontWeight:500 }}>{label}</span>
    </div>
    <div style={{ fontSize:26, fontWeight:800, color, letterSpacing:-0.5 }}>{value}</div>
    {sub && <div style={{ color:C.textMuted, fontSize:11, marginTop:4 }}>{sub}</div>}
  </div>
);

const MiniBar = ({ data, max, color=C.accent }) => (
  <div style={{ display:"flex", alignItems:"end", gap:2, height:40 }}>
    {data.slice(-20).map((v,i) => (
      <div key={i} style={{ width:6, height:`${Math.max(4, (v/max)*100)}%`, background:i===data.length-1?color:`${color}66`,
        borderRadius:2, transition:"height 0.3s" }} />
    ))}
  </div>
);

const Btn = ({ children, onClick, variant="primary", size="md", disabled=false, style:s={} }) => {
  const base = { border:"none", borderRadius:8, cursor:disabled?"not-allowed":"pointer", fontWeight:600, transition:"all 0.15s",
    opacity:disabled?0.5:1, display:"inline-flex", alignItems:"center", gap:6 };
  const sizes = { sm:{padding:"5px 12px",fontSize:11}, md:{padding:"8px 16px",fontSize:13}, lg:{padding:"10px 20px",fontSize:14} };
  const variants = {
    primary: { background:C.accent, color:"#000" },
    secondary: { background:C.border, color:C.text },
    danger: { background:`${C.red}22`, color:C.red, border:`1px solid ${C.red}44` },
    ghost: { background:"transparent", color:C.textDim }
  };
  return <button onClick={onClick} disabled={disabled} style={{...base,...sizes[size],...variants[variant],...s}}>{children}</button>;
};

const Input = ({ value, onChange, placeholder, type="text", style:s={} }) => (
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{ background:"#0f172a", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px",
      color:C.text, fontSize:13, outline:"none", width:"100%", ...s }} />
);

const Select = ({ value, onChange, options, style:s={} }) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{ background:"#0f172a", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px",
      color:C.text, fontSize:13, outline:"none", ...s }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Table = ({ columns, data, onRow }) => (
  <div style={{ overflowX:"auto" }}>
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
      <thead>
        <tr>{columns.map((col,i) => (
          <th key={i} style={{ textAlign:"left", padding:"10px 12px", color:C.textMuted, fontSize:11,
            fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{col.label}</th>
        ))}</tr>
      </thead>
      <tbody>
        {data.map((row,ri) => (
          <tr key={ri} onClick={()=>onRow?.(row)} style={{ cursor:onRow?"pointer":"default", borderBottom:`1px solid ${C.border}15` }}
            onMouseEnter={e=>e.currentTarget.style.background="#ffffff06"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            {columns.map((col,ci) => (
              <td key={ci} style={{ padding:"10px 12px", color:C.text, whiteSpace:"nowrap" }}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
        {data.length===0 && <tr><td colSpan={columns.length} style={{ padding:40, textAlign:"center", color:C.textMuted }}>No data found</td></tr>}
      </tbody>
    </table>
  </div>
);

const Modal = ({ open, onClose, title, children, width=560 }) => {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.7)" }} />
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
        padding:24, width, maxWidth:"90vw", maxHeight:"85vh", overflowY:"auto", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ color:C.text, fontSize:18, fontWeight:700, margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display:"flex", gap:2, background:"#0f172a", borderRadius:10, padding:3 }}>
    {tabs.map(t => (
      <button key={t.key} onClick={()=>onChange(t.key)} style={{ padding:"7px 16px", borderRadius:8, border:"none",
        background:active===t.key?C.accent:"transparent", color:active===t.key?"#000":C.textDim,
        fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
        {t.icon} {t.label}
      </button>
    ))}
  </div>
);

// ═══ SECTIONS ═══

const Overview = () => {
  const d = MOCK.overview;
  const revData = MOCK.revenueChart.map(r=>r.revenue);
  const maxRev = Math.max(...revData);
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:24 }}>
        <MetricCard icon="👥" label="Total Users" value={d.users.total.toLocaleString()} sub={`+${d.users.new_this_week} this week`} />
        <MetricCard icon="🌾" label="Active Farms" value={d.farms.active.toLocaleString()} sub={`${d.farms.total_hectares.toLocaleString()} hectares`} color={C.blue} />
        <MetricCard icon="📷" label="Cameras" value={`${d.farms.active_cameras.toLocaleString()}/${d.farms.total_cameras.toLocaleString()}`} sub="active/total" color={C.purple} />
        <MetricCard icon="🔬" label="Detections" value={d.detections.this_month.toLocaleString()} sub={`${d.detections.critical} critical`} color={C.orange} />
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:24 }}>
        <MetricCard icon="💰" label="Revenue (Month)" value={`$${d.revenue.this_month.toLocaleString()}`} sub={`$${d.revenue.total_all_time.toLocaleString()} all time`} />
        <MetricCard icon="📊" label="MRR" value={`$${d.subscriptions.mrr.toLocaleString()}`} sub={`${d.subscriptions.total_active} active subs`} color={C.blue} />
        <MetricCard icon="📄" label="Invoices" value={d.invoices.total} sub={`${d.invoices.overdue} overdue`} color={d.invoices.overdue>0?C.red:C.accent} />
        <MetricCard icon="🧪" label="Trials" value={d.subscriptions.trial} sub="awaiting conversion" color={C.purple} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ color:C.text, fontWeight:700, marginBottom:16 }}>📈 Revenue (30 days)</div>
          <MiniBar data={revData} max={maxRev} />
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
            <span style={{ color:C.textMuted, fontSize:11 }}>30 days ago</span>
            <span style={{ color:C.textMuted, fontSize:11 }}>Today</span>
          </div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ color:C.text, fontWeight:700, marginBottom:16 }}>🌍 Top Countries</div>
          {d.farms.by_country.slice(0,6).map((c,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0" }}>
              <span style={{ color:C.text, fontSize:13 }}>{c.country}</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:80, height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${(c.count/d.farms.by_country[0].count)*100}%`, height:"100%", background:C.accent, borderRadius:3 }} />
                </div>
                <span style={{ color:C.textDim, fontSize:12, minWidth:30, textAlign:"right" }}>{c.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const UsersSection = () => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const filtered = MOCK.users.filter(u =>
    (!search || `${u.first_name} ${u.last_name} ${u.email} ${u.company}`.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter) && (!statusFilter || u.status === statusFilter)
  );
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <Input value={search} onChange={setSearch} placeholder="🔍 Search users..." style={{ maxWidth:280 }} />
        <Select value={roleFilter} onChange={setRoleFilter} options={[
          {value:"",label:"All Roles"},{value:"farmer",label:"Farmer"},{value:"dealer",label:"Dealer"},
          {value:"account_manager",label:"Account Manager"},{value:"admin",label:"Admin"}
        ]} />
        <Select value={statusFilter} onChange={setStatusFilter} options={[
          {value:"",label:"All Status"},{value:"active",label:"Active"},{value:"suspended",label:"Suspended"},{value:"pending",label:"Pending"}
        ]} />
        <div style={{ flex:1 }} />
        <Btn onClick={()=>setShowCreate(true)}>+ Add User</Btn>
        <Btn variant="secondary" onClick={()=>alert("Downloading CSV...")}>⬇ Export</Btn>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <Table columns={[
          { key:"id", label:"ID" },
          { key:"first_name", label:"Name", render:(_,r) => <span style={{fontWeight:600}}>{r.first_name} {r.last_name}</span> },
          { key:"email", label:"Email", render:v => <span style={{color:C.textDim}}>{v}</span> },
          { key:"role", label:"Role", render:v => <StatusBadge status={v} /> },
          { key:"status", label:"Status", render:v => <StatusBadge status={v} /> },
          { key:"country", label:"Country" },
          { key:"company", label:"Company", render:v => <span style={{color:C.textDim,fontSize:12}}>{v}</span> },
          { key:"login_count", label:"Logins", render:v => <span style={{color:C.textMuted}}>{v}</span> },
        ]} data={filtered} onRow={setSelected} />
      </div>
      <div style={{ color:C.textMuted, fontSize:12, marginTop:8 }}>{filtered.length} users found</div>
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={selected ? `${selected.first_name} ${selected.last_name}` : ""}>
        {selected && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              {[["Email",selected.email],["Role",selected.role],["Status",selected.status],["Country",selected.country],
                ["Phone",selected.phone],["Company",selected.company],["Logins",selected.login_count],
                ["Last Login",selected.last_login?.split('T')[0]]
              ].map(([l,v],i) => (
                <div key={i}><div style={{color:C.textMuted,fontSize:11,marginBottom:2}}>{l}</div><div style={{color:C.text,fontSize:13}}>{v||"—"}</div></div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn size="sm">Edit</Btn>
              <Btn size="sm" variant="secondary">Reset Password</Btn>
              <Btn size="sm" variant={selected.status==="suspended"?"primary":"danger"}>
                {selected.status==="suspended"?"Activate":"Suspend"}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Create New User">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {["First Name","Last Name","Email","Password","Phone","Company","Country","Region"].map((f,i) => (
            <div key={i}><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{f}</label>
            <Input value="" onChange={()=>{}} placeholder={f} /></div>
          ))}
        </div>
        <div style={{ marginTop:12 }}>
          <label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>Role</label>
          <Select value="farmer" onChange={()=>{}} options={[{value:"farmer",label:"Farmer"},{value:"dealer",label:"Dealer"},{value:"account_manager",label:"Account Manager"}]} />
        </div>
        <div style={{ marginTop:16, display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={()=>setShowCreate(false)}>Cancel</Btn>
          <Btn onClick={()=>{setShowCreate(false);alert("User created!")}}>Create User</Btn>
        </div>
      </Modal>
    </div>
  );
};

const DealersSection = () => {
  const dealers = MOCK.users.filter(u => u.role === "dealer");
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <MetricCard icon="🤝" label="Total Dealers" value={dealers.length} />
        <MetricCard icon="👨‍🌾" label="Avg Farmers/Dealer" value="14.4" color={C.blue} />
        <MetricCard icon="💵" label="Total Commissions" value="$12,480" color={C.purple} />
        <MetricCard icon="📈" label="Conv. Rate" value="67%" color={C.orange} />
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <Table columns={[
          { key:"id", label:"ID" },
          { key:"first_name", label:"Dealer", render:(_,r) => <span style={{fontWeight:600}}>{r.first_name} {r.last_name}</span> },
          { key:"company", label:"Company" },
          { key:"country", label:"Country" },
          { key:"email", label:"Email", render:v => <span style={{color:C.textDim}}>{v}</span> },
          { key:"status", label:"Status", render:v => <StatusBadge status={v} /> },
          { key:"id", label:"Actions", render:() => <div style={{display:"flex",gap:4}}><Btn size="sm" variant="ghost">👥 Farmers</Btn><Btn size="sm" variant="ghost">💰 Commissions</Btn></div> },
        ]} data={dealers} />
      </div>
    </div>
  );
};

const PaymentsSection = () => {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = MOCK.payments.filter(p =>
    (tab === "all" || p.status === tab) &&
    (!search || p.user_name.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <MetricCard icon="💰" label="Total Revenue" value="$487,920" sub="all time" />
        <MetricCard icon="📅" label="This Month" value="$34,850" color={C.blue} />
        <MetricCard icon="⏳" label="Pending" value="$4,280" color={C.orange} />
        <MetricCard icon="↩️" label="Refunded" value="$1,240" color={C.red} />
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <Tabs tabs={[{key:"all",label:"All",icon:"📋"},{key:"completed",label:"Completed",icon:"✅"},
          {key:"pending",label:"Pending",icon:"⏳"},{key:"refunded",label:"Refunded",icon:"↩️"}]} active={tab} onChange={setTab} />
        <Input value={search} onChange={setSearch} placeholder="🔍 Search..." style={{ maxWidth:200 }} />
        <div style={{flex:1}} />
        <Btn variant="secondary" onClick={()=>alert("Exporting payments...")}>⬇ Export CSV</Btn>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <Table columns={[
          { key:"id", label:"#" },
          { key:"user_name", label:"User", render:v => <span style={{fontWeight:600}}>{v}</span> },
          { key:"amount", label:"Amount", render:(v,r) => <span style={{fontWeight:700,color:C.accent}}>${v}</span> },
          { key:"currency", label:"Cur" },
          { key:"method", label:"Method", render:v => <span style={{textTransform:"capitalize"}}>{v==="paypal"?"🅿️ PayPal":v==="stripe"?"💳 Stripe":"🏦 Bank"}</span> },
          { key:"status", label:"Status", render:v => <StatusBadge status={v} /> },
          { key:"paid_at", label:"Date", render:v => v?.split('T')[0] },
          { key:"id", label:"Actions", render:(_,r) => r.status==="completed" ? <Btn size="sm" variant="danger">Refund</Btn> : null },
        ]} data={filtered} />
      </div>
    </div>
  );
};

const InvoicesSection = () => {
  const [showCreate, setShowCreate] = useState(false);
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <MetricCard icon="📄" label="Total Invoices" value={MOCK.invoices.length} />
        <MetricCard icon="✅" label="Paid" value={MOCK.invoices.filter(i=>i.status==="paid").length} color={C.accent} />
        <MetricCard icon="📤" label="Sent" value={MOCK.invoices.filter(i=>i.status==="sent").length} color={C.blue} />
        <MetricCard icon="⚠️" label="Overdue" value={MOCK.invoices.filter(i=>i.status==="overdue").length} color={C.red} />
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <Btn onClick={()=>setShowCreate(true)}>+ Create Invoice</Btn>
        <Btn variant="secondary" onClick={()=>alert("Exporting invoices...")}>⬇ Export</Btn>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <Table columns={[
          { key:"invoice_number", label:"Invoice #", render:v => <span style={{fontWeight:600,fontFamily:"monospace"}}>{v}</span> },
          { key:"user_name", label:"Customer" },
          { key:"total", label:"Total", render:v => <span style={{fontWeight:700}}>${v}</span> },
          { key:"status", label:"Status", render:v => <StatusBadge status={v} /> },
          { key:"billing_country", label:"Country" },
          { key:"due_date", label:"Due Date" },
          { key:"id", label:"Actions", render:(_,r) => (
            <div style={{display:"flex",gap:4}}>
              <Btn size="sm" variant="ghost">📥 PDF</Btn>
              {r.status==="draft" && <Btn size="sm" variant="ghost">📤 Send</Btn>}
              {r.status==="sent" && <Btn size="sm" variant="ghost">✅ Mark Paid</Btn>}
            </div>
          )},
        ]} data={MOCK.invoices} />
      </div>
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Create Invoice" width={640}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {["Customer Email","Billing Name","Billing Address","Country","Tax ID","Due Date"].map((f,i) => (
            <div key={i}><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{f}</label>
            <Input value="" onChange={()=>{}} placeholder={f} type={f==="Due Date"?"date":"text"} /></div>
          ))}
        </div>
        <div style={{ marginTop:16, color:C.text, fontWeight:600, marginBottom:8 }}>Line Items</div>
        <div style={{ background:"#0f172a", borderRadius:8, padding:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"3fr 1fr 1fr", gap:8 }}>
            <Input value="Monthly Subscription" onChange={()=>{}} placeholder="Description" />
            <Input value="1" onChange={()=>{}} placeholder="Qty" type="number" />
            <Input value="79.99" onChange={()=>{}} placeholder="Price" type="number" />
          </div>
          <Btn size="sm" variant="ghost" style={{marginTop:8}}>+ Add Item</Btn>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
          <div><label style={{color:C.textDim,fontSize:11}}>Tax Rate (%)</label><Input value="5" onChange={()=>{}} type="number" /></div>
          <div><label style={{color:C.textDim,fontSize:11}}>Discount ($)</label><Input value="0" onChange={()=>{}} type="number" /></div>
        </div>
        <div style={{ marginTop:16, display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={()=>setShowCreate(false)}>Cancel</Btn>
          <Btn onClick={()=>{setShowCreate(false);alert("Invoice created!")}}>Create Invoice</Btn>
        </div>
      </Modal>
    </div>
  );
};

const SubscriptionsSection = () => {
  const plans = { trial:0, basic:0, pro:0, enterprise:0 };
  MOCK.subscriptions.forEach(s => plans[s.plan]++);
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        {Object.entries(plans).map(([p,c]) => (
          <MetricCard key={p} icon={{"trial":"🧪","basic":"🌱","pro":"🚀","enterprise":"🏢"}[p]}
            label={p.charAt(0).toUpperCase()+p.slice(1)} value={c}
            color={{"trial":C.blue,"basic":C.accent,"pro":C.purple,"enterprise":C.orange}[p]} />
        ))}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <Table columns={[
          { key:"id", label:"#" },
          { key:"user_name", label:"User", render:v => <span style={{fontWeight:600}}>{v}</span> },
          { key:"user_email", label:"Email", render:v => <span style={{color:C.textDim}}>{v}</span> },
          { key:"plan", label:"Plan", render:v => <StatusBadge status={v} /> },
          { key:"status", label:"Status", render:v => <StatusBadge status={v} /> },
          { key:"price_monthly", label:"Monthly", render:v => v>0?`$${v}`:"Free" },
          { key:"max_cameras", label:"Cameras" },
          { key:"user_country", label:"Country" },
          { key:"id", label:"Actions", render:(_,r) => (
            <div style={{display:"flex",gap:4}}>
              <Btn size="sm" variant="ghost">✏️ Change</Btn>
              {r.status!=="cancelled" && <Btn size="sm" variant="danger">Cancel</Btn>}
            </div>
          )},
        ]} data={MOCK.subscriptions} />
      </div>
    </div>
  );
};

const DetectionsSection = () => {
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const filtered = MOCK.detections.filter(d =>
    (!diseaseFilter || d.disease_name.toLowerCase().includes(diseaseFilter.toLowerCase())) &&
    (!severityFilter || d.severity === severityFilter)
  );
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <MetricCard icon="🔬" label="Total" value="23,847" />
        <MetricCard icon="⚠️" label="Critical" value="127" color={C.red} />
        <MetricCard icon="✅" label="Confirmed" value="18,432" color={C.accent} />
        <MetricCard icon="🎯" label="Avg Confidence" value="87.3%" color={C.blue} />
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <Input value={diseaseFilter} onChange={setDiseaseFilter} placeholder="🔍 Filter by disease..." style={{ maxWidth:220 }} />
        <Select value={severityFilter} onChange={setSeverityFilter} options={[
          {value:"",label:"All Severity"},{value:"low",label:"Low"},{value:"medium",label:"Medium"},
          {value:"high",label:"High"},{value:"critical",label:"Critical"}
        ]} />
        <div style={{flex:1}} />
        <Btn variant="secondary" onClick={()=>alert("Exporting detections...")}>⬇ Export CSV</Btn>
        <Btn variant="secondary" onClick={()=>alert("Generating PDF report...")}>📄 PDF Report</Btn>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <Table columns={[
          { key:"id", label:"#" },
          { key:"disease_name", label:"Disease", render:v => <span style={{fontWeight:600}}>{v}</span> },
          { key:"confidence", label:"Confidence", render:v => <span style={{color:v>0.85?C.accent:v>0.7?C.orange:C.red, fontWeight:600}}>{(v*100).toFixed(0)}%</span> },
          { key:"severity", label:"Severity", render:v => <StatusBadge status={v} /> },
          { key:"crop_type", label:"Crop" },
          { key:"camera_serial", label:"Camera", render:v => <span style={{fontFamily:"monospace",fontSize:11}}>{v}</span> },
          { key:"zone", label:"Zone" },
          { key:"is_confirmed", label:"Confirmed", render:v => v?"✅":"⏳" },
          { key:"detected_at", label:"Date", render:v => v?.split('T')[0] },
        ]} data={filtered} />
      </div>
    </div>
  );
};

const LibrarySection = () => {
  const [tab, setTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const typeIcons = { document:"📄", news:"📰", advertisement:"📢", guide:"📖", video:"🎬", firmware:"⚙️" };
  const filtered = MOCK.library.filter(i => tab === "all" || i.item_type === tab);
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <Tabs tabs={[{key:"all",label:"All",icon:"📚"},{key:"document",label:"Documents",icon:"📄"},
          {key:"news",label:"News",icon:"📰"},{key:"advertisement",label:"Ads",icon:"📢"},
          {key:"guide",label:"Guides",icon:"📖"},{key:"firmware",label:"Firmware",icon:"⚙️"}
        ]} active={tab} onChange={setTab} />
        <div style={{flex:1}} />
        <Btn onClick={()=>setShowCreate(true)}>+ Add Item</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:12 }}>
        {filtered.map(item => (
          <div key={item.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:8 }}>
              <span style={{ fontSize:24 }}>{typeIcons[item.item_type]}</span>
              <div style={{ display:"flex", gap:4 }}>
                <StatusBadge status={item.is_published?"published":"draft"} />
                {item.is_featured && <span style={{background:`${C.orange}22`,color:C.orange,padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600}}>⭐ Featured</span>}
              </div>
            </div>
            <div style={{ color:C.text, fontWeight:700, fontSize:14, marginBottom:4 }}>{item.title}</div>
            <div style={{ color:C.textMuted, fontSize:12, marginBottom:8 }}>{item.summary}</div>
            <div style={{ display:"flex", gap:12, color:C.textDim, fontSize:11 }}>
              <span>👁 {item.view_count}</span>
              <span>⬇ {item.download_count}</span>
              {item.ad_impressions && <span>📊 {item.ad_impressions} impr</span>}
              {item.ad_clicks && <span>🖱 {item.ad_clicks} clicks</span>}
            </div>
            <div style={{ display:"flex", gap:4, marginTop:12 }}>
              <Btn size="sm" variant="ghost">✏️ Edit</Btn>
              {!item.is_published && <Btn size="sm" variant="ghost">📤 Publish</Btn>}
              <Btn size="sm" variant="ghost">🗑️</Btn>
            </div>
          </div>
        ))}
      </div>
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Add Library Item" width={640}>
        <div style={{ display:"grid", gap:12 }}>
          <div><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>Type</label>
          <Select value="document" onChange={()=>{}} options={Object.entries(typeIcons).map(([k,v])=>({value:k,label:`${v} ${k}`}))} /></div>
          <div><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>Title</label>
          <Input value="" onChange={()=>{}} placeholder="Item title" /></div>
          <div><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>Content</label>
          <textarea style={{ background:"#0f172a", border:`1px solid ${C.border}`, borderRadius:8, padding:12, color:C.text, fontSize:13, width:"100%", minHeight:120, resize:"vertical", outline:"none" }} placeholder="Write content..." /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={{color:C.textDim,fontSize:11}}>Category</label><Input value="" onChange={()=>{}} placeholder="Category" /></div>
            <div><label style={{color:C.textDim,fontSize:11}}>Language</label>
            <Select value="en" onChange={()=>{}} options={[{value:"en",label:"English"},{value:"ar",label:"Arabic"},{value:"fr",label:"French"},{value:"tr",label:"Turkish"}]} /></div>
          </div>
          <div><label style={{color:C.textDim,fontSize:11}}>File URL</label><Input value="" onChange={()=>{}} placeholder="https://..." /></div>
        </div>
        <div style={{ marginTop:16, display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={()=>setShowCreate(false)}>Cancel</Btn>
          <Btn onClick={()=>{setShowCreate(false);alert("Item created!")}}>Save Item</Btn>
        </div>
      </Modal>
    </div>
  );
};

const DiseasesSection = () => {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const filtered = MOCK.diseases.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()));
  const catColors = { fungal:C.orange, bacterial:C.red, viral:C.purple, pest:C.blue };
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        <Input value={search} onChange={setSearch} placeholder="🔍 Search diseases..." style={{ maxWidth:280 }} />
        <div style={{flex:1}} />
        <Btn onClick={()=>setShowCreate(true)}>+ Add Disease</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
        {filtered.map(d => (
          <div key={d.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ color:C.text, fontWeight:700, fontSize:15 }}>{d.name}</span>
              <span style={{ background:`${catColors[d.category]}22`, color:catColors[d.category],
                padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:600 }}>{d.category}</span>
            </div>
            <div style={{ color:C.textDim, fontSize:12, fontStyle:"italic", marginBottom:8 }}>{d.scientific_name}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
              {d.affected_crops?.map((c,i) => (
                <span key={i} style={{ background:`${C.accent}15`, color:C.accent, padding:"2px 8px", borderRadius:8, fontSize:10 }}>{c}</span>
              ))}
            </div>
            <div style={{ display:"flex", gap:4 }}>
              <Btn size="sm" variant="ghost">✏️ Edit</Btn>
              <Btn size="sm" variant="ghost">🗑️</Btn>
            </div>
          </div>
        ))}
      </div>
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Add Disease">
        <div style={{ display:"grid", gap:12 }}>
          {["Name","Scientific Name"].map(f => (
            <div key={f}><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{f}</label>
            <Input value="" onChange={()=>{}} placeholder={f} /></div>
          ))}
          <div><label style={{color:C.textDim,fontSize:11}}>Category</label>
          <Select value="fungal" onChange={()=>{}} options={[{value:"fungal",label:"Fungal"},{value:"bacterial",label:"Bacterial"},{value:"viral",label:"Viral"},{value:"pest",label:"Pest"}]} /></div>
          {["Symptoms","Treatment","Prevention"].map(f => (
            <div key={f}><label style={{color:C.textDim,fontSize:11}}>{f}</label>
            <textarea style={{ background:"#0f172a", border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:13, width:"100%", minHeight:60, resize:"vertical", outline:"none" }} placeholder={f} /></div>
          ))}
        </div>
        <div style={{ marginTop:16, display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={()=>setShowCreate(false)}>Cancel</Btn>
          <Btn onClick={()=>{setShowCreate(false);alert("Disease added!")}}>Save Disease</Btn>
        </div>
      </Modal>
    </div>
  );
};

const SearchSection = () => {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [diseaseName, setDiseaseName] = useState("");
  const [results, setResults] = useState(null);
  
  const doSearch = () => {
    setResults({
      users: MOCK.users.filter(u => (!q || JSON.stringify(u).toLowerCase().includes(q.toLowerCase())) &&
        (!country || u.country?.toLowerCase().includes(country.toLowerCase())) &&
        (!farmerName || `${u.first_name} ${u.last_name}`.toLowerCase().includes(farmerName.toLowerCase()))),
      detections: MOCK.detections.filter(d => (!q || d.disease_name.toLowerCase().includes(q.toLowerCase())) &&
        (!diseaseName || d.disease_name.toLowerCase().includes(diseaseName.toLowerCase()))),
    });
  };
  
  return (
    <div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
        <div style={{ color:C.text, fontWeight:700, fontSize:16, marginBottom:16 }}>🔍 Advanced Search</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:12, marginBottom:16 }}>
          <div><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>General Query</label>
          <Input value={q} onChange={setQ} placeholder="Search anything..." /></div>
          <div><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>Country</label>
          <Input value={country} onChange={setCountry} placeholder="e.g. UAE" /></div>
          <div><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>Farmer Name</label>
          <Input value={farmerName} onChange={setFarmerName} placeholder="e.g. Mohammed" /></div>
          <div><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>Farm Name</label>
          <Input value={farmName} onChange={setFarmName} placeholder="e.g. Al Rashid" /></div>
          <div><label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>Disease Name</label>
          <Input value={diseaseName} onChange={setDiseaseName} placeholder="e.g. Powdery Mildew" /></div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={doSearch}>🔍 Search</Btn>
          <Btn variant="secondary" onClick={()=>{setQ("");setCountry("");setFarmerName("");setFarmName("");setDiseaseName("");setResults(null)}}>Clear</Btn>
          {results && <Btn variant="secondary" onClick={()=>alert("Exporting results...")}>⬇ Export Results</Btn>}
        </div>
      </div>
      {results && (
        <div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ color:C.text, fontWeight:700, marginBottom:12 }}>👥 Users ({results.users.length})</div>
            <Table columns={[
              { key:"first_name", label:"Name", render:(_,r) => <span style={{fontWeight:600}}>{r.first_name} {r.last_name}</span> },
              { key:"email", label:"Email" }, { key:"role", label:"Role", render:v => <StatusBadge status={v} /> },
              { key:"country", label:"Country" }, { key:"company", label:"Company" },
            ]} data={results.users.slice(0,10)} />
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
            <div style={{ color:C.text, fontWeight:700, marginBottom:12 }}>🔬 Detections ({results.detections.length})</div>
            <Table columns={[
              { key:"disease_name", label:"Disease", render:v => <span style={{fontWeight:600}}>{v}</span> },
              { key:"confidence", label:"Confidence", render:v => `${(v*100).toFixed(0)}%` },
              { key:"severity", label:"Severity", render:v => <StatusBadge status={v} /> },
              { key:"crop_type", label:"Crop" }, { key:"detected_at", label:"Date", render:v => v?.split('T')[0] },
            ]} data={results.detections.slice(0,10)} />
          </div>
        </div>
      )}
    </div>
  );
};

// ═══ DISEASE ANALYSIS SECTION ═══
const DiseaseAnalysisSection = () => {
  const { t } = useLang();
  const da = MOCK.diseaseAnalysis;
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertContext, setAlertContext] = useState("");

  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <MetricCard icon="🔬" label={t('total_detected')} value={da.summary.total.toLocaleString()} sub="All time" color={C.accent} />
        <MetricCard icon="🚨" label={t('critical_cases')} value={da.summary.critical} sub="Immediate action" color={C.danger} />
        <MetricCard icon="⚠️" label={t('high_severity')} value={da.summary.high} sub="This month" color={C.warning} />
        <MetricCard icon="📈" label={t('detection_rate')} value={`${da.summary.detectionRate}%`} sub="AI accuracy" color={C.info} />
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ color:C.text, fontWeight:700, fontSize:16, marginBottom:16 }}>🗺️ {t('disease_map')}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:10 }}>
          {da.byLocation.map(loc => (
            <div key={loc.id} onClick={()=>setSelectedLoc(selectedLoc?.id===loc.id?null:loc)}
              style={{ padding:14, borderRadius:10, cursor:"pointer", transition:"all 0.15s",
                background:selectedLoc?.id===loc.id?`${C.accent}15`:"#0f172a",
                border:`1px solid ${selectedLoc?.id===loc.id?C.accent:C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontWeight:700, fontSize:13, color:C.text }}>{loc.region}</span>
                {loc.critical>0 && <span style={{ background:`${C.red}22`, color:C.red, padding:"1px 6px", borderRadius:8, fontSize:9, fontWeight:700 }}>{loc.critical} critical</span>}
              </div>
              <div style={{ fontSize:11, color:C.textDim, marginBottom:4 }}>{loc.country} — {loc.farmCount} farms</div>
              <div style={{ fontSize:18, fontWeight:800, color:C.accent }}>{loc.totalDetections.toLocaleString()}</div>
              <div style={{ fontSize:10, color:C.textMuted }}>detections — {loc.topCrop}</div>
              <div style={{ display:"flex", gap:3, marginTop:6, flexWrap:"wrap" }}>
                {loc.diseases.map((d,i) => <span key={i} style={{ background:`${C.orange}15`, color:C.orange, padding:"1px 6px", borderRadius:6, fontSize:9 }}>{d}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedLoc && (
        <div style={{ background:C.card, border:`1px solid ${C.accent}44`, borderRadius:12, padding:20, marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:C.accent }}>{selectedLoc.region}, {selectedLoc.country}</div>
              <div style={{ fontSize:12, color:C.textDim }}>{selectedLoc.farmCount} farms — {selectedLoc.totalDetections} detections — Top crop: {selectedLoc.topCrop}</div>
            </div>
            <Btn size="sm" onClick={()=>{ setAlertContext(`${selectedLoc.region} farmers`); setShowAlert(true); }}>{t('send_alert')} 📤</Btn>
          </div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {selectedLoc.diseases.map((d,i) => (
              <div key={i} style={{ padding:"10px 16px", background:"#0f172a", borderRadius:10, border:`1px solid ${C.border}` }}>
                <div style={{ fontWeight:700, fontSize:13, color:C.text }}>{d}</div>
                <div style={{ fontSize:11, color:C.textMuted }}>{Math.floor(selectedLoc.totalDetections * (0.3+Math.random()*0.4))} cases</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ color:C.text, fontWeight:700, fontSize:15, marginBottom:14 }}>🏆 {t('top_diseases')}</div>
          {da.topDiseases.map((d,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:d.color }} />
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{d.name}</span>
                  <span style={{ fontSize:11, color:C.textDim }}>{d.count.toLocaleString()} ({d.pct}%)</span>
                </div>
                <div style={{ height:4, background:C.border, borderRadius:2, marginTop:4 }}>
                  <div style={{ height:4, borderRadius:2, background:d.color, width:`${d.pct}%` }} />
                </div>
              </div>
              <span style={{ fontSize:10, color:d.trend.startsWith('+')?C.red:C.accent, fontWeight:600 }}>{d.trend}</span>
            </div>
          ))}
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ color:C.text, fontWeight:700, fontSize:15, marginBottom:14 }}>📊 {t('severity_dist')}</div>
          {da.severityDist.map((s,i) => (
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:600, color:s.color }}>{s.label}</span>
                <span style={{ fontSize:12, color:C.textDim }}>{s.count.toLocaleString()} ({s.pct}%)</span>
              </div>
              <div style={{ height:8, background:C.border, borderRadius:4 }}>
                <div style={{ height:8, borderRadius:4, background:s.color, width:`${Math.min(s.pct, 100)}%`, transition:"width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <div style={{ color:C.text, fontWeight:700, fontSize:15, marginBottom:14 }}>🕒 {t('recent_detections')}</div>
        <Table columns={[
          { key:"disease_name", label:"Disease", render:v => <span style={{fontWeight:600}}>{v}</span> },
          { key:"crop_type", label:t('crop') },
          { key:"zone", label:t('location'), render:v => <span style={{textTransform:"capitalize"}}>{v} zone</span> },
          { key:"severity", label:t('severity'), render:v => <StatusBadge status={v} /> },
          { key:"confidence", label:t('confidence'), render:v => <span style={{fontWeight:600}}>{(v*100).toFixed(0)}%</span> },
          { key:"detected_at", label:t('date'), render:v => v?.split('T')[0] },
          { key:"id", label:"", render:(_,row) => (
            <Btn size="sm" variant="ghost" onClick={()=>{ setAlertContext(`${row.disease_name} alert`); setShowAlert(true); }}>📤</Btn>
          ) },
        ]} data={MOCK.detections.slice(0,10)} />
      </div>

      <Modal open={showAlert} onClose={()=>setShowAlert(false)} title={`${t('send_alert')} — ${alertContext}`}>
        <div style={{ display:"grid", gap:12 }}>
          <div>
            <label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{t('notification_type')}</label>
            <Select value="update" onChange={()=>{}} options={[
              {value:"update",label:"Firmware / App Update"},
              {value:"repair",label:"Repair Required"},
              {value:"maintenance",label:"Scheduled Maintenance"},
              {value:"disease_alert",label:"Disease Alert"},
            ]} />
          </div>
          <div>
            <label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{t('message')}</label>
            <textarea style={{ background:"#0f172a", border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:13, width:"100%", minHeight:80, resize:"vertical", outline:"none" }} placeholder="Alert message for farmers..." />
          </div>
          <div>
            <label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{t('link_url')}</label>
            <Input value="" onChange={()=>{}} placeholder="https://agrivision.com/update/..." />
          </div>
        </div>
        <div style={{ marginTop:16, display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={()=>setShowAlert(false)}>{t('cancel')}</Btn>
          <Btn onClick={()=>{setShowAlert(false);alert("Alert sent!")}}>{t('send')} 📤</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ═══ FARMER MANAGEMENT SECTION ═══
const FarmerManagementSection = () => {
  const { t } = useLang();
  const farmers = MOCK.farmers;
  const [selected, setSelected] = useState([]);
  const [showNotify, setShowNotify] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [filterMode, setFilterMode] = useState("all");
  const [search, setSearch] = useState("");

  const modeACt = farmers.filter(f => f.mode === "cctv").length;
  const modeBCt = farmers.filter(f => f.mode === "monitoring").length;

  const filtered = farmers.filter(f =>
    (filterMode === "all" || f.mode === (filterMode === "a" ? "cctv" : "monitoring")) &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()) || f.farm.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(f => f.id));

  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <MetricCard icon="👨‍🌾" label={t('total_farmers')} value={farmers.length} color={C.accent} />
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", flex:2, minWidth:320 }}>
          <div style={{ color:C.textDim, fontSize:12, fontWeight:500, marginBottom:10 }}>📊 {t('farmer_mode_dist')}</div>
          <div style={{ display:"flex", gap:20, alignItems:"center" }}>
            <div style={{ display:"flex", gap:4, flex:1, height:24, borderRadius:6, overflow:"hidden" }}>
              <div style={{ width:`${(modeACt / farmers.length) * 100}%`, background:C.red, transition:"width 0.5s" }} />
              <div style={{ width:`${(modeBCt / farmers.length) * 100}%`, background:C.accent, transition:"width 0.5s" }} />
            </div>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:C.red }} />
                <span style={{ fontSize:12, color:C.text }}><b>{modeACt}</b> {t('mode_a_cctv')}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:C.accent }} />
                <span style={{ fontSize:12, color:C.text }}><b>{modeBCt}</b> {t('mode_b_monitor')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        <Input value={search} onChange={setSearch} placeholder="🔍 Search farmers..." style={{ maxWidth:260 }} />
        <Select value={filterMode} onChange={setFilterMode} options={[
          { value:"all", label:"All Modes" },
          { value:"a", label:"Mode A (CCTV)" },
          { value:"b", label:"Mode B (Monitoring)" },
        ]} />
        <div style={{ flex:1 }} />
        {selected.length > 0 && (
          <span style={{ fontSize:12, color:C.accent, fontWeight:600 }}>{selected.length} {t('farmers_selected')}</span>
        )}
        <Btn variant="secondary" onClick={()=>setShowLink(true)} disabled={selected.length === 0}>🔗 {t('send_link')}</Btn>
        <Btn onClick={()=>setShowNotify(true)} disabled={selected.length === 0}>📤 {t('send_notification')}</Btn>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr>
              <th style={{ textAlign:"left", padding:"10px 12px", borderBottom:`1px solid ${C.border}` }}>
                <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
              </th>
              <th style={{ textAlign:"left", padding:"10px 12px", color:C.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", borderBottom:`1px solid ${C.border}` }}>{t('farmer_name')}</th>
              <th style={{ textAlign:"left", padding:"10px 12px", color:C.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", borderBottom:`1px solid ${C.border}` }}>{t('farm_location')}</th>
              <th style={{ textAlign:"left", padding:"10px 12px", color:C.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", borderBottom:`1px solid ${C.border}` }}>{t('current_mode')}</th>
              <th style={{ textAlign:"left", padding:"10px 12px", color:C.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", borderBottom:`1px solid ${C.border}` }}>{t('last_active')}</th>
              <th style={{ textAlign:"left", padding:"10px 12px", color:C.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", borderBottom:`1px solid ${C.border}` }}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} style={{ borderBottom:`1px solid ${C.border}15` }}
                onMouseEnter={e=>e.currentTarget.style.background="#ffffff06"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"10px 12px" }}><input type="checkbox" checked={selected.includes(f.id)} onChange={()=>toggleSelect(f.id)} /></td>
                <td style={{ padding:"10px 12px" }}>
                  <div style={{ fontWeight:600, color:C.text }}>{f.name}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{f.email}</div>
                </td>
                <td style={{ padding:"10px 12px" }}>
                  <div style={{ color:C.text }}>{f.farm}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{f.region}, {f.country}</div>
                </td>
                <td style={{ padding:"10px 12px" }}>
                  <span style={{ background:f.mode === "cctv" ? `${C.red}22` : `${C.accent}22`, color:f.mode === "cctv" ? C.red : C.accent,
                    padding:"3px 10px", borderRadius:8, fontSize:11, fontWeight:700 }}>
                    {f.mode === "cctv" ? "A — CCTV" : "B — Monitor"}
                  </span>
                </td>
                <td style={{ padding:"10px 12px", color:C.textDim, fontSize:12 }}>
                  {new Date(f.lastActive).toLocaleString()}
                </td>
                <td style={{ padding:"10px 12px" }}>
                  <div style={{ display:"flex", gap:4 }}>
                    <Btn size="sm" variant="ghost" onClick={()=>{ setSelected([f.id]); setShowNotify(true); }}>📤</Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>{ setSelected([f.id]); setShowLink(true); }}>🔗</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showNotify} onClose={()=>setShowNotify(false)} title={`${t('send_notification')} (${selected.length} ${t('farmers_selected')})`}>
        <div style={{ display:"grid", gap:12 }}>
          <div>
            <label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{t('notification_type')}</label>
            <Select value="update" onChange={()=>{}} options={[
              {value:"update",label:`🔄 ${t('update')} — Firmware / App Update`},
              {value:"repair",label:`🔧 ${t('repair')} — Hardware Repair Needed`},
              {value:"maintenance",label:`🛠️ ${t('maintenance')} — Scheduled Maintenance`},
            ]} />
          </div>
          <div>
            <label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{t('message')}</label>
            <textarea style={{ background:"#0f172a", border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:13, width:"100%", minHeight:80, resize:"vertical", outline:"none" }} placeholder="Notification message..." />
          </div>
        </div>
        <div style={{ marginTop:16, display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={()=>setShowNotify(false)}>{t('cancel')}</Btn>
          <Btn onClick={()=>{ setShowNotify(false); alert(`Notification sent to ${selected.length} farmer(s)!`); setSelected([]); }}>{t('send')} 📤</Btn>
        </div>
      </Modal>

      <Modal open={showLink} onClose={()=>setShowLink(false)} title={`${t('send_link')} (${selected.length} ${t('farmers_selected')})`}>
        <div style={{ display:"grid", gap:12 }}>
          <div>
            <label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{t('notification_type')}</label>
            <Select value="update" onChange={()=>{}} options={[
              {value:"update",label:`🔄 ${t('update')}`},
              {value:"repair",label:`🔧 ${t('repair')}`},
              {value:"maintenance",label:`🛠️ ${t('maintenance')}`},
            ]} />
          </div>
          <div>
            <label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{t('link_url')}</label>
            <Input value="" onChange={()=>{}} placeholder="https://agrivision.com/update/v3.1" />
          </div>
          <div>
            <label style={{color:C.textDim,fontSize:11,display:"block",marginBottom:4}}>{t('message')}</label>
            <textarea style={{ background:"#0f172a", border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:13, width:"100%", minHeight:60, resize:"vertical", outline:"none" }} placeholder="Optional message with the link..." />
          </div>
        </div>
        <div style={{ marginTop:16, display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={()=>setShowLink(false)}>{t('cancel')}</Btn>
          <Btn onClick={()=>{ setShowLink(false); alert(`Link sent to ${selected.length} farmer(s)!`); setSelected([]); }}>{t('send')} 🔗</Btn>
        </div>
      </Modal>
    </div>
  );
};

const ReportsSection = () => {
  const reports = [
    { name: "Users Export", desc: "All users with role, status, country", icon: "👥", endpoint: "users", formats: ["CSV","JSON"] },
    { name: "Payments Export", desc: "All transactions with amounts, methods", icon: "💰", endpoint: "payments", formats: ["CSV","JSON"] },
    { name: "Invoices Export", desc: "All invoices with line items", icon: "📄", endpoint: "invoices", formats: ["CSV","JSON"] },
    { name: "Detections Export", desc: "AI detection results by farm/disease", icon: "🔬", endpoint: "detections", formats: ["CSV","JSON"] },
    { name: "Farms Export", desc: "Farm locations, cameras, crops", icon: "🌾", endpoint: "farms", formats: ["CSV","JSON"] },
    { name: "Revenue Report", desc: "Monthly revenue breakdown", icon: "📊", endpoint: "payments", formats: ["CSV","PDF"] },
    { name: "Subscription Report", desc: "Active subscriptions by plan", icon: "📋", endpoint: "subscriptions", formats: ["CSV","JSON"] },
    { name: "Disease Analysis", desc: "Top diseases, trends, severity", icon: "🧬", endpoint: "detections", formats: ["CSV","PDF"] },
  ];
  return (
    <div>
      <div style={{ color:C.text, fontWeight:700, fontSize:18, marginBottom:4 }}>📊 Reports & Exports</div>
      <div style={{ color:C.textDim, fontSize:13, marginBottom:20 }}>Download, print, or export data from any section</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
        {reports.map((r,i) => (
          <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, display:"flex", gap:16, alignItems:"start" }}>
            <span style={{ fontSize:32 }}>{r.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{r.name}</div>
              <div style={{ color:C.textDim, fontSize:12, marginBottom:12 }}>{r.desc}</div>
              <div style={{ display:"flex", gap:6 }}>
                {r.formats.map(f => (
                  <Btn key={f} size="sm" variant="secondary" onClick={()=>alert(`Downloading ${r.name} as ${f}...`)}>
                    ⬇ {f}
                  </Btn>
                ))}
                <Btn size="sm" variant="ghost" onClick={()=>window.print()}>🖨 Print</Btn>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsSection = () => {
  const { lang, setLang, t } = useLang();
  return (
    <div>
      <div style={{ background:C.card, border:`1px solid ${C.accent}44`, borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ color:C.accent, fontWeight:700, fontSize:16, marginBottom:12 }}>🌐 {t('language_preference')}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[{code:"en",label:"English",flag:"🇬🇧"},{code:"ar",label:"العربية",flag:"🇸🇦"},{code:"tr",label:"Türkçe",flag:"🇹🇷"}].map(l => (
            <button key={l.code} onClick={()=>setLang(l.code)} style={{
              padding:"10px 18px", borderRadius:10, cursor:"pointer", transition:"all 0.15s",
              background:lang===l.code?`${C.accent}22`:"#0f172a",
              border:`2px solid ${lang===l.code?C.accent:C.border}`,
              color:lang===l.code?C.accent:C.textDim, fontWeight:700, fontSize:14,
            }}>{l.flag} {l.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(400px, 1fr))", gap:16 }}>
        {[
          { title:"PayPal Configuration", icon:"🅿️", fields:["Client ID","Secret Key","Mode (sandbox/live)","Webhook URL"] },
          { title:"Email Settings", icon:"📧", fields:["SMTP Host","SMTP Port","From Email","From Name"] },
          { title:"WhatsApp Alerts", icon:"💬", fields:["Twilio SID","Auth Token","From Number","Alert Template"] },
          { title:"System Settings", icon:"⚙️", fields:["Company Name","Support Email","Default Currency","Tax Rate (%)"] },
        ].map((section,i) => (
          <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
            <div style={{ color:C.text, fontWeight:700, fontSize:15, marginBottom:16 }}>{section.icon} {section.title}</div>
            {section.fields.map((f,j) => (
              <div key={j} style={{ marginBottom:12 }}>
                <label style={{ color:C.textDim, fontSize:11, display:"block", marginBottom:4 }}>{f}</label>
                <Input value="" onChange={()=>{}} placeholder={f} type={f.toLowerCase().includes("secret")||f.toLowerCase().includes("token")?"password":"text"} />
              </div>
            ))}
            <Btn size="sm" style={{marginTop:4}}>💾 {t('save')}</Btn>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══ MAIN APP ═══

const NAV_KEYS = [
  { key:"overview", icon:"📊" },
  { key:"disease_analysis", icon:"🗺️" },
  { key:"farmer_mgmt", icon:"👨‍🌾" },
  { key:"users", icon:"👥" },
  { key:"dealers", icon:"🤝" },
  { key:"payments", icon:"💰" },
  { key:"subscriptions", icon:"📋" },
  { key:"invoices", icon:"📄" },
  { key:"detections", icon:"🔬" },
  { key:"library", icon:"📚" },
  { key:"diseases", icon:"🧬" },
  { key:"search", icon:"🔍" },
  { key:"reports", icon:"📊" },
  { key:"settings", icon:"⚙️" },
];

const SECTIONS = {
  overview: Overview, disease_analysis: DiseaseAnalysisSection, farmer_mgmt: FarmerManagementSection,
  users: UsersSection, dealers: DealersSection,
  payments: PaymentsSection, subscriptions: SubscriptionsSection,
  invoices: InvoicesSection, detections: DetectionsSection,
  library: LibrarySection, diseases: DiseasesSection,
  search: SearchSection, reports: ReportsSection, settings: SettingsSection,
};

export default function AdminDashboard() {
  const [section, setSection] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('agri_lang') || 'en';
    return 'en';
  });
  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
  const changeLang = (l) => { setLang(l); if (typeof window !== 'undefined') localStorage.setItem('agri_lang', l); };
  const isRTL = lang === 'ar';
  const Section = SECTIONS[section];
  const NAV = NAV_KEYS.map(n => ({...n, label: t(n.key)}));
  
  return (
    <LangContext.Provider value={{ lang, setLang: changeLang, t }}>
    <div dir={isRTL?"rtl":"ltr"} style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", color:C.text, overflow:"hidden" }}>
      {/* Sidebar */}
      <nav style={{ width:collapsed?60:220, background:"#080c14", borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column", transition:"width 0.2s", flexShrink:0, overflow:"hidden" }}>
        <div style={{ padding:collapsed?"12px 8px":"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:24, flexShrink:0 }}>🌱</span>
          {!collapsed && <div><div style={{ fontWeight:800, fontSize:14, color:C.accent, letterSpacing:0.5 }}>AgriVision</div>
          <div style={{ fontSize:10, color:C.textMuted }}>{t('admin_dashboard')}</div></div>}
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"8px 6px" }}>
          {NAV.map(n => (
            <button key={n.key} onClick={()=>setSection(n.key)} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%", padding:collapsed?"10px 8px":"8px 14px",
              background:section===n.key?`${C.accent}15`:"transparent", border:"none",
              borderRadius:8, cursor:"pointer", marginBottom:2, transition:"all 0.15s",
              justifyContent:collapsed?"center":"flex-start"
            }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
              {!collapsed && <span style={{ fontSize:13, fontWeight:section===n.key?600:400,
                color:section===n.key?C.accent:C.textDim }}>{n.label}</span>}
            </button>
          ))}
        </div>
        {/* Language Quick Switch */}
        <div style={{ padding:"6px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"center", gap:2 }}>
          {[{c:"en",f:"EN"},{c:"ar",f:"ع"},{c:"tr",f:"TR"}].map(l => (
            <button key={l.c} onClick={()=>changeLang(l.c)} style={{
              padding:"4px 8px", borderRadius:6, border:"none", cursor:"pointer", fontSize:10, fontWeight:700,
              background:lang===l.c?C.accent:"transparent", color:lang===l.c?"#000":C.textMuted,
            }}>{l.f}</button>
          ))}
        </div>
        <button onClick={()=>setCollapsed(!collapsed)} style={{
          padding:12, border:"none", borderTop:`1px solid ${C.border}`, background:"transparent",
          color:C.textMuted, cursor:"pointer", fontSize:14
        }}>{collapsed?"→":"←"}</button>
      </nav>
      
      {/* Main */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header */}
        <header style={{ padding:"12px 24px", borderBottom:`1px solid ${C.border}`, display:"flex",
          alignItems:"center", justifyContent:"space-between", background:"#080c14", flexShrink:0 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, margin:0, color:C.text }}>
              {NAV.find(n=>n.key===section)?.icon} {NAV.find(n=>n.key===section)?.label}
            </h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ color:C.textMuted, fontSize:12 }}>{new Date().toLocaleDateString(lang==='ar'?'ar-SA':lang==='tr'?'tr-TR':'en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</span>
            <div style={{ width:32, height:32, borderRadius:"50%", background:C.accentDim, display:"flex",
              alignItems:"center", justifyContent:"center", color:C.accent, fontWeight:700, fontSize:13 }}>H</div>
          </div>
        </header>
        
        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:24 }}>
          <Section />
        </div>
      </main>
    </div>
    </LangContext.Provider>
  );
}

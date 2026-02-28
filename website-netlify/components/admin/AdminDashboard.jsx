"use client";

import { useState, useEffect, useCallback } from "react";

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
  }))
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

// ═══ MODE CONTROL SECTION (Mode A: CCTV / Mode B: Monitoring) ═══
const ModeControlSection = () => {
  const [farmMode, setFarmMode] = useState("monitoring"); // 'cctv' or 'monitoring'
  const [hddConnected, setHddConnected] = useState(false);
  const [hubOnline, setHubOnline] = useState(false);
  const [hubDisk, setHubDisk] = useState({});
  const [hubPaths, setHubPaths] = useState({});
  const [hubUrl, setHubUrl] = useState("");
  const [cameraOverrides, setCameraOverrides] = useState({});
  const [motionDetection, setMotionDetection] = useState(true);
  const [continuousRecord, setContinuousRecord] = useState(false);
  const [nightVision, setNightVision] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [timelapse, setTimelapse] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [autoSwitch, setAutoSwitch] = useState(false);
  const [sensitivity, setSensitivity] = useState(70);
  const [captureInterval, setCaptureInterval] = useState(10);
  const [confidenceThreshold, setConfidenceThreshold] = useState(65);

  // Hub API URL (stored in localStorage)
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('hub_url') : null;
    setHubUrl(saved || 'http://agrivision.local:8080');
  }, []);

  const hubFetch = useCallback(async (path, opts) => {
    if (!hubUrl) return null;
    try {
      const r = await fetch(hubUrl + path, { signal: AbortSignal.timeout(4000), ...opts });
      if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error || r.statusText); }
      return await r.json();
    } catch (e) {
      if (e.name === 'AbortError' || e.message === 'Failed to fetch') setHubOnline(false);
      throw e;
    }
  }, [hubUrl]);

  const refreshHub = useCallback(async () => {
    if (!hubUrl) return;
    try {
      const [stor, mode] = await Promise.all([hubFetch('/api/storage/status'), hubFetch('/api/mode')]);
      setHddConnected(stor.hdd_mounted);
      setHubDisk(stor.disk || {});
      setHubPaths(stor.paths || {});
      setFarmMode(mode.mode);
      setHubOnline(true);
    } catch { setHubOnline(false); }
  }, [hubUrl, hubFetch]);

  useEffect(() => { refreshHub(); const t = setInterval(refreshHub, 10000); return () => clearInterval(t); }, [refreshHub]);

  const modeColor = farmMode === 'cctv' ? C.red : C.accent;
  const cameras = MOCK.detections.slice(0,8).map((d,i) => ({
    serial: d.camera_serial, zone: d.zone, online: i%5!==0, battery: 20+Math.floor(Math.random()*80)
  }));

  const handleModeSwitch = async (mode) => {
    if (mode === 'cctv' && !hddConnected) { alert('CCTV Mode requires a hard drive connected to the central unit.'); return; }
    if (hubOnline) {
      try { await hubFetch('/api/mode', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({mode}) }); } catch (e) { alert('Hub error: ' + e.message); return; }
    }
    setFarmMode(mode);
  };

  const effectiveMode = (serial) => cameraOverrides[serial] || farmMode;

  const Toggle = ({value, onChange, label, sub}) => (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0"}}>
      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{label}</div><div style={{fontSize:11,color:C.textMuted}}>{sub}</div></div>
      <div onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:12,background:value?C.accent:"#374151",cursor:"pointer",position:"relative",transition:"all 0.2s"}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:value?22:2,transition:"all 0.2s"}} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Mode Selector */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{padding:16,background:`${modeColor}0a`,borderRadius:12,marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:28}}>{farmMode==='cctv'?'\uD83D\uDCF9':'\uD83C\uDF31'}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:modeColor}}>{farmMode==='cctv'?'Mode A \u2014 CCTV Surveillance':'Mode B \u2014 AI Crop Monitoring'}</div>
            <div style={{fontSize:11,color:`${modeColor}99`}}>{farmMode==='cctv'?'Live streaming \u2022 Motion detection \u2022 Security recording':'Disease detection \u2022 Time-lapse \u2022 Scheduled capture'}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:12,marginBottom:16}}>
          {[{mode:"cctv",label:"MODE A",title:"CCTV",desc:"Live surveillance\nMotion alerts\nContinuous recording",color:C.red,icon:'\uD83D\uDCF9'},
            {mode:"monitoring",label:"MODE B",title:"MONITOR",desc:"AI disease detection\nTime-lapse capture\nScheduled intervals",color:C.accent,icon:'\uD83C\uDF31'}].map(m => (
            <div key={m.mode} onClick={()=>handleModeSwitch(m.mode)} style={{flex:1,padding:16,borderRadius:14,cursor:"pointer",background:farmMode===m.mode?`${m.color}12`:C.card,border:`2px solid ${farmMode===m.mode?m.color:C.border}`,transition:"all 0.2s"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,background:farmMode===m.mode?`${m.color}20`:C.border,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{m.icon}</div>
                <div><div style={{fontSize:9,fontWeight:800,letterSpacing:1,color:farmMode===m.mode?m.color:C.textMuted}}>{m.label}</div><div style={{fontSize:15,fontWeight:800,color:farmMode===m.mode?m.color:C.text}}>{m.title}</div></div>
              </div>
              <div style={{fontSize:11,color:farmMode===m.mode?`${m.color}cc`:C.textMuted,lineHeight:1.5,whiteSpace:"pre-line"}}>{m.desc}</div>
            </div>
          ))}
        </div>
        <Btn onClick={()=>{if(farmMode==='cctv'&&!hddConnected){alert('HDD required');return;}setCameraOverrides({});}} style={{width:"100%",background:modeColor}}>Apply {farmMode==='cctv'?'CCTV':'Monitoring'} to All Cameras</Btn>
      </div>

      {/* HDD / CCTV Requirement */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:12,color:C.text}}>{'\uD83D\uDCBE'} Storage & CCTV Requirements</div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:hubOnline?C.accent:"#64748b"}} />
            <span style={{fontSize:12,color:hubOnline?C.accent:"#64748b"}}>{hubOnline?'Hub Online':'Hub Offline'}</span>
          </div>
          <Btn size="sm" onClick={refreshHub}>{'\uD83D\uDD04'} Refresh</Btn>
        </div>
        {!hddConnected ? (
          <div style={{background:"#ef444415",border:"1px solid #ef444444",borderRadius:12,padding:16,display:"flex",alignItems:"flex-start",gap:12}}>
            <span style={{fontSize:24}}>{'\u26A0\uFE0F'}</span>
            <div>
              <div style={{fontWeight:700,color:C.red,marginBottom:4}}>Hard Drive Required for CCTV Mode</div>
              <div style={{fontSize:12,color:C.textDim}}>CCTV Mode (Mode A) requires a hard drive connected to the central unit for local recording. Without HDD, only Mode B (Monitoring) is available.</div>
              <div style={{fontSize:11,color:C.textMuted,marginTop:6}}>{'\u2022'} Connect external HDD to Pi Hub USB port<br/>{'\u2022'} Minimum: 1TB for 7-day retention<br/>{'\u2022'} Supported: ext4, NTFS, exFAT</div>
            </div>
          </div>
        ) : (
          <div style={{background:"#10b98115",border:"1px solid #10b98144",borderRadius:12,padding:16,display:"flex",alignItems:"flex-start",gap:12}}>
            <span style={{fontSize:24}}>{'\u2705'}</span>
            <div>
              <div style={{fontWeight:700,color:C.accent,marginBottom:4}}>Hard Drive Connected {'\u2014'} CCTV Ready</div>
              <div style={{fontSize:12,color:C.textDim}}>Local storage available. CCTV recordings stored on HDD. No server load {'\u2014'} both systems run locally.</div>
              <div style={{fontSize:11,color:C.textMuted,marginTop:6}}>{'\uD83D\uDCBE'} {hubDisk.free_gb != null ? `${hubDisk.free_gb} GB free of ${hubDisk.total_gb} GB (${hubDisk.used_pct}% used)` : 'Querying hub...'} {'\u2022'} {hubPaths.root || '/mnt/hdd'}</div>
            </div>
          </div>
        )}
        <div style={{background:"#0f172a",border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginTop:12}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:8,color:C.text}}>\uD83D\uDD0D Dual-System Architecture</div>
          <div style={{fontSize:12,color:C.textDim,lineHeight:1.8}}>
            <div><span style={{color:C.red,fontWeight:700}}>CCTV (Mode A):</span> Runs entirely on local central unit. Video stored on HDD. <strong style={{color:C.accent}}>Zero server load.</strong></div>
            <div><span style={{color:C.accent,fontWeight:700}}>Monitor (Mode B):</span> AI snapshots processed on-device. Only results uploaded. <strong style={{color:C.accent}}>Minimal bandwidth.</strong></div>
            <div><span style={{color:C.blue,fontWeight:700}}>Both Active:</span> CCTV records locally while Monitoring captures at intervals. Only necessary data syncs to cloud.</div>
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:8,color:C.orange}}>\uD83D\uDD12 Storage Policy: Only confirmed detections, alerts, and thumbnails uploaded. Raw CCTV footage stays on local HDD. Auto-cleanup after retention period.</div>
          </div>
        </div>
      </div>

      {/* Mode Settings */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:12,color:farmMode==='cctv'?C.red:C.accent}}>{farmMode==='cctv'?'\uD83D\uDD34 CCTV Settings':'\uD83C\uDF31 Monitoring Settings'}</div>
        {farmMode==='cctv' && !hddConnected ? (
          <div style={{color:C.textDim,fontSize:13}}>Connect a hard drive to enable CCTV settings.</div>
        ) : farmMode==='cctv' ? (
          <div>
            <Toggle label="Motion Detection" sub="Alert on movement" value={motionDetection} onChange={setMotionDetection} />
            {motionDetection && <div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{fontWeight:600}}>Sensitivity</span><span style={{color:C.accent,fontWeight:700}}>{sensitivity}%</span></div><input type="range" min="10" max="100" value={sensitivity} onChange={e=>setSensitivity(+e.target.value)} style={{width:"100%",accentColor:C.accent}} /></div>}
            <Toggle label="Continuous Recording" sub="24/7 to HDD" value={continuousRecord} onChange={setContinuousRecord} />
            <Toggle label="Night Vision (IR LED)" sub="Auto in low light" value={nightVision} onChange={setNightVision} />
          </div>
        ) : (
          <div>
            <Toggle label="AI Disease Detection" sub="Analyze every image" value={aiEnabled} onChange={setAiEnabled} />
            {aiEnabled && <div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{fontWeight:600}}>Confidence Threshold</span><span style={{color:C.accent,fontWeight:700}}>{confidenceThreshold}%</span></div><input type="range" min="30" max="99" value={confidenceThreshold} onChange={e=>setConfidenceThreshold(+e.target.value)} style={{width:"100%",accentColor:C.accent}} /></div>}
            <div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{fontWeight:600}}>Capture Interval</span><span style={{color:C.accent,fontWeight:700}}>{captureInterval} min</span></div><input type="range" min="1" max="60" value={captureInterval} onChange={e=>setCaptureInterval(+e.target.value)} style={{width:"100%",accentColor:C.accent}} /></div>
            <Toggle label="Time-Lapse Mode" sub="Daily time-lapse video" value={timelapse} onChange={setTimelapse} />
          </div>
        )}
      </div>

      {/* Per Camera */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:8,color:C.text}}>Per-Camera Mode Override</div>
        <div style={{fontSize:12,color:C.textDim,marginBottom:12}}>Default: {farmMode==='cctv'?'Mode A (CCTV)':'Mode B (Monitoring)'}. Override individual cameras below.</div>
        <div style={{display:"flex",gap:12,marginBottom:12}}>
          {[{c:C.red,l:"A = CCTV"},{c:C.accent,l:"B = Monitor"},{c:C.textMuted,l:"Auto = Farm default"}].map((d,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:"50%",background:d.c}} /><span style={{fontSize:11,color:C.textDim}}>{d.l}</span></div>
          ))}
        </div>
        {cameras.map(cam => {
          const eff = effectiveMode(cam.serial);
          const eColor = eff==='cctv'?C.red:C.accent;
          return (
            <div key={cam.serial} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,marginBottom:6}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:cam.online?C.accent:C.textMuted}} />
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{cam.serial}</div>
                <div style={{fontSize:11,color:C.textDim}}>{cam.zone} \u2022 \uD83D\uDD0B{cam.battery}% \u2022 <span style={{background:`${eColor}15`,color:eColor,padding:"1px 6px",borderRadius:4,fontSize:9,fontWeight:800}}>{eff==='cctv'?'CCTV':'MON'}</span></div>
              </div>
              <div style={{display:"flex",gap:2,background:"#0f172a",borderRadius:8,padding:2}}>
                {[{m:null,l:"Auto",c:C.textMuted},{m:"cctv",l:"A",c:C.red},{m:"monitoring",l:"B",c:C.accent}].map(opt => {
                  const active = opt.m===null ? !cameraOverrides[cam.serial] : cameraOverrides[cam.serial]===opt.m;
                  return <button key={opt.l} onClick={()=>{
                    if(opt.m==='cctv'&&!hddConnected){alert('HDD required');return;}
                    const next={...cameraOverrides};
                    if(opt.m===null)delete next[cam.serial]; else next[cam.serial]=opt.m;
                    setCameraOverrides(next);
                  }} style={{padding:"5px 10px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",border:active?`1px solid ${opt.c}`:'none',background:active?`${opt.c}20`:'transparent',color:active?opt.c:C.textMuted}}>{opt.l}</button>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:12,color:C.text}}>Capture Schedule</div>
        <Toggle label="Enable Schedule" sub="Only capture during set hours" value={scheduleEnabled} onChange={setScheduleEnabled} />
        {scheduleEnabled && (
          <div style={{background:`${C.blue}0a`,border:`1px solid ${C.blue}25`,borderRadius:10,padding:12,marginTop:8,fontSize:11,color:`${C.blue}bb`}}>
            Active 06:00 to 20:00. Outside this window cameras enter deep sleep to save battery.
          </div>
        )}
        <div style={{height:28,background:C.border,borderRadius:6,position:"relative",overflow:"hidden",margin:"12px 0"}}>
          <div style={{position:"absolute",top:0,height:"100%",left:scheduleEnabled?"25%":"0%",width:scheduleEnabled?"58.3%":"100%",background:`${modeColor}80`,borderRadius:6}} />
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textMuted}}><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
      </div>

      {/* Day/Night Auto Switch */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:4,color:C.orange}}>Day/Night Auto Switch</div>
        <div style={{fontSize:11,color:C.textDim,marginBottom:12}}>Automatically switch between modes based on time of day</div>
        <div style={{background:`${C.orange}0a`,borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><span style={{fontSize:22}}>\u2600\uFE0F</span><div><div style={{fontWeight:700,fontSize:13}}>Daytime \u2192 Mode B (Monitoring)</div><div style={{fontSize:11,color:C.textDim}}>AI crop detection during daylight</div></div></div>
          <hr style={{borderColor:C.border,margin:"8px 0"}} />
          <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:22}}>\uD83C\uDF19</span><div><div style={{fontWeight:700,fontSize:13}}>Nighttime \u2192 Mode A (CCTV)</div><div style={{fontSize:11,color:C.textDim}}>Security surveillance with IR night vision</div></div></div>
        </div>
        <Toggle label="Auto Day/Night Switch" sub="Monitor by day, CCTV by night" value={autoSwitch} onChange={setAutoSwitch} />
      </div>
    </div>
  );
};

const SettingsSection = () => (
  <div>
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
          <Btn size="sm" style={{marginTop:4}}>💾 Save</Btn>
        </div>
      ))}
    </div>
  </div>
);

// ═══ MAIN APP ═══

const NAV = [
  { key:"overview", label:"Overview", icon:"📊" },
  { key:"mode_control", label:"Mode Control", icon:"⚡" },
  { key:"users", label:"Users", icon:"👥" },
  { key:"dealers", label:"Dealers", icon:"🤝" },
  { key:"payments", label:"Payments", icon:"💰" },
  { key:"subscriptions", label:"Subscriptions", icon:"📋" },
  { key:"invoices", label:"Invoices", icon:"📄" },
  { key:"detections", label:"Detections", icon:"🔬" },
  { key:"library", label:"Library", icon:"📚" },
  { key:"diseases", label:"Diseases", icon:"🧬" },
  { key:"search", label:"Search", icon:"🔍" },
  { key:"reports", label:"Reports", icon:"📊" },
  { key:"settings", label:"Settings", icon:"⚙️" },
];

const SECTIONS = {
  overview: Overview, mode_control: ModeControlSection, users: UsersSection, dealers: DealersSection,
  payments: PaymentsSection, subscriptions: SubscriptionsSection,
  invoices: InvoicesSection, detections: DetectionsSection,
  library: LibrarySection, diseases: DiseasesSection,
  search: SearchSection, reports: ReportsSection, settings: SettingsSection,
};

export default function AdminDashboard() {
  const [section, setSection] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const Section = SECTIONS[section];
  
  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", color:C.text, overflow:"hidden" }}>
      {/* Sidebar */}
      <nav style={{ width:collapsed?60:220, background:"#080c14", borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column", transition:"width 0.2s", flexShrink:0, overflow:"hidden" }}>
        <div style={{ padding:collapsed?"12px 8px":"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:24, flexShrink:0 }}>🌱</span>
          {!collapsed && <div><div style={{ fontWeight:800, fontSize:14, color:C.accent, letterSpacing:0.5 }}>AgriVision</div>
          <div style={{ fontSize:10, color:C.textMuted }}>Admin Dashboard</div></div>}
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
            <span style={{ color:C.textMuted, fontSize:12 }}>{new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</span>
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
  );
}

/**
 * AgriVision Landing Page
 * Marketing homepage: hero, features, pricing, testimonials, CTA
 * Designed for Gulf region dealers (Dubai, UAE, Saudi Arabia)
 */

"use client";

import { useState } from "react";

const COLORS = {
  bg: "#f8faf5", primary: "#1e3a2f", accent: "#16a34a",
  accentLight: "#dcfce7", text: "#1f2937", muted: "#6b7280",
  white: "#ffffff", border: "#e5e7eb",
};

// ============================================================
// LANDING PAGE
// ============================================================

export default function LandingPage() {
  const [lang, setLang] = useState("en");

  const t = lang === "ar" ? AR : EN;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.text, direction: lang === "ar" ? "rtl" : "ltr" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${COLORS.border}`, padding: "0 40px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🌱</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>AgriVision</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {["Features", "Pricing", "Technology", "Contact"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, textDecoration: "none", cursor: "pointer" }}>{item}</a>
          ))}
          <div style={{ display: "flex", gap: 4, background: COLORS.border, borderRadius: 6, padding: 2 }}>
            {["EN", "AR", "FR"].map((l) => (
              <button key={l} onClick={() => setLang(l.toLowerCase())} style={{
                padding: "4px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
                background: lang === l.toLowerCase() ? COLORS.primary : "transparent",
                color: lang === l.toLowerCase() ? "#fff" : COLORS.muted,
              }}>{l}</button>
            ))}
          </div>
          <a href="/auth/login" style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary, textDecoration: "none" }}>Login</a>
          <a href="/configurator" style={{
            background: COLORS.accent, color: "#fff", padding: "8px 20px", borderRadius: 8,
            fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>Get Started</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: "100vh", paddingTop: 120, paddingBottom: 60,
        background: `linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #f8faf5 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ maxWidth: 1100, padding: "0 40px", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: COLORS.accentLight, borderRadius: 20, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent }}>🚀 Now Available in UAE, Saudi Arabia & Turkey</span>
          </div>

          <h1 style={{
            fontSize: 54, fontWeight: 900, lineHeight: 1.1, margin: "0 0 20px",
            fontFamily: "'Playfair Display', serif", color: COLORS.primary,
          }}>
            AI That Watches<br />Your Farm 24/7
          </h1>

          <p style={{ fontSize: 18, color: COLORS.muted, maxWidth: 600, margin: "0 auto 32px", lineHeight: 1.7 }}>
            Transform your existing cameras into an intelligent disease detection network.
            Catch crop diseases before they spread — save up to 40% on crop losses.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 40 }}>
            <a href="/configurator" style={{
              background: COLORS.primary, color: "#fff", padding: "16px 32px", borderRadius: 12,
              fontSize: 15, fontWeight: 800, textDecoration: "none",
              boxShadow: "0 4px 20px rgba(30,58,47,0.25)",
            }}>
              Configure Your System →
            </a>
            <a href="#demo" style={{
              background: "#fff", color: COLORS.primary, padding: "16px 32px", borderRadius: 12,
              fontSize: 15, fontWeight: 700, textDecoration: "none",
              border: `2px solid ${COLORS.border}`,
            }}>
              ▶ Watch Demo
            </a>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", justifyContent: "center", gap: 40 }}>
            {[
              { value: "$31", label: "Per Camera Node" },
              { value: "87%", label: "Cost Savings" },
              { value: "5MP", label: "AI Detection" },
              { value: "15min", label: "Scan Interval" },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.accent }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 40px", background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, color: COLORS.primary, fontFamily: "'Playfair Display', serif", marginBottom: 12 }}>
            How It Works
          </h2>
          <p style={{ textAlign: "center", color: COLORS.muted, marginBottom: 48, fontSize: 15 }}>
            Three simple steps to protect your entire farm
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
            {[
              { step: "01", icon: "📐", title: "Configure", desc: "Enter your farm size and terrain. Our AI calculates the exact cameras and hub you need." },
              { step: "02", icon: "📦", title: "Deploy", desc: "Receive your pre-configured system. Mount cameras, power up the hub. Takes 30 minutes." },
              { step: "03", icon: "🔬", title: "Protect", desc: "AI monitors every plant 24/7. Get instant alerts with treatment recommendations." },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: 32 }}>
                <div style={{
                  width: 70, height: 70, borderRadius: "50%", background: COLORS.accentLight,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", fontSize: 30,
                }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: 10, color: COLORS.accent, fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>STEP {item.step}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "80px 40px", background: COLORS.bg }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, color: COLORS.primary, fontFamily: "'Playfair Display', serif", marginBottom: 48 }}>
            Why Farmers Choose AgriVision
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { icon: "🧠", title: "AI Disease Detection", desc: "Trained on 348+ plant diseases. Identifies infections before they're visible to the naked eye." },
              { icon: "☀️", title: "Solar Powered", desc: "Camera nodes run on solar + LiFePO4 battery. Zero running costs, works off-grid." },
              { icon: "📱", title: "Real-Time Alerts", desc: "Instant WhatsApp and push notifications with photos, severity level, and treatment steps." },
              { icon: "🗺️", title: "Interactive Farm Map", desc: "Draw your farm, see camera coverage, and pinpoint exactly where problems are occurring." },
              { icon: "📊", title: "Smart Reports", desc: "Weekly farm health reports, disease trends, sensor analytics. PDF export for insurance claims." },
              { icon: "💰", title: "87% Cost Savings", desc: "Hub & spoke architecture: $31/camera vs $577 standalone. Same AI, fraction of the cost." },
              { icon: "🌡️", title: "Environmental Sensors", desc: "Temperature, humidity, soil moisture, and light monitoring with automatic alerts." },
              { icon: "🔒", title: "Your Data, Your Choice", desc: "Full GDPR compliance. Choose to share anonymized data for discounts, or keep it private." },
            ].map((feat, i) => (
              <div key={i} style={{
                background: "#fff", borderRadius: 14, padding: 24,
                border: `1px solid ${COLORS.border}`, display: "flex", gap: 16,
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: COLORS.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {feat.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: COLORS.primary, marginBottom: 4 }}>{feat.title}</h3>
                  <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.6, margin: 0 }}>{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "80px 40px", background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: COLORS.primary, fontFamily: "'Playfair Display', serif", marginBottom: 12 }}>
            Simple, Transparent Pricing
          </h2>
          <p style={{ color: COLORS.muted, marginBottom: 48, fontSize: 15 }}>No monthly fees. No hidden costs. Pay once, monitor forever.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {[
              { name: "Starter", size: "1-3 ha", cameras: "2-4", price: "$499", features: ["1 Central Hub", "Up to 4 cameras", "AI disease detection", "Mobile dashboard", "Email alerts"] },
              { name: "Professional", size: "3-15 ha", cameras: "5-15", price: "$747", popular: true, features: ["1 Central Hub", "Up to 15 cameras", "Full sensor suite", "WhatsApp alerts", "PDF reports", "Priority support"] },
              { name: "Enterprise", size: "15+ ha", cameras: "15+", price: "Custom", features: ["Multi-hub setup", "Unlimited cameras", "WiFi repeaters", "Custom AI training", "API access", "Dedicated support", "Data monetization"] },
            ].map((plan, i) => (
              <div key={i} style={{
                background: plan.popular ? COLORS.primary : "#fff", borderRadius: 16, padding: 32,
                border: `2px solid ${plan.popular ? COLORS.primary : COLORS.border}`,
                color: plan.popular ? "#fff" : COLORS.text, position: "relative",
                transform: plan.popular ? "scale(1.05)" : "none",
              }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: COLORS.accent, color: "#fff", padding: "4px 16px", borderRadius: 20, fontSize: 10, fontWeight: 800 }}>
                    MOST POPULAR
                  </div>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{plan.name}</h3>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>{plan.size} • {plan.cameras} cameras</div>
                <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 20 }}>
                  {plan.price}<span style={{ fontSize: 14, fontWeight: 500 }}>{plan.price !== "Custom" ? " USD" : ""}</span>
                </div>
                <div style={{ textAlign: "left", marginBottom: 24 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ fontSize: 13, padding: "6px 0", display: "flex", gap: 8 }}>
                      <span style={{ color: plan.popular ? "#22c55e" : COLORS.accent }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <a href="/configurator" style={{
                  display: "block", textAlign: "center", padding: "12px 0", borderRadius: 10,
                  background: plan.popular ? "#fff" : COLORS.primary,
                  color: plan.popular ? COLORS.primary : "#fff",
                  fontWeight: 700, fontSize: 13, textDecoration: "none",
                }}>
                  {plan.price === "Custom" ? "Contact Sales" : "Configure Now →"}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: "80px 40px", textAlign: "center",
        background: `linear-gradient(135deg, ${COLORS.primary}, #2d5a3f)`, color: "#fff",
      }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, fontFamily: "'Playfair Display', serif", marginBottom: 12 }}>
          Ready to Protect Your Farm?
        </h2>
        <p style={{ fontSize: 16, opacity: 0.85, marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>
          Join 347+ farmers across 12 countries using AgriVision to detect diseases early.
        </p>
        <a href="/configurator" style={{
          background: COLORS.accent, color: "#fff", padding: "16px 40px", borderRadius: 12,
          fontSize: 16, fontWeight: 800, textDecoration: "none", display: "inline-block",
          boxShadow: "0 4px 20px rgba(22,163,74,0.4)",
        }}>
          Configure Your System — Free Quote
        </a>
      </section>

      {/* FOOTER */}
      <footer id="contact" style={{ padding: "40px", background: "#0f1419", color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>🌱</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>AgriVision</span>
            </div>
            <p style={{ maxWidth: 250, lineHeight: 1.6 }}>AI-powered agricultural monitoring. Protecting farms across the Gulf region and beyond.</p>
            <p style={{ marginTop: 8 }}>© 2026 Performance Cristal Technologies Avancées S.A.</p>
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, marginBottom: 12 }}>Product</h4>
            {["Features", "Pricing", "Configurator", "Dashboard Demo"].map((l) => (
              <div key={l} style={{ marginBottom: 6 }}><a href="#" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{l}</a></div>
            ))}
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, marginBottom: 12 }}>Support</h4>
            {["Documentation", "Installation Guide", "FAQ", "Contact Us"].map((l) => (
              <div key={l} style={{ marginBottom: 6 }}><a href="#" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{l}</a></div>
            ))}
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, marginBottom: 12 }}>Contact</h4>
            <div style={{ marginBottom: 6 }}>📧 info@theagrivision.com</div>
            <div style={{ marginBottom: 6 }}>📞 +1 438-831-3611</div>
            <div style={{ marginBottom: 6 }}>📍 Laval, Quebec, Canada</div>
            <div>🌐 theagrivision.com</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// TRANSLATIONS (English default, Arabic example)
// ============================================================
const EN = { hero_title: "AI That Watches Your Farm 24/7" };
const AR = { hero_title: "ذكاء اصطناعي يراقب مزرعتك على مدار الساعة" };

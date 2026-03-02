/**
 * AgriVision B2B Company Registration Page
 * Allows agri-pharma, seed, equipment, and distributor companies to register
 * and select a subscription plan.
 */

"use client";

import { useState } from "react";

const COLORS = {
  bg: "#f8faf5", primary: "#1e3a2f", accent: "#16a34a",
  accentLight: "#dcfce7", text: "#1f2937", muted: "#6b7280",
  white: "#ffffff", border: "#e5e7eb", error: "#dc2626",
};

const API_BASE = "/api/companies";

const PLANS = [
  {
    id: "free", name: "Free", price: "$0", period: "",
    features: ["Company profile", "View farmer directory", "Basic analytics"],
  },
  {
    id: "decouverte", name: "Discovery", price: "$99", period: "/month",
    features: ["500 farmer messages/mo", "Regional crop data", "Disease alerts", "Email support"],
  },
  {
    id: "professionnel", name: "Professional", price: "$299", period: "/month", popular: true,
    features: ["5,000 farmer messages/mo", "Full analytics dashboard", "API access", "Custom reports", "Priority support"],
  },
  {
    id: "entreprise", name: "Enterprise", price: "$999", period: "/year",
    features: ["Unlimited messages", "White-label options", "Dedicated account manager", "Custom AI training", "SLA guarantee"],
  },
];

const COMPANY_TYPES = [
  { value: "agri-pharma", label: "Agri-Pharma" },
  { value: "seed", label: "Seed Company" },
  { value: "equipment", label: "Equipment Manufacturer" },
  { value: "distributor", label: "Distributor" },
  { value: "other", label: "Other" },
];

export default function CompanyRegistrationPage() {
  const [step, setStep] = useState(1); // 1: plan, 2: info, 3: success
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    company_name: "", company_type: "agri-pharma",
    website: "", description: "",
    contact_name: "", contact_phone: "",
    country: "", region: "",
  });

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setError("");

    // Validate
    if (!form.email || !form.password || !form.company_name || !form.contact_name) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          company_name: form.company_name,
          company_type: form.company_type,
          website: form.website || null,
          description: form.description || null,
          contact_name: form.contact_name,
          contact_phone: form.contact_phone || null,
          country: form.country || null,
          region: form.region || null,
          plan: selectedPlan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(data);
      setStep(3);
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.text, minHeight: "100vh", background: COLORS.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${COLORS.border}`, padding: "0 40px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span style={{ fontSize: 24 }}>🌱</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>AgriVision</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, textDecoration: "none" }}>Home</a>
          <a href="/auth/login" style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary, textDecoration: "none" }}>Farmer Login</a>
        </div>
      </nav>

      {/* HEADER */}
      <div style={{ textAlign: "center", paddingTop: 48, paddingBottom: 24 }}>
        <div style={{ display: "inline-block", background: COLORS.accentLight, borderRadius: 20, padding: "6px 16px", marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent }}>B2B Partner Program</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 900, fontFamily: "'Playfair Display', serif", color: COLORS.primary, margin: "0 0 12px" }}>
          Company Registration
        </h1>
        <p style={{ fontSize: 16, color: COLORS.muted, maxWidth: 500, margin: "0 auto" }}>
          Connect with farmers, access agricultural insights, and grow your agri-business with AgriVision.
        </p>
      </div>

      {/* STEP INDICATOR */}
      <div style={{ display: "flex", justifyContent: "center", gap: 40, marginBottom: 40 }}>
        {[
          { num: 1, label: "Choose Plan" },
          { num: 2, label: "Company Info" },
          { num: 3, label: "Complete" },
        ].map((s) => (
          <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: step >= s.num ? COLORS.accent : COLORS.border,
              color: step >= s.num ? "#fff" : COLORS.muted,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
            }}>
              {step > s.num ? "✓" : s.num}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: step >= s.num ? COLORS.primary : COLORS.muted }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 60px" }}>

        {/* STEP 1: Plan Selection */}
        {step === 1 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    background: "#fff", borderRadius: 16, padding: 24, cursor: "pointer",
                    border: `2px solid ${selectedPlan === plan.id ? COLORS.accent : COLORS.border}`,
                    position: "relative", transition: "all 0.2s",
                    transform: plan.popular ? "scale(1.03)" : "none",
                  }}
                >
                  {plan.popular && (
                    <div style={{
                      position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                      background: COLORS.accent, color: "#fff", padding: "3px 12px", borderRadius: 12,
                      fontSize: 10, fontWeight: 800,
                    }}>RECOMMENDED</div>
                  )}
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: COLORS.primary, marginBottom: 4 }}>{plan.name}</h3>
                  <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.accent, marginBottom: 16 }}>
                    {plan.price}<span style={{ fontSize: 13, fontWeight: 500, color: COLORS.muted }}>{plan.period}</span>
                  </div>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: COLORS.muted, padding: "4px 0", display: "flex", gap: 6 }}>
                      <span style={{ color: COLORS.accent }}>✓</span> {f}
                    </div>
                  ))}
                  {selectedPlan === plan.id && (
                    <div style={{
                      position: "absolute", top: 12, right: 12,
                      width: 24, height: 24, borderRadius: "50%", background: COLORS.accent,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 14, fontWeight: 700,
                    }}>✓</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button onClick={() => setStep(2)} style={{
                background: COLORS.accent, color: "#fff", padding: "14px 40px",
                borderRadius: 10, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}>
                Continue with {PLANS.find((p) => p.id === selectedPlan)?.name} Plan →
              </button>
            </div>
          </>
        )}

        {/* STEP 2: Company Info Form */}
        {step === 2 && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: `1px solid ${COLORS.border}` }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.primary, marginBottom: 24 }}>
                Company Details
              </h2>

              {error && (
                <div style={{
                  background: "#fef2f2", border: `1px solid #fecaca`, borderRadius: 8,
                  padding: "10px 16px", marginBottom: 20, color: COLORS.error, fontSize: 13,
                }}>{error}</div>
              )}

              {/* Account */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>ACCOUNT</div>
                <InputField label="Email *" type="email" value={form.email} onChange={(v) => updateForm("email", v)} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <InputField label="Password *" type="password" value={form.password} onChange={(v) => updateForm("password", v)} />
                  <InputField label="Confirm Password *" type="password" value={form.confirmPassword} onChange={(v) => updateForm("confirmPassword", v)} />
                </div>
              </div>

              {/* Company Info */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>COMPANY INFO</div>
                <InputField label="Company Name *" value={form.company_name} onChange={(v) => updateForm("company_name", v)} />
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, display: "block", marginBottom: 4 }}>Company Type *</label>
                  <select
                    value={form.company_type}
                    onChange={(e) => updateForm("company_type", e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${COLORS.border}`, fontSize: 14, background: "#fff",
                    }}
                  >
                    {COMPANY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <InputField label="Website" value={form.website} onChange={(v) => updateForm("website", v)} placeholder="https://" />
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, display: "block", marginBottom: 4 }}>Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    rows={3}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${COLORS.border}`, fontSize: 14, resize: "vertical",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                    placeholder="Brief description of your company..."
                  />
                </div>
              </div>

              {/* Contact */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>CONTACT</div>
                <InputField label="Contact Name *" value={form.contact_name} onChange={(v) => updateForm("contact_name", v)} />
                <InputField label="Phone" value={form.contact_phone} onChange={(v) => updateForm("contact_phone", v)} placeholder="+971..." />
              </div>

              {/* Location */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>LOCATION</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <InputField label="Country" value={form.country} onChange={(v) => updateForm("country", v)} />
                  <InputField label="Region" value={form.region} onChange={(v) => updateForm("region", v)} />
                </div>
              </div>

              {/* Selected Plan Summary */}
              <div style={{
                background: COLORS.accentLight, borderRadius: 10, padding: 16, marginBottom: 24,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 700 }}>Selected Plan</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.primary }}>{PLANS.find((p) => p.id === selectedPlan)?.name}</div>
                </div>
                <button onClick={() => setStep(1)} style={{
                  background: "transparent", border: `1px solid ${COLORS.accent}`, color: COLORS.accent,
                  padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>Change Plan</button>
              </div>

              {/* Submit */}
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, padding: "14px", borderRadius: 10,
                  border: `1px solid ${COLORS.border}`, background: "#fff",
                  fontSize: 14, fontWeight: 600, cursor: "pointer", color: COLORS.muted,
                }}>
                  ← Back
                </button>
                <button onClick={handleSubmit} disabled={loading} style={{
                  flex: 2, padding: "14px", borderRadius: 10,
                  border: "none", background: loading ? COLORS.muted : COLORS.accent,
                  color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
                }}>
                  {loading ? "Registering..." : "Register Company"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Success */}
        {step === 3 && success && (
          <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 48, border: `1px solid ${COLORS.border}` }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", background: COLORS.accentLight,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px", fontSize: 30,
              }}>🎉</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.primary, marginBottom: 8 }}>
                Welcome to AgriVision!
              </h2>
              <p style={{ fontSize: 14, color: COLORS.muted, marginBottom: 24, lineHeight: 1.7 }}>
                Your company <strong>{success.company?.name}</strong> has been registered successfully
                on the <strong>{PLANS.find((p) => p.id === success.company?.plan)?.name}</strong> plan.
              </p>
              <div style={{
                background: COLORS.bg, borderRadius: 10, padding: 16, marginBottom: 24, textAlign: "left",
              }}>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>Company ID</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary }}>#{success.company?.id}</div>
              </div>
              <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 24 }}>
                Our team will review your registration and verify your company within 24-48 hours.
                You&apos;ll receive an email confirmation at <strong>{success.company?.contact_email}</strong>.
              </p>
              <a href="/" style={{
                display: "inline-block", background: COLORS.accent, color: "#fff",
                padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}>
                Return to Homepage
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function InputField({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#1f2937", display: "block", marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: "1px solid #e5e7eb", fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
        }}
      />
    </div>
  );
}

/**
 * Auth Page — Login / Signup toggle
 */

"use client";

import { useState } from "react";
import { useStore } from "../../../lib/store";

const COLORS = { primary: "#1e3a2f", accent: "#16a34a", muted: "#6b7280", border: "#e5e7eb" };

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", country: "AE", language: "en" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login, signup } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        window.location.href = "/dashboard";
      } else {
        await signup(form);
        setMode("login");
        setError(null);
      }
    } catch (e) {
      setError(e.message || "Something went wrong");
    }
    setLoading(false);
  };

  const S = {
    label: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 },
    input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13, marginBottom: 14, boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" },
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #f0fdf4, #ecfdf5, #f8faf5)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      <div style={{ width: 400, background: "#fff", borderRadius: 16, padding: 36, boxShadow: "0 8px 30px rgba(0,0,0,0.08)", border: `1px solid ${COLORS.border}` }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 36 }}>🌱</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.primary, fontFamily: "'Playfair Display', serif", marginTop: 8 }}>AgriVision</h1>
          <p style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
            {mode === "login" ? "Welcome back" : "Create your farm account"}
          </p>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 8, marginBottom: 20, padding: 2 }}>
          {["login", "signup"].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer",
              background: mode === m ? "#fff" : "transparent",
              color: mode === m ? COLORS.primary : COLORS.muted,
              fontWeight: 700, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>
              {m === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 12, marginBottom: 14 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <label style={S.label}>Full Name</label>
              <input style={S.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmed Al-Rashidi" required />

              <label style={S.label}>Phone (WhatsApp)</label>
              <input style={S.input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+971 50 123 4567" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={S.label}>Country</label>
                  <select style={S.input} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                    {[["AE","UAE"],["SA","Saudi Arabia"],["TR","Turkey"],["EG","Egypt"],["JO","Jordan"],["MA","Morocco"],["LB","Lebanon"],["QA","Qatar"],["CA","Canada"]].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Language</label>
                  <select style={S.input} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                    <option value="fr">Français</option>
                    <option value="tr">Türkçe</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <label style={S.label}>Email</label>
          <input type="email" style={S.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ahmed@farm.ae" required />

          <label style={S.label}>Password</label>
          <input type="password" style={S.input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required minLength={8} />

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: 14, borderRadius: 10, border: "none",
            background: loading ? "#d1d5db" : COLORS.primary, color: "#fff",
            fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans', sans-serif", marginTop: 4,
          }}>
            {loading ? "..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>

        {mode === "login" && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <a href="#" style={{ fontSize: 12, color: COLORS.accent, textDecoration: "none" }}>Forgot password?</a>
          </div>
        )}

        {mode === "signup" && (
          <div style={{ fontSize: 11, color: COLORS.muted, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </div>
        )}
      </div>
    </div>
  );
}

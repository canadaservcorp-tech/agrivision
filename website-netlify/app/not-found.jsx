"use client";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f8faf5", fontFamily: "'DM Sans', sans-serif", textAlign: "center",
    }}>
      <div>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🌿</div>
        <h1 style={{ fontSize: 48, fontWeight: 900, color: "#1e3a2f", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>404</h1>
        <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 24 }}>This field hasn&apos;t been planted yet.</p>
        <a href="/" style={{
          background: "#1e3a2f", color: "#fff", padding: "12px 28px", borderRadius: 10,
          fontSize: 14, fontWeight: 700, textDecoration: "none",
        }}>Back to Home</a>
      </div>
    </div>
  );
}

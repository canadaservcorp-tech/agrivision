"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: 48, textAlign: "center",
        maxWidth: 480, boxShadow: "0 8px 30px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb",
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1e3a2f", fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>
          Order Confirmed!
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          Your AgriVision system is being prepared. You&apos;ll receive a confirmation email with tracking details shortly.
        </p>

        {orderId && (
          <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "16px 24px", marginBottom: 28, display: "inline-block" }}>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, letterSpacing: 1 }}>ORDER REFERENCE</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a2f", fontFamily: "'Space Mono', monospace", marginTop: 4 }}>
              AGV-{orderId}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <a href="/dashboard" style={{
            background: "#1e3a2f", color: "#fff", padding: "14px 28px", borderRadius: 10,
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            Go to Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}

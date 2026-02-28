"use client";

import { useEffect, useState } from "react";
import { useStore } from "../../lib/store";

export default function AuthGuard({ children, requireAdmin = false }) {
  const { isAuthenticated, loading, initAuth, user } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initAuth().then(() => setReady(true));
  }, [initAuth]);

  if (!ready || loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8faf5", fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>Loading AgriVision...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    return null;
  }

  if (requireAdmin && user?.role !== "admin") {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
    return null;
  }

  return children;
}

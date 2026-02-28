"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../components/ui/AuthGuard";
import StripeCheckout from "../../components/payment/StripeCheckout";
import { useStore } from "../../lib/store";

export default function CheckoutPage() {
  const { cart, selectedFarm } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!cart) {
      window.location.href = "/configurator";
      return;
    }
    setReady(true);
  }, [cart]);

  if (!ready || !cart) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8faf5" }}>
        <div style={{ textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ fontSize: 40 }}>🛒</div>
          <p style={{ color: "#6b7280", marginTop: 12 }}>Redirecting to configurator...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div style={{ minHeight: "100vh", background: "#f8faf5", padding: "40px 20px" }}>
        <StripeCheckout
          orderData={{ farm_id: selectedFarm?.id || 1 }}
          systemConfig={cart}
          onComplete={(order) => {
            window.location.href = `/checkout/success?order=${order.id}`;
          }}
        />
      </div>
    </AuthGuard>
  );
}

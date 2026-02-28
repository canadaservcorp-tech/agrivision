/**
 * StripeCheckout
 * Complete payment flow:
 * 1. Review order summary
 * 2. Enter shipping info
 * 3. Pay with Stripe Elements
 * 4. Confirmation
 */

"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { orders as ordersApi } from "../../lib/api";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY || "pk_test_placeholder");

// ============================================================
// CHECKOUT WRAPPER (manages flow steps)
// ============================================================

export default function StripeCheckout({ orderData, systemConfig, onComplete }) {
  const [step, setStep] = useState(1); // 1=review, 2=shipping, 3=payment, 4=confirmed
  const [order, setOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [shipping, setShipping] = useState({
    name: "", address: "", city: "", country: "", postal_code: "", phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1 → 2: Create order
  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const created = await ordersApi.create({
        farm_id: orderData.farm_id,
        num_hubs: systemConfig.hubs_needed,
        num_cameras: systemConfig.cameras_needed,
        num_wifi_repeaters: systemConfig.wifi_repeaters || 0,
        shipping_name: shipping.name,
        shipping_address: shipping.address,
        shipping_city: shipping.city,
        shipping_country: shipping.country,
        shipping_postal: shipping.postal_code,
        shipping_phone: shipping.phone,
      });
      setOrder(created);
      setStep(3);

      // Create payment intent
      const pi = await ordersApi.createPaymentIntent(created.id);
      setClientSecret(pi.client_secret);
    } catch (e) {
      setError(e.message || "Failed to create order");
    }
    setLoading(false);
  };

  const handlePaymentSuccess = async () => {
    try {
      await ordersApi.confirm(order.id);
      setStep(4);
      if (onComplete) onComplete(order);
    } catch (e) {
      setError(e.message);
    }
  };

  const S = {
    container: { maxWidth: 640, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" },
    card: { background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #e5e7eb", marginBottom: 16 },
    h2: { margin: "0 0 16px", fontSize: 18, fontWeight: 800, color: "#1e3a2f" },
    label: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 },
    input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, marginBottom: 12, fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" },
    btn: { width: "100%", padding: "14px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    btnPrimary: { background: "#1e3a2f", color: "#fff" },
    btnDisabled: { background: "#d1d5db", color: "#9ca3af", cursor: "not-allowed" },
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    error: { background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 12, marginBottom: 12 },
  };

  // ============================================================
  // STEP 1: Review Order
  // ============================================================
  if (step === 1) {
    return (
      <div style={S.container}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["Review", "Shipping", "Payment", "Done"].map((s, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? "#16a34a" : "#e5e7eb" }} />
          ))}
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>📦 Order Summary</h2>

          <div style={{ marginBottom: 16 }}>
            {[
              { label: `Central Hub × ${systemConfig.hubs_needed}`, price: systemConfig.hub_total },
              { label: `Camera Nodes × ${systemConfig.cameras_needed}`, price: systemConfig.camera_total },
              systemConfig.wifi_repeaters > 0 && { label: `WiFi Repeaters × ${systemConfig.wifi_repeaters}`, price: systemConfig.repeater_total },
              { label: "Shipping", price: systemConfig.shipping_cost },
              { label: "Tax (5%)", price: systemConfig.tax },
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>{item.label}</span>
                <span style={{ fontWeight: 600 }}>${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 18, fontWeight: 800 }}>
            <span>Total</span>
            <span style={{ color: "#16a34a" }}>${systemConfig.total_amount.toFixed(2)}</span>
          </div>

          {/* Savings callout */}
          {systemConfig.savings_percent > 0 && (
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "12px 16px", marginTop: 12, border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                💰 You save ${systemConfig.savings.toFixed(0)} ({systemConfig.savings_percent.toFixed(0)}%) vs traditional systems
              </div>
            </div>
          )}
        </div>

        {/* Farm Info */}
        <div style={S.card}>
          <h2 style={{ ...S.h2, fontSize: 14 }}>🌾 System Configuration</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { icon: "🏠", label: "Hubs", value: systemConfig.hubs_needed },
              { icon: "📷", label: "Cameras", value: systemConfig.cameras_needed },
              { icon: "📡", label: "Repeaters", value: systemConfig.wifi_repeaters || 0 },
            ].map((item, i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: 12, textAlign: "center" }}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1e3a2f", marginTop: 4 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => setStep(2)}>
          Continue to Shipping →
        </button>
      </div>
    );
  }

  // ============================================================
  // STEP 2: Shipping Info
  // ============================================================
  if (step === 2) {
    const isValid = shipping.name && shipping.address && shipping.city && shipping.country && shipping.phone;
    return (
      <div style={S.container}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? "#16a34a" : "#e5e7eb" }} />
          ))}
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>🚚 Shipping Information</h2>
          {error && <div style={S.error}>{error}</div>}

          <label style={S.label}>Full Name *</label>
          <input style={S.input} value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} placeholder="Ahmed Al-Rashidi" />

          <label style={S.label}>Address *</label>
          <input style={S.input} value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} placeholder="123 Farm Road" />

          <div style={S.row}>
            <div>
              <label style={S.label}>City *</label>
              <input style={S.input} value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} placeholder="Dubai" />
            </div>
            <div>
              <label style={S.label}>Postal Code</label>
              <input style={S.input} value={shipping.postal_code} onChange={(e) => setShipping({ ...shipping, postal_code: e.target.value })} placeholder="00000" />
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>Country *</label>
              <select style={S.input} value={shipping.country} onChange={(e) => setShipping({ ...shipping, country: e.target.value })}>
                <option value="">Select country</option>
                {["AE", "SA", "TR", "EG", "JO", "MA", "LB", "QA", "KW", "BH", "OM", "CA"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Phone *</label>
              <input style={S.input} value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} placeholder="+971 50 123 4567" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ ...S.btn, background: "#fff", color: "#374151", border: "1px solid #d1d5db", flex: 1 }} onClick={() => setStep(1)}>← Back</button>
          <button style={{ ...S.btn, ...(isValid ? S.btnPrimary : S.btnDisabled), flex: 2 }} disabled={!isValid || loading} onClick={handleCreateOrder}>
            {loading ? "Creating order..." : "Continue to Payment →"}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP 3: Stripe Payment
  // ============================================================
  if (step === 3 && clientSecret) {
    return (
      <div style={S.container}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? "#16a34a" : "#e5e7eb" }} />
          ))}
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>💳 Payment</h2>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
            Order: {order?.reference} • Total: <strong>${systemConfig.total_amount.toFixed(2)} USD</strong>
          </div>

          <Elements stripe={stripePromise} options={{
            clientSecret,
            appearance: { theme: "stripe", variables: { colorPrimary: "#1e3a2f", borderRadius: "8px" } },
          }}>
            <PaymentForm order={order} onSuccess={handlePaymentSuccess} />
          </Elements>
        </div>

        <button style={{ ...S.btn, background: "#fff", color: "#374151", border: "1px solid #d1d5db" }} onClick={() => setStep(2)}>← Back to Shipping</button>
      </div>
    );
  }

  // ============================================================
  // STEP 4: Confirmation
  // ============================================================
  if (step === 4) {
    return (
      <div style={S.container}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4].map(() => (
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#16a34a" }} />
          ))}
        </div>

        <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#1e3a2f" }}>Order Confirmed!</h2>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
            Your AgriVision system is being prepared. You'll receive a confirmation email shortly.
          </p>

          <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 20, display: "inline-block", textAlign: "left", marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Order Reference</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1e3a2f", fontFamily: "'Space Mono', monospace" }}>{order?.reference}</div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button style={{ ...S.btn, ...S.btnPrimary, width: "auto", padding: "12px 24px" }} onClick={() => window.location.href = "/dashboard"}>
              Go to Dashboard →
            </button>
            <button style={{ ...S.btn, width: "auto", padding: "12px 24px", background: "#fff", color: "#374151", border: "1px solid #d1d5db" }}>
              📧 Email Receipt
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div style={{ ...S.container, textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 40 }}>⏳</div>
      <p style={{ color: "#6b7280" }}>Setting up payment...</p>
    </div>
  );
}

// ============================================================
// STRIPE PAYMENT FORM (uses Elements context)
// ============================================================

function PaymentForm({ order, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/success?order=${order?.id}` },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message);
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 12, marginTop: 12 }}>
          {error}
        </div>
      )}
      <button type="submit" disabled={!stripe || processing} style={{
        width: "100%", padding: 14, borderRadius: 10, border: "none",
        background: processing ? "#d1d5db" : "#16a34a", color: "#fff",
        fontSize: 14, fontWeight: 800, cursor: processing ? "not-allowed" : "pointer",
        marginTop: 16, fontFamily: "'DM Sans', sans-serif",
      }}>
        {processing ? "Processing..." : `Pay $${order?.total_amount?.toFixed(2) || "0.00"}`}
      </button>
      <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#9ca3af" }}>
        🔒 Secured by Stripe • 256-bit encryption
      </div>
    </form>
  );
}

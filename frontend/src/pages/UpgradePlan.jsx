import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";

const PLANS = [
  {
    key: "PRO_MONTHLY",
    name: "PRO",
    price: "₹199",
    period: "/ month",
    savings: null,
    features: [
      "Unlimited lesson plans",
      "Unlimited assessments",
      "All AI features",
      "Notice & Report card generator",
      "Monthly planner & Timetable",
      "Priority support",
    ],
    highlight: true,
  },
  {
    key: "PRO_YEARLY",
    name: "PRO",
    price: "₹1,499",
    period: "/ year",
    savings: "Save 37% — ₹125/mo",
    features: [
      "Everything in PRO Monthly",
      "Best value for the year",
    ],
    highlight: false,
  },
  {
    key: "SCHOOL_MONTHLY",
    name: "SCHOOL",
    price: "₹999",
    period: "/ month",
    savings: "₹100/teacher for 10 teachers",
    features: [
      "Up to 10 teacher accounts",
      "All PRO features",
      "Admin dashboard",
      "School branding",
      "Priority support",
    ],
    highlight: false,
  },
];

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function UpgradePlan() {
  const [loading, setLoading] = useState(null); // planKey being processed
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleUpgrade = async (planKey) => {
    setError("");
    setLoading(planKey);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError("Failed to load payment gateway. Check your internet connection.");
      setLoading(null);
      return;
    }

    try {
      // 1. Create order on backend
      const { data } = await api.post("/api/payment/create-order", { plan: planKey });

      // 2. Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "TeacherAI",
        description: planKey.replace("_", " ") + " Plan",
        theme: { color: "#2563eb" },
        handler: async (response) => {
          // 3. Verify on backend & upgrade plan
          try {
            await api.post("/api/payment/verify", {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan: planKey,
            });
            navigate("/profile", { state: { upgraded: true } });
          } catch {
            setError("Payment received but plan activation failed. Contact support.");
          }
        },
        modal: {
          ondismiss: () => setLoading(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        setError("Payment failed: " + (resp.error?.description || "Unknown error"));
        setLoading(null);
      });
      rzp.open();

    } catch {
      setError("Could not initiate payment. Please try again.");
      setLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Upgrade Your Plan</h1>
        <p className="page-subtitle">Unlock unlimited AI-powered tools for your classroom.</p>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: 24, maxWidth: 860 }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", maxWidth: 900 }}>
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            style={{
              flex: "1 1 240px",
              background: plan.highlight ? "#2563eb" : "#fff",
              color: plan.highlight ? "#fff" : "#1e293b",
              border: plan.highlight ? "none" : "1px solid #e2e8f0",
              borderRadius: 16,
              padding: "28px 24px",
              boxShadow: plan.highlight ? "0 8px 32px rgba(37,99,235,0.25)" : "0 2px 8px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              position: "relative",
            }}
          >
            {plan.highlight && (
              <div style={{
                position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                background: "#f59e0b", color: "#fff", borderRadius: 20,
                padding: "3px 14px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
              }}>
                MOST POPULAR
              </div>
            )}

            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, opacity: 0.7 }}>
              {plan.name}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 800 }}>{plan.price}</span>
              <span style={{ fontSize: 14, opacity: 0.7 }}>{plan.period}</span>
            </div>

            {plan.savings && (
              <div style={{
                background: plan.highlight ? "rgba(255,255,255,0.2)" : "#f0fdf4",
                color: plan.highlight ? "#fff" : "#16a34a",
                borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600,
              }}>
                {plan.savings}
              </div>
            )}

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <span style={{ color: plan.highlight ? "#93c5fd" : "#2563eb", fontWeight: 700 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(plan.key)}
              disabled={!!loading}
              style={{
                marginTop: 8,
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                background: plan.highlight ? "#fff" : "#2563eb",
                color: plan.highlight ? "#2563eb" : "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading && loading !== plan.key ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading === plan.key && (
                <span style={{
                  width: 14, height: 14, border: "2px solid rgba(37,99,235,0.3)",
                  borderTopColor: "#2563eb", borderRadius: "50%",
                  animation: "spin 0.7s linear infinite", display: "inline-block",
                }} />
              )}
              {loading === plan.key ? "Processing…" : "Upgrade Now"}
            </button>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: "#94a3b8" }}>
        Secure payments powered by Razorpay. Supports UPI, cards, net banking & wallets.
      </p>
    </DashboardLayout>
  );
}

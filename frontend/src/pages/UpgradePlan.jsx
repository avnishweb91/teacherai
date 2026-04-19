import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";

const PLANS = [
  {
    key: "FREE",
    type: "free",
    name: "FREE",
    price: "₹0",
    period: "/ month",
    savings: null,
    badge: null,
    features: [
      "3 lesson plans / day",
      "1 assessment / day",
      "Basic AI features",
      "Attendance manager",
      "Community support",
    ],
    highlight: false,
  },
  {
    key: "PRO_MONTHLY",
    type: "paid",
    name: "PRO",
    price: "₹199",
    period: "/ month",
    savings: null,
    badge: "MOST POPULAR",
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
    type: "paid",
    name: "PRO",
    price: "₹1,799",
    period: "/ year",
    savings: "Save 25% — ₹150/mo",
    badge: "BEST VALUE",
    features: [
      "Everything in PRO Monthly",
      "2 months free vs monthly",
      "Priority support",
    ],
    highlight: false,
  },
  {
    key: "SCHOOL_MONTHLY",
    type: "paid",
    name: "SCHOOL STARTER",
    price: "₹1,999",
    period: "/ month",
    savings: "₹200/teacher for 10 teachers",
    badge: null,
    features: [
      "Up to 10 teacher accounts",
      "All PRO features",
      "Admin dashboard",
      "School branding",
      "Priority support",
    ],
    highlight: false,
  },
  {
    key: "SCHOOL_PRO",
    type: "paid",
    name: "SCHOOL PRO",
    price: "₹3,499",
    period: "/ month",
    savings: "₹140/teacher for 25 teachers",
    badge: null,
    features: [
      "Up to 25 teacher accounts",
      "All School Starter features",
      "Advanced admin analytics",
      "Dedicated account manager",
      "Priority support",
    ],
    highlight: false,
  },
  {
    key: "ENTERPRISE",
    type: "enterprise",
    name: "ENTERPRISE",
    price: "Custom",
    period: "",
    savings: null,
    badge: "25+ TEACHERS",
    features: [
      "Unlimited teacher accounts",
      "All School Pro features",
      "Custom onboarding & training",
      "SLA-backed support",
      "Custom integrations",
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

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", maxWidth: 1100 }}>
        {PLANS.map((plan) => {
          const isEnterprise = plan.type === "enterprise";
          const isFree = plan.type === "free";
          const cardBg = plan.highlight ? "#2563eb" : isEnterprise ? "#0f172a" : "#fff";
          const cardColor = (plan.highlight || isEnterprise) ? "#fff" : "#1e293b";
          const cardBorder = plan.highlight ? "none" : isEnterprise ? "none" : "1px solid #e2e8f0";
          const cardShadow = plan.highlight
            ? "0 8px 32px rgba(37,99,235,0.25)"
            : isEnterprise
            ? "0 8px 32px rgba(0,0,0,0.3)"
            : "0 2px 8px rgba(0,0,0,0.06)";
          const badgeBg = plan.highlight ? "#f59e0b" : isEnterprise ? "#6d28d9" : "#e2e8f0";
          const badgeColor = (plan.highlight || isEnterprise) ? "#fff" : "#475569";
          const checkColor = plan.highlight ? "#93c5fd" : isEnterprise ? "#a78bfa" : "#2563eb";

          return (
            <div
              key={plan.key}
              style={{
                flex: "1 1 160px",
                background: cardBg,
                color: cardColor,
                border: cardBorder,
                borderRadius: 16,
                padding: "28px 20px",
                boxShadow: cardShadow,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                position: "relative",
              }}
            >
              {plan.badge && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: badgeBg, color: badgeColor, borderRadius: 20,
                  padding: "3px 14px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, opacity: 0.7 }}>
                {plan.name}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 800 }}>{plan.price}</span>
                {plan.period && <span style={{ fontSize: 13, opacity: 0.7 }}>{plan.period}</span>}
              </div>

              {plan.savings && (
                <div style={{
                  background: plan.highlight ? "rgba(255,255,255,0.2)" : isEnterprise ? "rgba(255,255,255,0.1)" : "#f0fdf4",
                  color: plan.highlight || isEnterprise ? "#fff" : "#16a34a",
                  borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                }}>
                  {plan.savings}
                </div>
              )}

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
                    <span style={{ color: checkColor, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* FREE card — current plan button */}
              {isFree && (
                <button disabled style={{
                  marginTop: 8, padding: "11px 0", borderRadius: 10, border: "1.5px solid #e2e8f0",
                  background: "#f8fafc", color: "#94a3b8", fontWeight: 700, fontSize: 14, cursor: "default",
                }}>
                  Current Free Plan
                </button>
              )}

              {/* ENTERPRISE card — contact button */}
              {isEnterprise && (
                <a
                  href="mailto:support@smartboard.co.in?subject=Enterprise%20Plan%20Enquiry"
                  style={{
                    marginTop: 8, padding: "11px 0", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #6d28d9, #4f46e5)",
                    color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    textDecoration: "none", boxShadow: "0 4px 14px rgba(109,40,217,0.4)",
                  }}
                >
                  📩 Get a Custom Quote
                </a>
              )}

              {/* PAID plans — Razorpay button (unchanged logic) */}
              {plan.type === "paid" && (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={!!loading}
                  style={{
                    marginTop: 8, padding: "11px 0", borderRadius: 10, border: "none",
                    background: plan.highlight ? "#fff" : "#2563eb",
                    color: plan.highlight ? "#2563eb" : "#fff",
                    fontWeight: 700, fontSize: 14,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading && loading !== plan.key ? 0.5 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
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
              )}
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: "#94a3b8" }}>
        Secure payments powered by Razorpay. Supports UPI, cards, net banking &amp; wallets.
        &nbsp;·&nbsp; Enterprise? Email us at{" "}
        <a href="mailto:support@smartboard.co.in" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
          support@smartboard.co.in
        </a>
      </p>
    </DashboardLayout>
  );
}

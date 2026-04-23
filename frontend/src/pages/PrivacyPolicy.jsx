import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const SECTIONS = [
  {
    num: "1", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe",
    title: "Who We Are",
    content: (
      <p>SmartBoard AI ("we", "our", "us") is an AI-powered teaching assistant built for Indian classrooms. This policy explains how we collect, use and protect your information when you use our service at smartboard.co.in.</p>
    ),
  },
  {
    num: "2", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe",
    title: "Information We Collect",
    content: (
      <ul style={{ paddingLeft: 20, margin: 0 }}>
        <li><strong>Account information:</strong> Name and email address when you sign up via Google or email.</li>
        <li><strong>Usage data:</strong> Features you use, lesson plans and assessments you generate (stored to your account).</li>
        <li><strong>Device &amp; log data:</strong> IP address, browser type, and pages visited for security and analytics.</li>
      </ul>
    ),
  },
  {
    num: "3", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0",
    title: "How We Use Your Information",
    content: (
      <ul style={{ paddingLeft: 20, margin: 0 }}>
        <li>To provide and improve the SmartBoard AI service.</li>
        <li>To authenticate your account and keep it secure.</li>
        <li>To send important service updates (no marketing without consent).</li>
        <li>To generate AI content personalised to your class and subject inputs.</li>
      </ul>
    ),
  },
  {
    num: "4", color: "#d97706", bg: "#fffbeb", border: "#fde68a",
    title: "Google Sign-In",
    content: (
      <p>When you sign in with Google, we receive your name and email address only. We do not access your Google Drive, Gmail, contacts, or any other Google data. Your Google account data is governed by{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>Google's Privacy Policy</a>.
      </p>
    ),
  },
  {
    num: "5", color: "#dc2626", bg: "#fef2f2", border: "#fecaca",
    title: "Data Sharing",
    content: (
      <>
        <p style={{ margin: "0 0 8px" }}>We do not sell, rent, or trade your personal data. We may share data with:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li><strong>AI providers</strong> (e.g. Anthropic) to generate content — only the inputs you provide are sent.</li>
          <li><strong>Hosting &amp; infrastructure</strong> providers under confidentiality agreements.</li>
          <li><strong>Legal authorities</strong> if required by law.</li>
        </ul>
      </>
    ),
  },
  {
    num: "6", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc",
    title: "Data Retention",
    content: (
      <p>Your account data is retained while your account is active. You may request deletion at any time by contacting us. Generated content (lesson plans, assessments, etc.) is retained to your account until you delete it.</p>
    ),
  },
  {
    num: "7", color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe",
    title: "Security",
    content: (
      <p>We use industry-standard security measures including HTTPS encryption, secure token authentication, and access controls. No method of transmission over the Internet is 100% secure, but we work hard to protect your data.</p>
    ),
  },
  {
    num: "8", color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4",
    title: "Your Rights",
    content: (
      <p>You have the right to access, correct, or delete your personal data. To exercise these rights, email us at{" "}
        <a href="mailto:support@smartboard.co.in" style={{ color: "#2563eb" }}>support@smartboard.co.in</a>.
      </p>
    ),
  },
  {
    num: "9", color: "#be185d", bg: "#fdf2f8", border: "#fbcfe8",
    title: "Children's Privacy",
    content: (
      <p>SmartBoard AI is intended for use by teachers (adults). We do not knowingly collect personal data from children under 13.</p>
    ),
  },
  {
    num: "10", color: "#b45309", bg: "#fff7ed", border: "#fed7aa",
    title: "Changes to This Policy",
    content: (
      <p>We may update this policy from time to time. We will notify you of significant changes via email or an in-app notice.</p>
    ),
  },
  {
    num: "11", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe",
    title: "Contact",
    content: (
      <p>For any privacy-related questions, contact us at{" "}
        <a href="mailto:support@smartboard.co.in" style={{ color: "#2563eb" }}>support@smartboard.co.in</a>.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #eff6ff 0%, #f5f3ff 50%, #f0fdf4 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <Helmet>
        <title>Privacy Policy — SmartBoard AI</title>
        <meta name="description" content="Read SmartBoard AI's privacy policy. We protect your data and never share it with third parties. Learn how we collect and use information from Indian school teachers." />
        <link rel="canonical" href="https://www.smartboard.co.in/privacy" />
      </Helmet>

      {/* Hero header */}
      <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #6d28d9 100%)", padding: "52px 24px 44px", textAlign: "center", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -80, left: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ fontSize: 52, marginBottom: 14, position: "relative" }}>🔒</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.5px", position: "relative" }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", margin: 0, position: "relative" }}>Last updated: April 18, 2026</p>
      </div>

      {/* Back link */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 0" }}>
        <Link to="/login" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
          ← Back to Login
        </Link>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 24px 60px" }}>
        {SECTIONS.map((s) => (
          <div
            key={s.num}
            style={{
              marginBottom: 16,
              background: s.bg,
              border: `1.5px solid ${s.border}`,
              borderLeft: `4px solid ${s.color}`,
              borderRadius: 12,
              padding: "20px 22px",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: s.color, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: s.color, color: "#fff", borderRadius: "50%", width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                {s.num}
              </span>
              {s.title}
            </h2>
            <div style={{ fontSize: 14.5, color: "#334155", lineHeight: 1.7 }}>
              {s.content}
            </div>
          </div>
        ))}

        {/* Footer nav */}
        <div style={{ marginTop: 32, textAlign: "center", paddingTop: 24, borderTop: "1.5px solid #e2e8f0" }}>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>Also read our</p>
          <Link to="/terms" style={{ display: "inline-block", padding: "8px 20px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", borderRadius: 20, fontSize: 13, fontWeight: 600, textDecoration: "none", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
            Terms &amp; Conditions →
          </Link>
        </div>
      </div>
    </div>
  );
}

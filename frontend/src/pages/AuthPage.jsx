import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import LoginEmail from "./LoginEmail";
import SplashScreen from "./SplashScreen";
import api from "../services/api";
import "./auth.css";

function redirectToGoogle() {
  const nonce = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
    redirect_uri: "https://smartboard.co.in/auth/google/callback",
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
  });
  window.location.href = "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
}

function getRoleFromToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).role;
  } catch { return null; }
}


export default function AuthPage() {
  const [showSplash, setShowSplash] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    setShowSplash(true);
  };

  const handleSplashComplete = () => {
    const role = getRoleFromToken();
    navigate(role === "SCHOOL_ADMIN" ? "/school-admin" : "/dashboard", { replace: true });
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleError("");
    setGoogleLoading(true);
    try {
      const res = await api.post("/api/auth/google", { idToken: credentialResponse.credential });
      localStorage.setItem("token", res.data.token);
      setShowSplash(true);
    } catch {
      setGoogleError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* ── Left branding panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-logo">🎓</div>
        <h1 className="auth-brand-title">TeacherAI</h1>
        <p className="auth-brand-sub">
          Smart assessment &amp; lesson planning,<br />powered by AI.
        </p>
        <div className="auth-features">
          <div className="auth-feature-item">
            <span className="auth-feature-icon">📝</span>
            Generate assessments in seconds
          </div>
          <div className="auth-feature-item">
            <span className="auth-feature-icon">📚</span>
            AI-powered lesson plans
          </div>
          <div className="auth-feature-item">
            <span className="auth-feature-icon">📊</span>
            Track student progress
          </div>
          <div className="auth-feature-item">
            <span className="auth-feature-icon">⚡</span>
            Save hours of manual work
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <h2 className="auth-card-heading">Welcome back</h2>
          <p className="auth-card-desc">Sign in to your TeacherAI account.</p>

          {/* Google Sign-In */}
          <div className="google-signin-wrap">
            <button
              type="button"
              onClick={redirectToGoogle}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 10, width: "100%", padding: "10px 16px",
                border: "1.5px solid #d1d5db", borderRadius: 8,
                background: "#fff", cursor: "pointer", fontSize: 15,
                fontWeight: 500, color: "#374151",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          {/* Email login / register */}
          <LoginEmail onLogin={handleLoginSuccess} />

          {/* School CTA */}
          <div style={{ marginTop: 20, padding: "14px 16px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#15803d", fontWeight: 600, margin: "0 0 8px" }}>🏫 Want SmartBoard for your whole school?</p>
            <a href="/school-register" style={{ fontSize: 13, color: "#15803d", fontWeight: 700, textDecoration: "underline" }}>
              Register your school →
            </a>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 28, textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: 18, width: "100%", maxWidth: 420 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Link to="/privacy" className="auth-legal-link privacy">
              Privacy Policy
            </Link>
            <span style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 300 }}>|</span>
            <Link to="/terms" className="auth-legal-link terms">
              Terms &amp; Conditions
            </Link>
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 4px" }}>
            Need help?{" "}
            <a href="tel:+918789225125" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>+91 8789225125</a>
          </p>
          <a href="mailto:support@smartboard.co.in" style={{ fontSize: 11, color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
            support@smartboard.co.in
          </a>
        </div>
      </div>
    </div>
  );
}

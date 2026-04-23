import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import LoginEmail from "./LoginEmail";
import SplashScreen from "./SplashScreen";
import api from "../services/api";
import "./auth.css";

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Constructs OpenID Connect URL with id_token — no Google JS library needed
function triggerMobileGoogleLogin() {
  const nonce = Math.random().toString(36).slice(2);
  sessionStorage.setItem("google_nonce", nonce);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: window.location.origin + "/login",
    response_type: "id_token",
    scope: "email profile openid",
    nonce,
    prompt: "select_account",
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
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

  const handleLoginSuccess = () => setShowSplash(true);

  const handleSplashComplete = () => {
    const role = getRoleFromToken();
    navigate(role === "SCHOOL_ADMIN" ? "/school-admin" : "/dashboard", { replace: true });
  };

  // Desktop — id_token via GoogleLogin component (existing, untouched)
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

  // Mobile — parse id_token from URL hash on Google redirect return
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("id_token")) return;

    const params = new URLSearchParams(hash.slice(1));
    const idToken = params.get("id_token");
    if (!idToken) return;

    window.history.replaceState(null, "", window.location.pathname);
    sessionStorage.removeItem("google_nonce");

    setGoogleLoading(true);
    api.post("/api/auth/google", { idToken })
      .then((res) => {
        localStorage.setItem("token", res.data.token);
        setShowSplash(true);
      })
      .catch(() => setGoogleError("Google sign-in failed. Please try again."))
      .finally(() => setGoogleLoading(false));
  }, []);


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

          {/* Google Sign-In — primary */}
          <div className="google-signin-wrap">
            {googleError && (
              <div className="auth-error" style={{ marginBottom: 8 }}>
                <span>⚠️</span> {googleError}
              </div>
            )}
            {googleLoading ? (
              <div className="google-signin-loading">
                <span className="auth-spinner" /> Signing in with Google…
              </div>
            ) : isMobile ? (
              <button
                onClick={triggerMobileGoogleLogin}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 10, padding: "11px 16px", border: "1.5px solid #d1d5db", borderRadius: 8,
                  background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 500, color: "#374151",
                }}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width={20} height={20} />
                Continue with Google
              </button>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setGoogleError("Google sign-in was cancelled or failed.")}
                width="100%"
                text="continue_with"
                shape="rectangular"
                theme="outline"
                logo_alignment="left"
              />
            )}
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

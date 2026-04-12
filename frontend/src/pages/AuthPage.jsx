import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Login from "./Login";
import LoginEmail from "./LoginEmail";
import "./auth.css";

export default function AuthPage() {
  const [mode, setMode] = useState("EMAIL"); // EMAIL | OTP
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="auth-page">
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
          <h2 className="auth-card-heading">
            {mode === "EMAIL" ? "Welcome back" : "Sign in with OTP"}
          </h2>
          <p className="auth-card-desc">
            {mode === "EMAIL"
              ? "Enter your credentials to access your dashboard."
              : "We'll send a one-time password to your mobile number."}
          </p>

          {/* Mode tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === "EMAIL" ? "active" : ""}`}
              onClick={() => setMode("EMAIL")}
            >
              Email Login
            </button>
            <button
              className={`auth-tab ${mode === "OTP" ? "active" : ""}`}
              onClick={() => setMode("OTP")}
            >
              Mobile OTP
            </button>
          </div>

          {/* Forms */}
          {mode === "EMAIL" ? (
            <LoginEmail onLogin={handleLoginSuccess} onSwitchMode={() => setMode("OTP")} />
          ) : (
            <Login onLogin={handleLoginSuccess} onSwitchMode={() => setMode("EMAIL")} />
          )}
        </div>
      </div>
    </div>
  );
}

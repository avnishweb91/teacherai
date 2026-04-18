import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "./auth.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    if (!token)               { setError("Invalid reset link. Please request a new one."); return; }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || "";
      setError(msg || "Reset failed. The link may have expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: "#dc2626", fontSize: 18, marginBottom: 8 }}>Invalid Reset Link</h2>
            <p style={{ color: "#64748b", fontSize: 14 }}>This link is missing a token. Please use the link from your email.</p>
            <button className="auth-btn" style={{ marginTop: 20 }} onClick={() => navigate("/login")}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ color: "#16a34a", fontSize: 20, marginBottom: 8 }}>Password Reset!</h2>
            <p style={{ color: "#64748b", fontSize: 14 }}>Your password has been updated successfully. Redirecting to login…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Set New Password</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>Enter a new password for your SmartBoard account.</p>
        </div>

        {error && (
          <div className="auth-error" style={{ marginBottom: 16 }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label">New Password</label>
            <div className="auth-pass-wrap">
              <input className="auth-input" type={showPass ? "text" : "password"}
                placeholder="At least 6 characters" value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
              <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirm Password</label>
            <input className="auth-input" type={showPass ? "text" : "password"}
              placeholder="Repeat new password" value={confirm}
              onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
          </div>

          <button type="submit" className="auth-btn" disabled={loading || !password || !confirm}>
            {loading && <span className="auth-spinner" />}
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 16 }}>
          <button type="button" onClick={() => navigate("/login")}
            style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            ← Back to Login
          </button>
        </p>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};
const cardStyle = {
  background: "#fff", borderRadius: 20, padding: "40px 36px",
  width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

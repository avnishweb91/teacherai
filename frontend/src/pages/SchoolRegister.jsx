import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./auth.css";

export default function SchoolRegister() {
  const [schoolName, setSchoolName] = useState("");
  const [address, setAddress]       = useState("");
  const [phone, setPhone]           = useState("");
  const [adminName, setAdminName]   = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (adminPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    if (adminPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res = await api.post("/api/school/register", {
        schoolName, address, phone, adminName, adminEmail, adminPassword,
      });
      localStorage.setItem("token", res.data.token);
      navigate("/school-admin");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || "";
      if (typeof msg === "string" && msg.toLowerCase().includes("already")) {
        setError("This email is already registered.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏫</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Register Your School</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>Get SmartBoard for your entire teaching staff</p>
        </div>

        {error && (
          <div className="auth-error" style={{ marginBottom: 16 }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <p style={{ fontWeight: 700, color: "#1e3a8a", fontSize: 13, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>School Details</p>

          <div className="auth-field">
            <label className="auth-label">School Name</label>
            <input className="auth-input" type="text" placeholder="e.g. Delhi Public School" value={schoolName} onChange={e => setSchoolName(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label className="auth-label">Address <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
            <input className="auth-input" type="text" placeholder="123, Main Road, New Delhi" value={address} onChange={e => setAddress(e.target.value)} />
          </div>

          <div className="auth-field">
            <label className="auth-label">Phone <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
            <input className="auth-input" type="tel" placeholder="School contact number" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <p style={{ fontWeight: 700, color: "#1e3a8a", fontSize: 13, margin: "20px 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>Admin Account</p>

          <div className="auth-field">
            <label className="auth-label">Your Full Name</label>
            <input className="auth-input" type="text" placeholder="Principal / Coordinator name" value={adminName} onChange={e => setAdminName(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label className="auth-label">Email Address</label>
            <input className="auth-input" type="email" placeholder="admin@yourschool.edu" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required autoComplete="email" />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-pass-wrap">
              <input className="auth-input" type={showPass ? "text" : "password"} placeholder="At least 6 characters" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required autoComplete="new-password" />
              <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>{showPass ? "🙈" : "👁️"}</button>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirm Password</label>
            <input className="auth-input" type={showPass ? "text" : "password"} placeholder="Repeat your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading || !schoolName || !adminName || !adminEmail || !adminPassword || !confirmPassword}
            style={{ marginTop: 8 }}
          >
            {loading && <span className="auth-spinner" />}
            {loading ? "Setting up your school…" : "🏫 Create School Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 20 }}>
          Already have an account?{" "}
          <button type="button" onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Sign in
          </button>
        </p>

        <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 8 }}>
          Individual teacher?{" "}
          <button type="button" onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

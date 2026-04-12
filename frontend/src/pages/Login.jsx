import { useState } from "react";
import api from "../services/api";

// step: MOBILE → OTP → REGISTER
export default function Login({ onLogin, onSwitchMode }) {
  const [step, setStep] = useState("MOBILE");

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const steps = [
    { key: "MOBILE", label: "Mobile" },
    { key: "OTP", label: "OTP" },
    { key: "REGISTER", label: "Register" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  /* ── Send OTP ── */
  const sendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/send-otp", { mobile });
      setStep("OTP");
    } catch {
      setError("Failed to send OTP. Please check the number and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Verify OTP ── */
  const verifyOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/verify-otp", { mobile, otp });
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        onLogin();
      } else {
        setStep("REGISTER");
      }
    } catch {
      setError("Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Register ── */
  const registerUser = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/register", { name, email, mobile, password });
      localStorage.setItem("token", res.data.token);
      onLogin();
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Step indicator */}
      <div className="auth-steps">
        {steps.map((s, i) => {
          const isDone = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <div key={s.key} className="auth-step-item">
              <div className="auth-step-wrap">
                <div
                  className={`auth-step-dot ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  className={`auth-step-label ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`auth-step-line ${isDone ? "done" : ""}`} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="auth-error">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── MOBILE step ── */}
      {step === "MOBILE" && (
        <>
          <div className="auth-field">
            <label className="auth-label" htmlFor="mobile">Mobile number</label>
            <input
              id="mobile"
              type="tel"
              className="auth-input"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/, ""))}
              maxLength={10}
              autoComplete="tel"
            />
          </div>

          <button
            className="auth-btn"
            onClick={sendOtp}
            disabled={loading || mobile.length < 10}
          >
            {loading && <span className="auth-spinner" />}
            {loading ? "Sending OTP…" : "Send OTP →"}
          </button>
        </>
      )}

      {/* ── OTP step ── */}
      {step === "OTP" && (
        <>
          <div className="auth-field">
            <label className="auth-label" htmlFor="otp">
              One-time password
              <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 6 }}>
                sent to {mobile}
              </span>
            </label>
            <input
              id="otp"
              type="text"
              className="auth-input"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/, ""))}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>

          <button
            className="auth-btn"
            onClick={verifyOtp}
            disabled={loading || otp.length < 6}
          >
            {loading && <span className="auth-spinner" />}
            {loading ? "Verifying…" : "Verify OTP →"}
          </button>

          <p className="auth-footer">
            Wrong number?{" "}
            <button
              type="button"
              className="auth-link"
              onClick={() => { setStep("MOBILE"); setOtp(""); setError(""); }}
            >
              Go back
            </button>
          </p>
        </>
      )}

      {/* ── REGISTER step ── */}
      {step === "REGISTER" && (
        <>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              type="text"
              className="auth-input"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-email">Email address</label>
            <input
              id="reg-email"
              type="email"
              className="auth-input"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">Create password</label>
            <div className="auth-pass-wrap">
              <input
                id="reg-password"
                type={showPass ? "text" : "password"}
                className="auth-input"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            className="auth-btn"
            onClick={registerUser}
            disabled={loading || !name || !email || !password}
          >
            {loading && <span className="auth-spinner" />}
            {loading ? "Creating account…" : "Create Account →"}
          </button>
        </>
      )}

      {step === "MOBILE" && (
        <p className="auth-footer">
          Have an account?{" "}
          <button type="button" className="auth-link" onClick={onSwitchMode}>
            Sign in with Email
          </button>
        </p>
      )}
    </>
  );
}

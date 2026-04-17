import { useState } from "react";
import api from "../services/api";

export default function LoginEmail({ onLogin }) {
  const [mode, setMode] = useState("LOGIN"); // LOGIN | REGISTER

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const switchMode = (m) => {
    setMode(m);
    setError("");
  };

  /* ── Login ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login-email", { email, password });
      localStorage.setItem("token", res.data.token);
      onLogin();
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Register ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (regPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/register", {
        name: name.trim(),
        email: regEmail.trim(),
        password: regPassword,
      });
      localStorage.setItem("token", res.data.token);
      onLogin();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || "";
      if (typeof msg === "string" && msg.toLowerCase().includes("already")) {
        setError("This email is already registered. Please sign in.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode === "REGISTER") {
    return (
      <form onSubmit={handleRegister} noValidate>
        {error && (
          <div className="auth-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="auth-field">
          <label className="auth-label" htmlFor="reg-name">Full name</label>
          <input
            id="reg-name"
            type="text"
            className="auth-input"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="reg-password">Password</label>
          <div className="auth-pass-wrap">
            <input
              id="reg-password"
              type={showPass ? "text" : "password"}
              className="auth-input"
              placeholder="At least 6 characters"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
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

        <div className="auth-field">
          <label className="auth-label" htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type={showPass ? "text" : "password"}
            className="auth-input"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          className="auth-btn"
          disabled={loading || !name || !regEmail || !regPassword || !confirmPassword}
        >
          {loading && <span className="auth-spinner" />}
          {loading ? "Creating account…" : "Create Account"}
        </button>

        <p className="auth-footer">
          Already have an account?{" "}
          <button type="button" className="auth-link" onClick={() => switchMode("LOGIN")}>
            Sign in
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} noValidate>
      {error && (
        <div className="auth-error">
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="auth-field">
        <label className="auth-label" htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          className="auth-input"
          placeholder="you@school.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="password">Password</label>
        <div className="auth-pass-wrap">
          <input
            id="password"
            type={showPass ? "text" : "password"}
            className="auth-input"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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
        type="submit"
        className="auth-btn"
        disabled={loading || !email || !password}
      >
        {loading && <span className="auth-spinner" />}
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <p className="auth-footer">
        New here?{" "}
        <button type="button" className="auth-link" onClick={() => switchMode("REGISTER")}>
          Create account
        </button>
      </p>
    </form>
  );
}

import { useState } from "react";
import api from "../services/api";

export default function LoginEmail({ onLogin, onSwitchMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        <button type="button" className="auth-link" onClick={onSwitchMode}>
          Sign up with Mobile OTP
        </button>
      </p>
    </form>
  );
}

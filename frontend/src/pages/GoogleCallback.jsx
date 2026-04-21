import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function getRoleFromToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).role;
  } catch { return null; }
}

export default function GoogleCallback() {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");

    if (errorParam) {
      setError("Google sign-in was cancelled.");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
      return;
    }

    if (!code) {
      navigate("/login", { replace: true });
      return;
    }

    const redirectUri = window.location.origin + "/auth/google/callback";

    api.post("/api/auth/google/callback", { code, redirectUri })
      .then(res => {
        localStorage.setItem("token", res.data.token);
        const role = getRoleFromToken();
        navigate(role === "SCHOOL_ADMIN" ? "/school-admin" : "/dashboard", { replace: true });
      })
      .catch(() => {
        setError("Google sign-in failed. Please try again.");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      });
  }, [navigate]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      gap: 16,
      fontFamily: "sans-serif",
      color: "#374151"
    }}>
      {error ? (
        <>
          <span style={{ fontSize: 32 }}>⚠️</span>
          <p style={{ margin: 0 }}>{error}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Redirecting back to login…</p>
        </>
      ) : (
        <>
          <div style={{
            width: 36, height: 36, border: "3px solid #e5e7eb",
            borderTopColor: "#2563eb", borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
          <p style={{ margin: 0 }}>Signing you in with Google…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
}

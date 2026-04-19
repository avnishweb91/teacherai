import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import LoginEmail from "./LoginEmail";
import api from "../services/api";
import "./auth.css";

const TOUR_SLIDES = [
  {
    icon: "🎓",
    title: "Welcome to TeacherAI",
    desc: "Your AI-powered teaching assistant. Save hours of manual work every day with smart tools built for Indian classrooms.",
    color: "#1e3a8a",
    highlights: ["Works with CBSE, ICSE & Bihar Board", "Hindi & English support", "Trusted by teachers across India"],
  },
  {
    icon: "📚",
    title: "Generate Lesson Plans",
    desc: "Create detailed, curriculum-aligned lesson plans in seconds. Just pick your class, subject and topic — AI does the rest.",
    color: "#2563eb",
    highlights: ["Class 1 to 12 support", "3 lesson plans/day on FREE plan", "Unlimited on PRO"],
  },
  {
    icon: "📝",
    title: "Assessment Generator",
    desc: "Build complete question papers with sections A–E, multiple question types, marks allocation and difficulty levels.",
    color: "#7c3aed",
    highlights: ["MCQ, Short & Long answer types", "Auto answer key generation", "PDF download ready"],
  },
  {
    icon: "📋",
    title: "Notice & Report Cards",
    desc: "Generate professional school circulars and AI-written personalised remarks for every student's report card.",
    color: "#059669",
    highlights: ["12+ notice templates", "Auto attendance sync", "Bulk PDF download for entire class"],
  },
  {
    icon: "🗓️",
    title: "Planner & Timetable",
    desc: "Build monthly academic planners and weekly timetables with PDF, Excel and Word export in one click.",
    color: "#d97706",
    highlights: ["Drag & fill timetable grid", "Holiday & event support", "Export to PDF / Excel / Word"],
  },
  {
    icon: "🚀",
    title: "Ready to get started?",
    desc: "FREE plan includes core features to try everything. Upgrade to PRO at just ₹199/month for unlimited access.",
    color: "#dc2626",
    highlights: ["No credit card required to start", "Upgrade anytime from your profile", "Payments via UPI, cards & net banking"],
  },
];

function TourModal({ onClose }) {
  const [slide, setSlide] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);
  const total = TOUR_SLIDES.length;

  const goTo = (index) => {
    if (animating || index === slide) return;
    setAnimating(true);
    setTimeout(() => {
      setSlide(index);
      setAnimating(false);
    }, 220);
  };

  const next = () => goTo(slide < total - 1 ? slide + 1 : slide);
  const prev = () => goTo(slide > 0 ? slide - 1 : slide);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlide(s => (s < total - 1 ? s + 1 : s));
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSlide(s => (s < total - 1 ? s + 1 : s));
    }, 4000);
  };

  const handleNav = (fn) => { fn(); resetTimer(); };

  const handleClose = () => {
    if (dontShow) localStorage.setItem("tour_seen", "1");
    onClose();
  };

  const current = TOUR_SLIDES[slide];

  return (
    <div className="tour-backdrop">
      <div className="tour-modal">
        <button className="tour-close" onClick={handleClose}>×</button>
        <div className={`tour-slide ${animating ? "tour-slide-exit" : "tour-slide-enter"}`}>
          <div className="tour-icon" style={{ background: current.color + "18", border: `2px solid ${current.color}30` }}>
            <span style={{ fontSize: 40 }}>{current.icon}</span>
          </div>
          <h2 className="tour-title" style={{ color: current.color }}>{current.title}</h2>
          <p className="tour-desc">{current.desc}</p>
          <div className="tour-highlights">
            {current.highlights.map((h) => (
              <div key={h} className="tour-highlight-item">
                <span style={{ color: current.color, fontWeight: 800, marginRight: 8 }}>✓</span>
                {h}
              </div>
            ))}
          </div>
        </div>
        <div className="tour-dots">
          {TOUR_SLIDES.map((_, i) => (
            <button
              key={i}
              className={`tour-dot ${i === slide ? "active" : ""}`}
              style={i === slide ? { background: current.color } : {}}
              onClick={() => handleNav(() => goTo(i))}
            />
          ))}
        </div>
        <div className="tour-nav">
          <button className="tour-btn-ghost" onClick={() => handleNav(prev)} disabled={slide === 0}>
            ← Prev
          </button>
          {slide < total - 1 ? (
            <button className="tour-btn-primary" style={{ background: current.color }} onClick={() => handleNav(next)}>
              Next →
            </button>
          ) : (
            <button className="tour-btn-primary" style={{ background: current.color }} onClick={handleClose}>
              Get Started →
            </button>
          )}
        </div>
        <div className="tour-footer">
          <label className="tour-checkbox-label">
            <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} />
            Don't show this again
          </label>
          <button className="tour-skip" onClick={handleClose}>Skip tour</button>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [showTour, setShowTour] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("tour_seen")) {
      setShowTour(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    navigate("/dashboard", { replace: true });
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleError("");
    setGoogleLoading(true);
    try {
      const res = await api.post("/api/auth/google", { idToken: credentialResponse.credential });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard", { replace: true });
    } catch {
      setGoogleError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {showTour && <TourModal onClose={() => setShowTour(false)} />}

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
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <Link to="/privacy" style={{ fontSize: 12, color: "#64748b", textDecoration: "none", fontWeight: 500 }}>
              Privacy Policy
            </Link>
            <span style={{ color: "#cbd5e1", fontSize: 14 }}>|</span>
            <Link to="/terms" style={{ fontSize: 12, color: "#64748b", textDecoration: "none", fontWeight: 500 }}>
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

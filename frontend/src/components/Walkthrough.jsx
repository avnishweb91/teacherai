import { useState, useEffect, useCallback } from "react";

const STEPS = [
  {
    target: '[data-tour="dashboard-header"]',
    title: "Welcome to your Dashboard",
    desc: "This is your command centre. All your AI-powered teaching tools are right here.",
    position: "bottom",
    icon: "🏠",
  },
  {
    target: '[data-tour="quick-actions"]',
    title: "Quick Action Cards",
    desc: "Click any card to jump straight to a tool — lesson plans, assessments, notices and more.",
    position: "top",
    icon: "⚡",
  },
  {
    target: '[data-tour="nav-lesson"]',
    title: "Generate Lesson Plans",
    desc: "Pick your class, subject and topic — AI builds a complete lesson plan in seconds.",
    position: "right",
    icon: "📘",
  },
  {
    target: '[data-tour="nav-assessment"]',
    title: "Assessment Generator",
    desc: "Create full question papers with sections A–E, MCQs, short & long answers. PDF ready.",
    position: "right",
    icon: "📝",
  },
  {
    target: '[data-tour="nav-notice"]',
    title: "Notice / Circular Generator",
    desc: "Generate professional school circulars for PTM, exams, holidays and more in seconds.",
    position: "right",
    icon: "📢",
  },
  {
    target: '[data-tour="nav-report-card"]',
    title: "Report Card Generator",
    desc: "Enter student marks — AI writes personalised remarks for every student. Bulk PDF export.",
    position: "right",
    icon: "📄",
  },
  {
    target: '[data-tour="nav-profile"]',
    title: "Profile & Plan Upgrade",
    desc: "Manage your account here. Upgrade to PRO (₹199/mo) for unlimited access to all features.",
    position: "right",
    icon: "👤",
  },
];

const TOOLTIP_GAP = 16;
const TOOLTIP_W   = 300;
const TOOLTIP_H   = 160;

function getRect(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
}

function calcTooltipPos(rect, preferred) {
  if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const positions = {
    right: {
      top:  Math.min(rect.top, vh - TOOLTIP_H - 16),
      left: rect.right + TOOLTIP_GAP,
      fits: rect.right + TOOLTIP_GAP + TOOLTIP_W < vw,
    },
    left: {
      top:  Math.min(rect.top, vh - TOOLTIP_H - 16),
      left: rect.left - TOOLTIP_GAP - TOOLTIP_W,
      fits: rect.left - TOOLTIP_GAP - TOOLTIP_W > 0,
    },
    bottom: {
      top:  rect.bottom + TOOLTIP_GAP,
      left: Math.min(Math.max(rect.left, 16), vw - TOOLTIP_W - 16),
      fits: rect.bottom + TOOLTIP_GAP + TOOLTIP_H < vh,
    },
    top: {
      top:  rect.top - TOOLTIP_GAP - TOOLTIP_H,
      left: Math.min(Math.max(rect.left, 16), vw - TOOLTIP_W - 16),
      fits: rect.top - TOOLTIP_GAP - TOOLTIP_H > 0,
    },
  };

  const order = [preferred, "right", "bottom", "left", "top"];
  for (const p of order) {
    if (positions[p]?.fits) return { top: positions[p].top, left: positions[p].left };
  }
  // fallback: center
  return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
}

export default function Walkthrough({ onFinish }) {
  const [step,   setStep]   = useState(0);
  const [rect,   setRect]   = useState(null);
  const [render, setRender] = useState(true);

  const current = STEPS[step];
  const total   = STEPS.length;

  const measureTarget = useCallback(() => {
    const r = getRect(current.target);
    setRect(r);
    if (r) {
      document.querySelector(current.target)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [current.target]);

  useEffect(() => {
    setRender(false);
    const t = setTimeout(() => {
      measureTarget();
      setRender(true);
    }, 120);
    return () => clearTimeout(t);
  }, [step, measureTarget]);

  useEffect(() => {
    const onResize = () => measureTarget();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureTarget]);

  const next = () => {
    if (step < total - 1) setStep(s => s + 1);
    else handleFinish();
  };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const handleFinish = () => {
    localStorage.setItem("walkthrough_seen", "1");
    onFinish();
  };

  const tooltipPos = calcTooltipPos(rect, current.position);

  return (
    <>
      {/* Dark overlay — full screen */}
      <div
        onClick={handleFinish}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(5, 15, 40, 0.65)",
          zIndex: 9990,
        }}
      />

      {/* Spotlight hole — sits on top of overlay, clears the target */}
      {rect && (
        <div
          style={{
            position:  "fixed",
            top:       rect.top  - 6,
            left:      rect.left - 6,
            width:     rect.width  + 12,
            height:    rect.height + 12,
            borderRadius: 10,
            boxShadow: "0 0 0 9999px rgba(5, 15, 40, 0.65)",
            zIndex:    9991,
            pointerEvents: "none",
            outline:   "2.5px solid #2563eb",
            outlineOffset: "2px",
            animation: "wt-pulse 1.8s ease-in-out infinite",
          }}
        />
      )}

      {/* Tooltip card */}
      {render && (
        <div
          style={{
            position: "fixed",
            ...tooltipPos,
            width:      TOOLTIP_W,
            zIndex:     9999,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
            padding:    "20px 20px 16px",
            animation:  "wt-pop 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{
              fontSize: 22,
              background: "#eff6ff", borderRadius: 8,
              width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {current.icon}
            </span>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", lineHeight: 1.3 }}>
              {current.title}
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 14px" }}>
            {current.desc}
          </p>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 4,
                width:  i === step ? 20 : 6,
                borderRadius: 99,
                background: i <= step ? "#2563eb" : "#e2e8f0",
                transition: "all 0.3s",
              }} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {step > 0 && (
              <button onClick={prev} style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1.5px solid #e2e8f0", background: "transparent",
                color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                ← Back
              </button>
            )}

            <button onClick={next} style={{
              flex: 1, padding: "8px 14px", borderRadius: 8,
              border: "none", background: "#2563eb",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}>
              {step === total - 1 ? "Finish Tour ✓" : `Next (${step + 1}/${total}) →`}
            </button>

            <button onClick={handleFinish} style={{
              padding: "7px 10px", borderRadius: 8,
              border: "1.5px solid #e2e8f0", background: "transparent",
              color: "#94a3b8", fontSize: 12, cursor: "pointer",
            }}>
              Skip
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wt-pulse {
          0%,100% { outline-color: #2563eb; box-shadow: 0 0 0 9999px rgba(5,15,40,0.65), 0 0 0 4px rgba(37,99,235,0.2); }
          50%      { outline-color: #60a5fa; box-shadow: 0 0 0 9999px rgba(5,15,40,0.65), 0 0 0 8px rgba(37,99,235,0.15); }
        }
        @keyframes wt-pop {
          from { opacity:0; transform: scale(0.92); }
          to   { opacity:1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}

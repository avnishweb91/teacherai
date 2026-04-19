import { useState, useEffect } from "react";
import "./SplashScreen.css";

const TIPS = [
  "Loading your lesson tools…",
  "Preparing your classroom…",
  "Syncing your data…",
  "Almost ready!",
];

const TOTAL_MS = 5000;
const TIP_INTERVAL = 1000;

export default function SplashScreen({ onComplete }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [tipKey, setTipKey] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
      setTipKey((k) => k + 1);
    }, TIP_INTERVAL);

    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, TOTAL_MS - 500);

    const doneTimer = setTimeout(() => {
      onComplete();
    }, TOTAL_MS);

    return () => {
      clearInterval(tipTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash${exiting ? " exit" : ""}`}>
      {/* Floating background orbs */}
      <div className="splash-orb splash-orb-1" />
      <div className="splash-orb splash-orb-2" />
      <div className="splash-orb splash-orb-3" />

      <div className="splash-content">
        <span className="splash-logo">🎓</span>

        <h1 className="splash-title">TeacherAI</h1>
        <p className="splash-tagline">Smart Teaching, Powered by AI</p>

        <div className="splash-progress-wrap">
          <div className="splash-progress-bar" />
        </div>

        <div className="splash-tip">
          <span key={tipKey}>{TIPS[tipIndex]}</span>
        </div>

        <div className="splash-dots">
          <div className="splash-dot" />
          <div className="splash-dot" />
          <div className="splash-dot" />
        </div>
      </div>

      <div className="splash-brand">smartboard.co.in</div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import "./dashboard.css";

const PAGE_META = {
  "/dashboard":  "Dashboard — SmartBoard AI",
  "/lesson":     "AI Lesson Plan Generator — SmartBoard AI",
  "/history":    "Lesson History — SmartBoard AI",
  "/assessment": "Question Paper Generator — SmartBoard AI",
  "/attendance": "Attendance Manager — SmartBoard AI",
  "/planner":    "Monthly Planner — SmartBoard AI",
  "/report-card":"Report Card Generator — SmartBoard AI",
  "/notice":     "Notice & Circular Generator — SmartBoard AI",
  "/timetable":  "Timetable Builder — SmartBoard AI",
  "/syllabus":   "Syllabus Tracker — SmartBoard AI",
  "/exam":       "Exam Schedule — SmartBoard AI",
  "/homework":   "Homework Tracker — SmartBoard AI",
  "/parents":    "Parent Communication — SmartBoard AI",
  "/doubt":      "Doubt Solver — SmartBoard AI",
  "/profile":    "My Profile — SmartBoard AI",
  "/upgrade":    "Upgrade to PRO — SmartBoard AI",
};

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = PAGE_META[pathname] || "SmartBoard AI — Smart Teaching Assistant";
  }, [pathname]);

  return (
    <div className="dash-shell">
      {/* mobile overlay */}
      <div
        className={`dash-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="dash-main">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}

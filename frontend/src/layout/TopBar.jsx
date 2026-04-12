import { useNavigate, useLocation } from "react-router-dom";

const PAGE_TITLES = {
  "/dashboard":  "Dashboard",
  "/lesson":     "Generate Lesson",
  "/history":    "Lesson History",
  "/assessment": "Assessment Generator",
  "/attendance": "Attendance Manager",
  "/planner":      "Monthly Planner",
  "/report-card":  "Report Card Generator",
  "/notice":       "Notice / Circular Generator",
  "/timetable":    "Timetable Builder",
  "/profile":      "My Profile",
};

export default function TopBar({ onMenuToggle }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const title = PAGE_TITLES[pathname] || "TeacherAI";

  return (
    <header className="dash-topbar">
      <div className="dash-topbar-left">
        <button className="dash-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
          ☰
        </button>
        <span className="dash-topbar-title">{title}</span>
      </div>

      <div className="dash-topbar-right">
        <div className="dash-topbar-avatar">T</div>
        <button className="dash-logout-btn" onClick={handleLogout}>
          ⎋ Logout
        </button>
      </div>
    </header>
  );
}

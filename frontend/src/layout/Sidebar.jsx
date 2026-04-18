import { NavLink } from "react-router-dom";

function getRoleFromToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).role;
  } catch { return null; }
}

const NAV_ITEMS = [
  { to: "/dashboard",  icon: "🏠", label: "Dashboard",              tour: null },
  { to: "/lesson",     icon: "📘", label: "Generate Lesson",        tour: "nav-lesson" },
  { to: "/history",    icon: "📂", label: "Lesson History",         tour: null },
  { to: "/assessment", icon: "📝", label: "Assessment",             tour: "nav-assessment" },
  { to: "/attendance", icon: "✅", label: "Attendance",             tour: null },
  { to: "/planner",    icon: "📅", label: "Monthly Planner",        tour: null },
  { to: "/report-card",icon: "📄", label: "Report Cards",           tour: "nav-report-card" },
  { to: "/notice",     icon: "📢", label: "Notice / Circular",      tour: "nav-notice" },
  { to: "/timetable",  icon: "🗓️", label: "Timetable Builder",      tour: null },
  { to: "/doubt",      icon: "💡", label: "Doubt Solver",           tour: null },
  { to: "/profile",    icon: "👤", label: "Profile",                tour: "nav-profile" },
];

export default function Sidebar({ open, onClose }) {
  const isAdmin = getRoleFromToken() === "ADMIN";

  return (
    <aside className={`dash-sidebar ${open ? "open" : ""}`}>
      <div className="dash-sidebar-logo">
        <div className="dash-sidebar-logo-text">TeacherAI</div>
        <div className="dash-sidebar-logo-sub">Smart teaching, powered by AI</div>
      </div>

      <nav className="dash-nav">
        {NAV_ITEMS.map(({ to, icon, label, tour }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `dash-nav-item ${isActive ? "active" : ""}`}
            onClick={onClose}
            {...(tour ? { "data-tour": tour } : {})}
          >
            <span className="dash-nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {isAdmin && (
        <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <NavLink
            to="/admin"
            className={({ isActive }) => `dash-nav-item ${isActive ? "active" : ""}`}
            onClick={onClose}
            style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}
          >
            <span className="dash-nav-icon">🛡️</span>
            Admin Panel
          </NavLink>
        </div>
      )}

      <div className="dash-sidebar-footer">© 2025 TeacherAI</div>
    </aside>
  );
}

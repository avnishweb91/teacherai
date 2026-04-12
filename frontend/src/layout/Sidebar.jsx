import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard",  icon: "🏠", label: "Dashboard" },
  { to: "/lesson",     icon: "📘", label: "Generate Lesson" },
  { to: "/history",    icon: "📂", label: "Lesson History" },
  { to: "/assessment",  icon: "📝", label: "Assessment" },
  { to: "/attendance",  icon: "✅", label: "Attendance" },
  { to: "/planner",      icon: "📅", label: "Monthly Planner" },
  { to: "/report-card", icon: "📄", label: "Report Cards" },
  { to: "/notice",      icon: "📢", label: "Notice / Circular" },
  { to: "/timetable",   icon: "🗓️", label: "Timetable Builder" },
  { to: "/profile",     icon: "👤", label: "Profile" },
];

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`dash-sidebar ${open ? "open" : ""}`}>
      <div className="dash-sidebar-logo">
        <div className="dash-sidebar-logo-text">TeacherAI</div>
        <div className="dash-sidebar-logo-sub">Smart teaching, powered by AI</div>
      </div>

      <nav className="dash-nav">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `dash-nav-item ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            <span className="dash-nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="dash-sidebar-footer">© 2025 TeacherAI</div>
    </aside>
  );
}

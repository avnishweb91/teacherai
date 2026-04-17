import { NavLink } from "react-router-dom";

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
  { to: "/profile",    icon: "👤", label: "Profile",                tour: "nav-profile" },
];

export default function Sidebar({ open, onClose }) {
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

      <div className="dash-sidebar-footer">© 2025 TeacherAI</div>
    </aside>
  );
}

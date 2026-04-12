import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import "./dashboard.css";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

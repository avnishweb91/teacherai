import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";

export default function Dashboard() {
  const navigate = useNavigate();

  const lessons = JSON.parse(localStorage.getItem("lessons") || "[]");

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Welcome back 👋</h1>
        <p className="page-subtitle">Here's what's happening with your teaching tools today.</p>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📘</div>
          <div>
            <div className="stat-value">{lessons.length}</div>
            <div className="stat-label">Lessons Generated</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📝</div>
          <div>
            <div className="stat-value">—</div>
            <div className="stat-label">Assessments Created</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">⚡</div>
          <div>
            <div className="stat-value">AI</div>
            <div className="stat-label">Powered by OpenAI</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">🎯</div>
          <div>
            <div className="stat-value">CBSE</div>
            <div className="stat-label">Default Board</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <p className="section-divider-label">Quick Actions</p>
      <div className="action-grid">
        <button className="action-card" onClick={() => navigate("/lesson")}>
          <div className="action-card-icon">📘</div>
          <div className="action-card-title">Generate Lesson Plan</div>
          <div className="action-card-desc">
            Create AI-powered lesson plans tailored to your syllabus, grade, and topic in seconds.
          </div>
          <div className="action-card-arrow">Create lesson →</div>
        </button>

        <button className="action-card" onClick={() => navigate("/assessment")}>
          <div className="action-card-icon">📝</div>
          <div className="action-card-title">Create Assessment</div>
          <div className="action-card-desc">
            Generate question papers with custom sections, difficulty levels, and answer keys.
          </div>
          <div className="action-card-arrow">Create assessment →</div>
        </button>

        <button className="action-card" onClick={() => navigate("/history")}>
          <div className="action-card-icon">📂</div>
          <div className="action-card-title">Lesson History</div>
          <div className="action-card-desc">
            Browse and review all your previously generated lesson plans in one place.
          </div>
          <div className="action-card-arrow">View history →</div>
        </button>

        <button className="action-card" onClick={() => navigate("/attendance")}>
          <div className="action-card-icon">✅</div>
          <div className="action-card-title">Attendance Manager</div>
          <div className="action-card-desc">
            Mark daily attendance, view monthly register, and flag students below 75%.
          </div>
          <div className="action-card-arrow">Manage attendance →</div>
        </button>

        <button className="action-card" onClick={() => navigate("/planner")}>
          <div className="action-card-icon">📅</div>
          <div className="action-card-title">Monthly Planner</div>
          <div className="action-card-desc">
            Generate a day-wise activity planner for any class and month — customisable with your own topics.
          </div>
          <div className="action-card-arrow">Generate planner →</div>
        </button>

        <button className="action-card" onClick={() => navigate("/report-card")}>
          <div className="action-card-icon">📄</div>
          <div className="action-card-title">Report Card Generator</div>
          <div className="action-card-desc">
            Enter student marks and let AI write personalised remarks — download printable PDF report cards instantly.
          </div>
          <div className="action-card-arrow">Generate report cards →</div>
        </button>

        <button className="action-card" onClick={() => navigate("/notice")}>
          <div className="action-card-icon">📢</div>
          <div className="action-card-title">Notice / Circular Generator</div>
          <div className="action-card-desc">
            AI-generated parent circulars for PTM, fee, exams, holidays and more — with school letterhead and acknowledgement slip.
          </div>
          <div className="action-card-arrow">Create notice →</div>
        </button>

        <button className="action-card" onClick={() => navigate("/timetable")}>
          <div className="action-card-icon">🗓️</div>
          <div className="action-card-title">Timetable Builder</div>
          <div className="action-card-desc">
            Build a colour-coded class timetable with custom periods, breaks, and school logo — download as a printable PDF.
          </div>
          <div className="action-card-arrow">Build timetable →</div>
        </button>
      </div>
    </DashboardLayout>
  );
}

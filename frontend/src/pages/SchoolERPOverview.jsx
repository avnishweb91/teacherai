import { Link } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";

const MODULES = [
  { icon: "👥", title: "Student Information", description: "Student, guardian, class and academic records in one place.", to: "/school-admin", state: "Admin foundation" },
  { icon: "✅", title: "Attendance & Leave", description: "Daily attendance, monthly registers and attendance insights.", to: "/attendance", state: "Available" },
  { icon: "📚", title: "Teaching & Learning", description: "Lesson plans, assessments, homework and syllabus progress.", to: "/dashboard", state: "Available" },
  { icon: "🗓️", title: "Timetable & Exams", description: "Class timetables, exam schedules and academic planning.", to: "/timetable", state: "Available" },
  { icon: "📣", title: "Communication", description: "Notices, circulars, parent updates and homework communication.", to: "/notice", state: "Available" },
  { icon: "📊", title: "Results & Report Cards", description: "Generate personalised remarks and keep academic reporting consistent.", to: "/report-card", state: "Available" },
  { icon: "💳", title: "Fees & Finance", description: "Fee structures, dues, receipts and finance reporting for the next rollout.", to: "/school-register", state: "Configure with us" },
  { icon: "🚌", title: "Transport, Library & Inventory", description: "Manage routes, assets, books and issue registers as your ERP grows.", to: "/school-register", state: "Configure with us" },
  { icon: "🧑‍💼", title: "Staff & Payroll", description: "Staff records, leave, roles and payroll-ready workflows for administrators.", to: "/school-register", state: "Configure with us" },
];

export default function SchoolERPOverview() {
  return (
    <DashboardLayout>
      <div className="erp-page">
        <div className="erp-hero">
          <div>
            <p className="erp-kicker">School operations</p>
            <h1>One command centre for your school.</h1>
            <p>Connect your academic, administrative and family workflows without losing the teacher tools your team already uses.</p>
          </div>
          <Link className="erp-hero-action" to="/school-admin">Open school admin →</Link>
        </div>

        <div className="erp-stat-row">
          <div><strong>9</strong><span>ERP workspaces</span></div>
          <div><strong>6</strong><span>Live today</span></div>
          <div><strong>1</strong><span>Connected school record</span></div>
        </div>

        <div className="erp-section-heading">
          <div><p className="erp-kicker">Your school suite</p><h2>Everything in one place</h2></div>
          <span>Built to expand department by department</span>
        </div>
        <div className="erp-module-grid">
          {MODULES.map((module) => (
            <Link className="erp-module-card" to={module.to} key={module.title}>
              <div className="erp-module-top"><span className="erp-module-icon">{module.icon}</span><span className={`erp-module-state ${module.state === "Available" || module.state === "Admin foundation" ? "is-live" : "is-config"}`}>{module.state}</span></div>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
              <span className="erp-open">{module.state === "Configure with us" ? "Talk to our team" : "Open workspace"} <span>↗</span></span>
            </Link>
          ))}
        </div>

        <div className="erp-bottom-cta">
          <div><p className="erp-kicker">Ready for the whole school?</p><h2>Give your team one shared system.</h2><p>Register your school and we’ll help you map the right ERP rollout for your staff, students and families.</p></div>
          <Link className="erp-hero-action" to="/school-register">Register your school →</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

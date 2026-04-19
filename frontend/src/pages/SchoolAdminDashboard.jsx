import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";

export default function SchoolAdminDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);
  const [removing, setRemoving] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await api.get("/api/school/dashboard");
      setData(res.data);
    } catch {
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(data.school.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const removeTeacher = async (id, name) => {
    if (!window.confirm(`Remove ${name} from your school? They will lose SCHOOL plan access.`)) return;
    setRemoving(id);
    try {
      await api.delete(`/api/school/teacher/${id}`);
      await load();
    } catch {
      alert("Failed to remove teacher.");
    } finally {
      setRemoving(null);
    }
  };

  const FEATURE_LABELS = {
    LESSON: "Lesson Plans", ASSESSMENT: "Assessments", NOTICE: "Notices",
    REPORTCARD: "Report Cards", DOUBT: "Doubt Solver", PLANNER: "Monthly Planner",
  };

  if (loading) return (
    <DashboardLayout>
      <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading school dashboard…</div>
    </DashboardLayout>
  );

  const { school, teachers, teacherCount, totalUsage, usageByFeature, weeklyActivity, activeThisWeek } = data;
  const isTrial   = school.subscriptionStatus === "TRIAL";
  const isExpired = school.subscriptionStatus === "EXPIRED";
  const trialDaysLeft = school.trialDaysLeft ?? 0;
  const trialTeacherLimit = school.trialTeacherLimit ?? 5;
  const weekDays = Object.entries(weeklyActivity || {});
  const weekMax  = Math.max(...weekDays.map(([, v]) => v), 1);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">🏫 School Dashboard</h1>
        <p className="page-subtitle">{school.name} — manage your teachers and view usage analytics.</p>
      </div>

      {/* ── Trial / Expired banner ── */}
      {isExpired && (
        <div style={{
          maxWidth: 900, marginBottom: 20, padding: "16px 20px", borderRadius: 12,
          background: "#fef2f2", border: "2px solid #fca5a5",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <p style={{ fontWeight: 800, color: "#dc2626", fontSize: 15, margin: "0 0 4px" }}>
              🔴 Your free trial has expired
            </p>
            <p style={{ fontSize: 13, color: "#7f1d1d", margin: 0 }}>
              Teachers can no longer join using the invite code. Contact us to activate your school plan and continue with unlimited access.
            </p>
          </div>
          <a href="mailto:support@smartboard.co.in?subject=SmartBoard School Plan Activation"
            style={{ background: "#dc2626", color: "#fff", borderRadius: 10, padding: "10px 20px",
              fontWeight: 700, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>
            Contact to Activate →
          </a>
        </div>
      )}

      {isTrial && (
        <div style={{
          maxWidth: 900, marginBottom: 20, padding: "14px 20px", borderRadius: 12,
          background: trialDaysLeft <= 2 ? "#fef3c7" : "#eff6ff",
          border: `2px solid ${trialDaysLeft <= 2 ? "#fcd34d" : "#93c5fd"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <p style={{ fontWeight: 700, color: trialDaysLeft <= 2 ? "#92400e" : "#1e40af", fontSize: 14, margin: "0 0 3px" }}>
              {trialDaysLeft <= 2 ? "⚠️" : "🕐"} Free Trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining
            </p>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
              {teacherCount} / {trialTeacherLimit} teachers joined · Trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}.
              Contact us to upgrade for unlimited teachers and continued access.
            </p>
          </div>
          <a href="mailto:support@smartboard.co.in?subject=SmartBoard School Plan - Upgrade Request"
            style={{ background: "#2563eb", color: "#fff", borderRadius: 10, padding: "10px 20px",
              fontWeight: 700, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>
            Upgrade Plan →
          </a>
        </div>
      )}

      {/* Stats row */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon blue">👨‍🏫</div>
          <div><div className="stat-value">{teacherCount}</div><div className="stat-label">Teachers</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">⚡</div>
          <div><div className="stat-value">{totalUsage}</div><div className="stat-label">Total AI Generations</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📋</div>
          <div><div className="stat-value">{usageByFeature["LESSON"] || 0}</div><div className="stat-label">Lesson Plans</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">📝</div>
          <div><div className="stat-value">{usageByFeature["ASSESSMENT"] || 0}</div><div className="stat-label">Assessments</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🟢</div>
          <div><div className="stat-value">{activeThisWeek || 0}</div><div className="stat-label">Active This Week</div></div>
        </div>
      </div>

      {/* Weekly activity chart */}
      <div className="card" style={{ maxWidth: 900, marginBottom: 20 }}>
        <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 15, marginBottom: 16 }}>
          AI Generations — Last 7 Days
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
          {weekDays.map(([date, count]) => {
            const pct = Math.round((count / weekMax) * 100);
            const d = new Date(date + "T00:00:00");
            const label = d.toLocaleDateString("en-IN", { weekday: "short" });
            const isToday = date === new Date().toISOString().slice(0, 10);
            return (
              <div key={date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{count > 0 ? count : ""}</span>
                <div style={{ width: "100%", background: "#e2e8f0", borderRadius: 6, overflow: "hidden", height: 64 }}>
                  <div style={{
                    width: "100%", height: `${pct}%`, marginTop: `${100 - pct}%`,
                    background: isToday ? "linear-gradient(180deg,#2563eb,#7c3aed)" : "#93c5fd",
                    borderRadius: 6, transition: "height 0.4s",
                  }} />
                </div>
                <span style={{ fontSize: 10, color: isToday ? "#2563eb" : "#94a3b8", fontWeight: isToday ? 700 : 400 }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 900 }}>

        {/* Invite Code card */}
        <div className="card">
          <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 15, marginBottom: 16 }}>Teacher Invite Code</p>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
            Share this code with your teachers. They enter it during registration to join your school and get unlimited access.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              flex: 1, background: "#eff6ff", border: "2px dashed #93c5fd",
              borderRadius: 12, padding: "14px 20px", textAlign: "center",
              fontSize: 28, fontWeight: 900, letterSpacing: 6, color: "#1e3a8a",
            }}>
              {school.inviteCode}
            </div>
            <button
              onClick={copyCode}
              className="btn-primary"
              style={{ whiteSpace: "nowrap", padding: "12px 18px" }}
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>
            This code is permanent and unique to your school.
          </p>
        </div>

        {/* School info card */}
        <div className="card">
          <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 15, marginBottom: 16 }}>School Information</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b", minWidth: 80 }}>Name</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{school.name}</span>
            </div>
            {school.address && (
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#64748b", minWidth: 80 }}>Address</span>
                <span style={{ fontSize: 13, color: "#0f172a" }}>{school.address}</span>
              </div>
            )}
            {school.phone && (
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#64748b", minWidth: 80 }}>Phone</span>
                <span style={{ fontSize: 13, color: "#0f172a" }}>{school.phone}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b", minWidth: 80 }}>Plan</span>
              <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>SCHOOL PLAN</span>
            </div>
          </div>

          {/* Usage by feature — horizontal bars */}
          {Object.keys(usageByFeature).length > 0 && (
            <>
              <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 13, marginTop: 20, marginBottom: 12 }}>Usage by Feature</p>
              {(() => {
                const maxVal = Math.max(...Object.values(usageByFeature), 1);
                return Object.entries(usageByFeature)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "#64748b" }}>{FEATURE_LABELS[k] || k}</span>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{v}</span>
                      </div>
                      <div style={{ background: "#e2e8f0", borderRadius: 99, height: 6 }}>
                        <div style={{
                          background: "linear-gradient(90deg,#2563eb,#7c3aed)",
                          borderRadius: 99, height: 6,
                          width: `${Math.round((v / maxVal) * 100)}%`,
                          transition: "width 0.5s",
                        }} />
                      </div>
                    </div>
                  ));
              })()}
            </>
          )}
        </div>
      </div>

      {/* Teachers table */}
      <div className="card" style={{ maxWidth: 900, marginTop: 20 }}>
        <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 15, marginBottom: 16 }}>
          Teachers ({teacherCount})
        </p>

        {teachers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍🏫</div>
            <p>No teachers have joined yet.</p>
            <p style={{ fontSize: 13 }}>Share the invite code above with your staff.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Joined</th>
                  <th style={th}>Plan</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={td}><span style={{ fontWeight: 600 }}>{t.name}</span></td>
                    <td style={td}>{t.email}</td>
                    <td style={td}>{new Date(t.createdAt).toLocaleDateString("en-IN")}</td>
                    <td style={td}>
                      <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                        {t.planType}
                      </span>
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => removeTeacher(t.id, t.name)}
                        disabled={removing === t.id}
                        style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        {removing === t.id ? "…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const th = { padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 };
const td = { padding: "12px 14px", color: "#0f172a" };

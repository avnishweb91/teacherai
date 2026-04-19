import { useEffect, useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";

const FEATURE_COLORS = {
  LESSON:     "#2563eb",
  ASSESSMENT: "#7c3aed",
  NOTICE:     "#059669",
  REPORTCARD: "#d97706",
};

const FEATURE_LABELS = {
  LESSON:     "Lesson Plan",
  ASSESSMENT: "Assessment",
  NOTICE:     "Notice",
  REPORTCARD: "Report Card",
};

function StatCard({ label, value, sub, color = "#2563eb", icon }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "22px 24px",
      border: "1px solid #e2e8f0", flex: "1 1 160px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function UsageChart({ dates, series }) {
  if (!dates?.length || !series?.length) return (
    <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>No usage data yet.</div>
  );

  const allCounts = series.flatMap(s => s.counts);
  const max = Math.max(...allCounts, 1);

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", minWidth: dates.length * 52, paddingBottom: 8 }}>
        {dates.map((date, di) => (
          <div key={date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            {series.map(s => {
              const count = s.counts[di] || 0;
              const color = FEATURE_COLORS[s.feature] || "#94a3b8";
              return (
                <div
                  key={s.feature}
                  title={`${FEATURE_LABELS[s.feature] || s.feature}: ${count}`}
                  style={{
                    width: "100%", borderRadius: 4,
                    height: Math.max((count / max) * 120, count > 0 ? 4 : 0),
                    background: color, opacity: 0.85,
                    transition: "height 0.3s",
                  }}
                />
              );
            })}
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, writingMode: "vertical-lr", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>
              {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12 }}>
        {series.map(s => (
          <div key={s.feature} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: FEATURE_COLORS[s.feature] || "#94a3b8" }} />
            {FEATURE_LABELS[s.feature] || s.feature}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [usage,   setUsage]   = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState("users"); // users | schools
  const [search,  setSearch]  = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [usageDays, setUsageDays]   = useState(7);
  const [activating, setActivating] = useState(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadUsage(); }, [usageDays]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, u, g, sc] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/admin/users"),
        api.get(`/api/admin/usage?days=${usageDays}`),
        api.get("/api/admin/schools"),
      ]);
      setStats(s.data);
      setUsers(u.data);
      setUsage(g.data);
      setSchools(sc.data);
    } catch (e) {
      setError(e.response?.status === 403 ? "Access denied. Admin only." : "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  const activateSchool = async (id, name) => {
    if (!window.confirm(`Activate "${name}"? This marks them as paid and removes the trial limit.`)) return;
    setActivating(id);
    try {
      await api.post(`/api/admin/schools/${id}/activate`);
      setSchools(prev => prev.map(s => s.id === id ? { ...s, subscriptionStatus: "ACTIVE", trialEndsAt: null } : s));
    } catch {
      alert("Failed to activate school.");
    } finally {
      setActivating(null);
    }
  };

  const loadUsage = async () => {
    try {
      const res = await api.get(`/api/admin/usage?days=${usageDays}`);
      setUsage(res.data);
    } catch {}
  };

  const filteredUsers = users.filter(u => {
    const matchPlan = planFilter === "ALL" || u.planType === planFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || (u.name||"").toLowerCase().includes(q)
      || (u.mobile||"").includes(q)
      || (u.email||"").toLowerCase().includes(q);
    return matchPlan && matchSearch;
  });

  if (loading) return (
    <DashboardLayout>
      <div style={{ padding: 40, color: "#64748b" }}>Loading admin data…</div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="alert-error" style={{ maxWidth: 480, margin: 24 }}>⚠️ {error}</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Users, revenue and usage analytics.</p>
      </div>

      {/* ── Stats cards ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard icon="👥" label="Total Users"     value={stats.totalUsers}    color="#0f172a" />
        <StatCard icon="🆓" label="FREE Users"      value={stats.freeUsers}     color="#64748b" />
        <StatCard icon="⭐" label="PRO Users"       value={stats.proUsers}      color="#2563eb" sub={`₹${stats.proUsers * 199}/mo potential`} />
        <StatCard icon="🏫" label="SCHOOL Users"    value={stats.schoolUsers}   color="#7c3aed" sub={`₹${stats.schoolUsers * 999}/mo potential`} />
        <StatCard icon="💰" label="Est. MRR"        value={`₹${stats.estimatedMrr}`} color="#059669" sub="Based on current plans" />
        <StatCard icon="🆕" label="New Today"       value={stats.newUsersToday} color="#d97706" />
        <StatCard icon="📅" label="New This Week"   value={stats.newThisWeek}   color="#dc2626" />
      </div>

      {/* ── Tab switcher ── */}
      <div className="auth-tabs" style={{ maxWidth: 320, marginBottom: 24 }}>
        <button className={`auth-tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
          👥 Users
        </button>
        <button className={`auth-tab ${tab === "schools" ? "active" : ""}`} onClick={() => setTab("schools")}>
          🏫 Schools ({schools.length})
        </button>
      </div>

      {/* ── Usage analytics ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Daily Usage Analytics</div>
          <select
            className="form-select"
            value={usageDays}
            onChange={e => setUsageDays(Number(e.target.value))}
            style={{ width: "auto", fontSize: 13 }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
        <UsageChart dates={usage?.dates} series={usage?.series} />
      </div>

      {/* ── Schools table ── */}
      {tab === "schools" && (
        <div className="card">
          <p style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }}>
            Registered Schools <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 13 }}>({schools.length})</span>
          </p>
          {schools.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏫</div>
              <p>No schools registered yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["School Name", "Admin Email", "Phone", "Teachers", "Status", "Trial Ends", "Registered", "Action"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schools.map((s, i) => {
                    const statusColor = s.subscriptionStatus === "ACTIVE"
                      ? ["#dcfce7","#16a34a"]
                      : s.subscriptionStatus === "EXPIRED"
                      ? ["#fee2e2","#dc2626"]
                      : ["#fef3c7","#d97706"];
                    return (
                      <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>{s.name}</td>
                        <td style={{ padding: "10px 12px", color: "#475569" }}>{s.adminEmail}</td>
                        <td style={{ padding: "10px 12px", color: "#475569" }}>{s.phone || "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>{s.teacherCount}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: statusColor[0], color: statusColor[1], borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                            {s.subscriptionStatus}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8" }}>
                          {s.trialEndsAt || (s.subscriptionStatus === "ACTIVE" ? "—" : "Expired")}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{s.createdAt}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {s.subscriptionStatus !== "ACTIVE" ? (
                            <button
                              onClick={() => activateSchool(s.id, s.name)}
                              disabled={activating === s.id}
                              style={{ background: "#dcfce7", color: "#16a34a", border: "none", borderRadius: 8,
                                padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                              {activating === s.id ? "…" : "✓ Activate"}
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓ Active</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Users table ── */}
      {tab === "users" && <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
            All Users <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 13 }}>({filteredUsers.length})</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="form-input"
              placeholder="Search name, mobile, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 220, fontSize: 13 }}
            />
            <select
              className="form-select"
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
              style={{ width: "auto", fontSize: 13 }}
            >
              <option value="ALL">All Plans</option>
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
              <option value="SCHOOL">SCHOOL</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Name", "Mobile", "Email", "Plan", "Board", "Joined"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => (
                <tr key={u.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>{u.name || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#475569" }}>{u.mobile}</td>
                  <td style={{ padding: "10px 12px", color: "#475569" }}>{u.email || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: u.planType === "PRO" ? "#eff6ff" : u.planType === "SCHOOL" ? "#f5f3ff" : "#f1f5f9",
                      color:      u.planType === "PRO" ? "#2563eb" : u.planType === "SCHOOL" ? "#7c3aed" : "#64748b",
                    }}>
                      {u.planType}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#475569" }}>{u.board || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{u.createdAt || "—"}</td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>}
    </DashboardLayout>
  );
}

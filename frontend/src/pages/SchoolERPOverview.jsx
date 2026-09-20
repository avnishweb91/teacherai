import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";
import ERPWorkflows from "./ERPWorkflows";

const MODULES = [
  { key: "ADMISSIONS", icon: "🧾", title: "Admissions", description: "Enquiries and applications", fields: [["applicantName", "Applicant name"], ["guardianName", "Guardian name"], ["classApplied", "Class applied"], ["phone", "Phone"], ["status", "Application status"]] },
  { key: "STUDENTS", icon: "👥", title: "Students", description: "Student master records", fields: [["admissionNo", "Admission number"], ["studentName", "Student name"], ["className", "Class"], ["section", "Section"], ["guardianName", "Guardian name"], ["phone", "Guardian phone"]] },
  { key: "FEES", icon: "💳", title: "Fees & Finance", description: "Dues, receipts and payments", fields: [["studentName", "Student name"], ["feeType", "Fee type"], ["amount", "Amount"], ["dueDate", "Due date"], ["paymentStatus", "Payment status"], ["receiptNo", "Receipt number"]] },
  { key: "TRANSPORT", icon: "🚌", title: "Transport", description: "Routes, stops and vehicles", fields: [["routeName", "Route name"], ["vehicleNo", "Vehicle number"], ["stop", "Stop"], ["driverName", "Driver name"], ["capacity", "Capacity"]] },
  { key: "LIBRARY", icon: "📚", title: "Library", description: "Books and issue register", fields: [["accessionNo", "Accession number"], ["bookTitle", "Book title"], ["author", "Author"], ["issuedTo", "Issued to"], ["returnDate", "Return date"]] },
  { key: "INVENTORY", icon: "📦", title: "Inventory", description: "Assets, stock and vendors", fields: [["itemName", "Item name"], ["category", "Category"], ["quantity", "Quantity"], ["vendor", "Vendor"], ["reorderLevel", "Reorder level"]] },
  { key: "STAFF", icon: "🧑‍💼", title: "Staff", description: "Employee records and roles", fields: [["employeeId", "Employee ID"], ["staffName", "Staff name"], ["designation", "Designation"], ["department", "Department"], ["phone", "Phone"], ["joiningDate", "Joining date"]] },
  { key: "PAYROLL", icon: "💰", title: "Payroll", description: "Salary calculations and runs", fields: [["staffName", "Staff name"], ["month", "Month"], ["basicSalary", "Basic salary"], ["grossSalary", "Gross salary"], ["netSalary", "Net salary"]] },
  { key: "LEAVE", icon: "🌿", title: "Leave", description: "Staff and student leave", fields: [["personName", "Person name"], ["personType", "Staff / Student"], ["fromDate", "From date"], ["toDate", "To date"], ["reason", "Reason"]] },
  { key: "COMMUNICATION", icon: "📣", title: "Communication", description: "School-wide messages", fields: [["subject", "Subject"], ["audience", "Audience"], ["message", "Message"], ["publishDate", "Publish date"]] },
  { key: "REPORTS", icon: "📊", title: "Reports", description: "Saved operational reports", fields: [["reportName", "Report name"], ["reportType", "Report type"], ["period", "Period"], ["owner", "Owner"]] },
];

const initialForm = (module) => Object.fromEntries((module?.fields || []).map(([key]) => [key, ""]));

export default function SchoolERPOverview() {
  const [selectedKey, setSelectedKey] = useState("STUDENTS");
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState([]);

  const module = useMemo(() => MODULES.find(item => item.key === selectedKey) || MODULES[0], [selectedKey]);
  const loadSummary = async () => { try { const response = await api.get("/api/erp/summary"); setSummary(response.data || {}); } catch { /* supplementary */ } };
  const loadAudit = async () => { try { const response = await api.get("/api/erp/audit"); setAudit(response.data || []); } catch { /* audit is supplementary */ } };
  const loadRecords = async (key = selectedKey, search = query) => {
    setLoading(true);
    try { const response = await api.get(`/api/erp/${key}`, { params: search ? { q: search } : {} }); setRecords(response.data || []); setError(""); }
    catch (err) { setError(err?.response?.data?.message || "Could not load ERP records."); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadSummary(); loadAudit(); }, []);
  // loadRecords is intentionally recreated with the current search state; module changes reset the workspace.
  useEffect(() => { setEditing(null); setForm(initialForm(module)); loadRecords(module.key, ""); }, [module]); // eslint-disable-line react-hooks/exhaustive-deps

  const beginEdit = record => { setEditing(record.id); setForm(Object.fromEntries(module.fields.map(([key]) => [key, record[key] ?? ""]))); };
  const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = async event => {
    event.preventDefault();
    const title = form.title || form.studentName || form.applicantName || form.staffName || form.itemName || form.bookTitle || form.subject || form.reportName || form.personName || "ERP record";
    setSaving(true);
    try { const payload = { ...form, title, status: form.status || "ACTIVE" }; if (editing) await api.put(`/api/erp/${module.key}/${editing}`, payload); else await api.post(`/api/erp/${module.key}`, payload); setForm(initialForm(module)); setEditing(null); await loadRecords(); await loadSummary(); await loadAudit(); }
    catch (err) { setError(err?.response?.data?.message || "Could not save this record."); }
    finally { setSaving(false); }
  };
  const remove = async id => { if (!window.confirm("Delete this ERP record?")) return; try { await api.delete(`/api/erp/${module.key}/${id}`); await loadRecords(); await loadSummary(); await loadAudit(); } catch (err) { setError(err?.response?.data?.message || "Could not delete this record."); } };
  const exportCsv = () => { const rows = records.map(record => Object.fromEntries(["id", "title", "status", ...module.fields.map(([key]) => key)].map(key => [key, record[key] ?? ""]))); if (!rows.length) return; const headers = Object.keys(rows[0]); const csv = [headers, ...rows.map(row => headers.map(key => `"${String(row[key]).replaceAll('"', '""')}"`))].map(row => row.join(",")).join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${module.key.toLowerCase()}-records.csv`; link.click(); URL.revokeObjectURL(url); };

  return <DashboardLayout><div className="erp-page">
    <div className="erp-hero"><div><p className="erp-kicker">School operations</p><h1>One command centre for your school.</h1><p>Manage shared records across admissions, students, finance, people and daily operations.</p></div><Link className="erp-hero-action" to="/school-admin">Open school admin →</Link></div>
    <div className="erp-stat-row"><div><strong>{MODULES.length}</strong><span>Connected workspaces</span></div><div><strong>{Object.values(summary).reduce((sum, count) => sum + Number(count || 0), 0)}</strong><span>Total school records</span></div><div><strong>{MODULES.filter(item => Number(summary[item.key] || 0) > 0).length}</strong><span>Active modules</span></div></div>
    <div className="erp-section-heading"><div><p className="erp-kicker">Your school suite</p><h2>Every department, one record system</h2></div><span>Search, add, edit and export-ready records</span></div>
    <div className="erp-module-grid">{MODULES.map(item => <button type="button" className={`erp-module-card erp-module-button ${item.key === selectedKey ? "is-selected" : ""}`} onClick={() => { setSelectedKey(item.key); setQuery(""); }} key={item.key}><div className="erp-module-top"><span className="erp-module-icon">{item.icon}</span><span className="erp-module-state is-live">{summary[item.key] || 0} records</span></div><h3>{item.title}</h3><p>{item.description}</p><span className="erp-open">Manage workspace <span>↓</span></span></button>)}</div>
    <ERPWorkflows onDone={() => { loadSummary(); loadRecords(); }} />
    <section className="erp-workspace"><div className="erp-workspace-header"><div><p className="erp-kicker">Active workspace</p><h2>{module.icon} {module.title}</h2><p>{module.description}</p></div><div className="erp-record-tools"><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === "Enter" && loadRecords(module.key, query)} placeholder="Search records…" /><button type="button" onClick={exportCsv}>Export CSV</button><button type="button" onClick={() => { setEditing(null); setForm(initialForm(module)); }}>+ Add record</button></div></div>
      {error && <div className="erp-error">⚠️ {error}</div>}
      <div className="erp-workspace-grid"><form className="erp-record-form" onSubmit={submit}><h3>{editing ? "Edit record" : "Add new record"}</h3><label>Record title<input value={form.title || ""} onChange={event => change("title", event.target.value)} placeholder="Optional: generated from first field" /></label>{module.fields.map(([key, label]) => <label key={key}>{label}{key === "message" || key === "reason" ? <textarea rows="3" value={form[key] || ""} onChange={event => change(key, event.target.value)} /> : <input value={form[key] || ""} onChange={event => change(key, event.target.value)} />}</label>)}<div className="erp-form-actions"><button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Update record" : "Save record"}</button>{editing && <button type="button" className="erp-cancel" onClick={() => { setEditing(null); setForm(initialForm(module)); }}>Cancel</button>}</div></form>
        <div className="erp-record-list"><div className="erp-list-heading"><h3>{records.length} record{records.length === 1 ? "" : "s"}</h3><button type="button" onClick={() => loadRecords()}>↻ Refresh</button></div>{loading ? <div className="erp-empty">Loading records…</div> : records.length === 0 ? <div className="erp-empty"><span>🗂️</span><p>No records yet.</p><small>Add your first {module.title.toLowerCase()} record using the form.</small></div> : records.map(record => <article className="erp-record" key={record.id}><div><strong>{record.title}</strong><span>{record.status} · Updated {new Date(record.updatedAt).toLocaleDateString("en-IN")}</span><p>{module.fields.slice(0, 3).map(([key, label]) => record[key] ? `${label}: ${record[key]}` : null).filter(Boolean).join(" · ")}</p></div><div className="erp-record-actions"><button type="button" onClick={() => beginEdit(record)}>Edit</button><button type="button" onClick={() => remove(record.id)}>Delete</button></div></article>)}</div>
      </div></section>
    <section className="erp-audit"><div className="erp-section-heading"><div><p className="erp-kicker">Governance</p><h2>Recent audit history</h2></div><span>Last {audit.length} actions</span></div>{audit.length === 0 ? <p className="erp-audit-empty">No audit activity yet.</p> : <div className="erp-audit-list">{audit.slice(0, 12).map(item => <div key={item.id}><strong>{item.action}</strong><span>{item.moduleType} record {item.recordId || ""}</span><time>{new Date(item.createdAt).toLocaleString("en-IN")}</time></div>)}</div>}</section>
  </div></DashboardLayout>;
}

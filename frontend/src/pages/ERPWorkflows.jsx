import { useState } from "react";
import api from "../services/api";

const workflows = [
  { key: "fees", icon: "💳", title: "Create fee invoice", endpoint: "/api/erp/fees/invoice", fields: [["studentName", "Student name"], ["feeType", "Fee type"], ["amount", "Amount"], ["dueDate", "Due date"]] },
  { key: "payroll", icon: "🧑‍💼", title: "Calculate payroll", endpoint: "/api/erp/payroll/calculate", fields: [["staffName", "Staff name"], ["month", "Month"], ["basicSalary", "Basic salary"], ["allowances", "Allowances"], ["deductions", "Deductions"]] },
  { key: "transport", icon: "🚌", title: "Assign transport", endpoint: "/api/erp/transport/assign", fields: [["studentName", "Student name"], ["routeName", "Route name"], ["stop", "Stop"], ["vehicleNo", "Vehicle number"]] },
  { key: "library", icon: "📚", title: "Calculate library fine", endpoint: "/api/erp/library/fine", fields: [["issuedTo", "Issued to"], ["bookTitle", "Book title"], ["dueDate", "Due date"], ["returnedDate", "Returned date"], ["finePerDay", "Fine per day"]] },
];

export default function ERPWorkflows({ onDone }) {
  const [forms, setForms] = useState({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [report, setReport] = useState(null);
  const change = (key, field, value) => setForms(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  const run = async workflow => {
    setBusy(workflow.key); setMessage("");
    try { await api.post(workflow.endpoint, forms[workflow.key] || {}); setMessage(`${workflow.title} completed.`); setForms(prev => ({ ...prev, [workflow.key]: {} })); onDone?.(); }
    catch (err) { setMessage(err?.response?.data?.message || `${workflow.title} failed.`); }
    finally { setBusy(""); }
  };
  const loadReport = async () => { setBusy("report"); try { const response = await api.get("/api/erp/reports/overview"); setReport(response.data); } catch { setMessage("Could not generate the report."); } finally { setBusy(""); } };
  return <section className="erp-automation"><div className="erp-section-heading"><div><p className="erp-kicker">Automations</p><h2>Do more with your records</h2></div><span>Calculated and saved automatically</span></div><div className="erp-automation-grid">{workflows.map(workflow => <form className="erp-automation-card" onSubmit={event => { event.preventDefault(); run(workflow); }} key={workflow.key}><div className="erp-automation-title"><span>{workflow.icon}</span><h3>{workflow.title}</h3></div>{workflow.fields.map(([key, label]) => <input key={key} placeholder={label} value={forms[workflow.key]?.[key] || ""} onChange={event => change(workflow.key, key, event.target.value)} required={key !== "allowances" && key !== "deductions" && key !== "finePerDay"} />)}<button type="submit" disabled={busy === workflow.key}>{busy === workflow.key ? "Working…" : "Run workflow"}</button></form>)}<div className="erp-automation-card erp-report-card"><div className="erp-automation-title"><span>📊</span><h3>Generate overview report</h3></div><p>Fees collected, outstanding dues, payroll totals and library fines.</p><button type="button" onClick={loadReport} disabled={busy === "report"}>{busy === "report" ? "Generating…" : "Generate report"}</button>{report && <div className="erp-report-metrics"><span>Collected <b>₹{Number(report.feesCollected || 0).toLocaleString("en-IN")}</b></span><span>Outstanding <b>₹{Number(report.feesOutstanding || 0).toLocaleString("en-IN")}</b></span><span>Payroll <b>₹{Number(report.payrollNetTotal || 0).toLocaleString("en-IN")}</b></span><span>Library fines <b>₹{Number(report.libraryFines || 0).toLocaleString("en-IN")}</b></span></div>}</div></div>{message && <p className="erp-workflow-message">{message}</p>}</section>;
}

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

/* ─────────────── constants ─────────────── */
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const GRADES  = ["LKG","UKG","Class 1","Class 2","Class 3","Class 4","Class 5",
                 "Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"];
const SECTIONS = ["A","B","C","D","E"];
const STATUS   = { P: "Present", A: "Absent", L: "Late" };
const STATUS_COLOR = { P: "#dcfce7", A: "#fee2e2", L: "#fef9c3", "": "#f8fafc" };
const STATUS_TEXT  = { P: "#16a34a", A: "#dc2626", L: "#ca8a04", "": "#94a3b8" };

/* ─────────────── storage helpers ─────────────── */
const KEY_STUDENTS = "att_students";
const KEY_RECORDS  = "att_records";

const loadStudents = () => {
  try { return JSON.parse(localStorage.getItem(KEY_STUDENTS) || "[]"); } catch { return []; }
};
const loadRecords  = () => {
  try { return JSON.parse(localStorage.getItem(KEY_RECORDS)  || "{}"); } catch { return {}; }
};
const saveStudents = (s) => localStorage.setItem(KEY_STUDENTS, JSON.stringify(s));
const saveRecords  = (r) => localStorage.setItem(KEY_RECORDS,  JSON.stringify(r));

/* ─────────────── date helpers ─────────────── */
// Use local date parts to avoid UTC off-by-one on IST (+5:30)
const toLocalDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const daysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m is 1-based
const dayName   = (y, m, d) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(y, m-1, d).getDay()];
// Only Sunday is a non-school day — most Indian schools have Saturday classes
const isHoliday = (y, m, d) => new Date(y, m-1, d).getDay() === 0;

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function AttendanceManager() {
  const now   = new Date();
  const today = toLocalDateKey(); // local date key, recomputed each render

  /* ── class config ── */
  const [className, setClassName] = useState(() => localStorage.getItem("att_class")   || "UKG");
  const [section,   setSection]   = useState(() => localStorage.getItem("att_section") || "A");

  /* ── roster ── */
  const [students, setStudents] = useState(loadStudents);
  const [newName,  setNewName]  = useState("");
  const [newRoll,  setNewRoll]  = useState("");

  /* ── daily attendance ── */
  const [selDate,  setSelDate]  = useState(() => toLocalDateKey());
  const [records,  setRecords]  = useState(loadRecords);

  /* ── report ── */
  const [repMonth, setRepMonth] = useState(now.getMonth() + 1);
  const [repYear,  setRepYear]  = useState(now.getFullYear());

  /* ── tab ── */
  const [tab, setTab] = useState("mark"); // roster | mark | report

  /* persist class */
  useEffect(() => { localStorage.setItem("att_class",   className); }, [className]);
  useEffect(() => { localStorage.setItem("att_section", section);   }, [section]);

  /* ─── Roster ops ─── */
  const addStudent = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const id   = Date.now();
    const roll = newRoll || String(students.length + 1);
    const list = [...students, { id, rollNo: roll, name: newName.trim(), className, section }];
    setStudents(list); saveStudents(list);
    setNewName(""); setNewRoll("");
  };

  const removeStudent = (id) => {
    const list = students.filter(s => s.id !== id);
    setStudents(list); saveStudents(list);
  };

  /* ─── Attendance ops ─── */
  const getStatus = (studentId, dateKey) =>
    records[dateKey]?.[String(studentId)] || records[dateKey]?.[studentId] || "";

  const setStatus = useCallback((studentId, dateKey, status) => {
    setRecords(prev => {
      const next = { ...prev, [dateKey]: { ...(prev[dateKey] || {}), [String(studentId)]: status } };
      saveRecords(next);
      return next;
    });
  }, []);

  const markAll = (status, dateKey) => {
    setRecords(prev => {
      const day = {};
      students.forEach(s => { day[String(s.id)] = status; });
      const next = { ...prev, [dateKey]: day };
      saveRecords(next);
      return next;
    });
  };

  /* ─── Report calculations ─── */
  const buildReport = () => {
    const total = daysInMonth(repYear, repMonth);
    const schoolDays = [];
    for (let d = 1; d <= total; d++) {
      if (!isHoliday(repYear, repMonth, d)) schoolDays.push(d);
    }

    return students
      .slice()
      .sort((a, b) => Number(a.rollNo) - Number(b.rollNo))
      .map(s => {
        let present = 0, absent = 0, late = 0;
        const cells = schoolDays.map(d => {
          const key = `${repYear}-${String(repMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const st = records[key]?.[String(s.id)] || records[key]?.[s.id] || "";
          if (st === "P") present++;
          else if (st === "A") absent++;
          else if (st === "L") { present++; late++; }
          return st;
        });
        const pct = schoolDays.length ? Math.round(((present) / schoolDays.length) * 100) : 0;
        return { ...s, cells, schoolDays, present, absent, late, pct };
      });
  };

  /* ─── PDF Register ─── */
  const downloadPDF = () => {
    const rep = buildReport();
    const total = daysInMonth(repYear, repMonth);
    const schoolDays = [];
    for (let d = 1; d <= total; d++) if (!isHoliday(repYear, repMonth, d)) schoolDays.push(d);

    const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
    const w = doc.internal.pageSize.getWidth();
    const mName = MONTHS[repMonth - 1];

    doc.setFont("helvetica","bold"); doc.setFontSize(13);
    doc.text(`Attendance Register – ${className} ${section} – ${mName} ${repYear}`, w/2, 13, { align:"center" });

    const head = [["Roll", "Student Name",
      ...schoolDays.map(d => `${d}\n${dayName(repYear,repMonth,d).slice(0,1)}`),
      "P", "A", "L", "%"]];

    const body = rep.map(r => [
      r.rollNo, r.name,
      ...r.cells.map(c => c || ""),
      r.present, r.absent, r.late,
      { content: `${r.pct}%`, styles: { textColor: r.pct < 75 ? [220,38,38] : [22,163,74], fontStyle:"bold" } }
    ]);

    autoTable(doc, {
      head, body, startY: 20,
      styles: { fontSize: 6.5, cellPadding: 1.8, halign: "center", valign: "middle" },
      headStyles: { fillColor: [30,58,138], textColor: 255, fontStyle:"bold", fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 32, halign: "left" },
        ...Object.fromEntries(schoolDays.map((_,i) => [i+2, { cellWidth: 7 }])),
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index >= 2 && data.column.index < 2 + schoolDays.length) {
          const val = data.cell.raw;
          if (val === "P") { data.cell.styles.fillColor = [220,252,231]; data.cell.styles.textColor = [22,163,74]; }
          else if (val === "A") { data.cell.styles.fillColor = [254,226,226]; data.cell.styles.textColor = [220,38,38]; }
          else if (val === "L") { data.cell.styles.fillColor = [254,249,195]; data.cell.styles.textColor = [202,138,4]; }
        }
      },
      alternateRowStyles: { fillColor: [248,250,252] },
      margin: { top: 20, left: 6, right: 6 },
    });

    doc.setFontSize(7.5); doc.setTextColor(160);
    doc.text("Generated by TeacherAI", w/2, doc.internal.pageSize.getHeight()-5, { align:"center" });
    doc.save(`Attendance_${className}_${section}_${mName}_${repYear}.pdf`);
  };

  /* ─── Excel (CSV) ─── */
  const downloadExcel = () => {
    const rep = buildReport();
    const total = daysInMonth(repYear, repMonth);
    const schoolDays = [];
    for (let d = 1; d <= total; d++) if (!isHoliday(repYear, repMonth, d)) schoolDays.push(d);
    const mName = MONTHS[repMonth-1];

    const esc = v => `"${String(v||"").replace(/"/g,'""')}"`;
    const rows = [
      [`Attendance Register – ${className} ${section} – ${mName} ${repYear}`],
      [],
      ["Roll", "Student Name", ...schoolDays.map(d=>`${d}-${dayName(repYear,repMonth,d).slice(0,3)}`), "Present","Absent","Late","Attendance%"].map(esc),
      ...rep.map(r => [r.rollNo, r.name, ...r.cells.map(c=>c||""), r.present, r.absent, r.late, `${r.pct}%`].map(esc))
    ];

    const csv = rows.map(r=>r.join(",")).join("\n");
    saveAs(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}),
      `Attendance_${className}_${section}_${mName}_${repYear}.csv`);
  };

  const report = tab === "report" ? buildReport() : [];
  const repSchoolDays = (() => {
    if (tab !== "report") return [];
    const total = daysInMonth(repYear, repMonth);
    const d = [];
    for (let i = 1; i <= total; i++) if (!isHoliday(repYear, repMonth, i)) d.push(i);
    return d;
  })();

  const presentToday  = students.filter(s => getStatus(s.id, selDate) === "P").length;
  const absentToday   = students.filter(s => getStatus(s.id, selDate) === "A").length;
  const unmarkedToday = students.filter(s => !getStatus(s.id, selDate)).length;

  /* ══════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Attendance Manager</h1>
        <p className="page-subtitle">Manage student roster, mark daily attendance, and generate monthly registers.</p>
      </div>

      {/* ── Class selector ── */}
      <div className="card" style={{ maxWidth: 560, marginBottom: 20, padding: "16px 20px" }}>
        <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <div className="form-field" style={{ flex:1, minWidth:120 }}>
            <label className="form-label">Class</label>
            <select className="form-select" value={className} onChange={e => setClassName(e.target.value)}>
              {GRADES.map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ flex:1, minWidth:80 }}>
            <label className="form-label">Section</label>
            <select className="form-select" value={section} onChange={e => setSection(e.target.value)}>
              {SECTIONS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ alignSelf:"flex-end", paddingBottom:2 }}>
            <span style={{ background:"#eff6ff", color:"#2563eb", borderRadius:8, padding:"6px 14px", fontSize:13, fontWeight:700 }}>
              {className} – {section} &nbsp;·&nbsp; {students.length} students
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="auth-tabs" style={{ maxWidth:460, marginBottom:20 }}>
        {[["roster","👥 Roster"],["mark","✅ Mark Attendance"],["report","📊 Monthly Report"]].map(([k,l])=>(
          <button key={k} className={`auth-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ════════════ TAB: ROSTER ════════════ */}
      {tab === "roster" && (
        <div className="card" style={{ maxWidth: 560 }}>
          <p style={{ fontWeight:700, color:"#0f172a", marginBottom:16, fontSize:15 }}>Student Roster — {className} {section}</p>

          <form onSubmit={addStudent} style={{ display:"flex", gap:8, marginBottom:20 }}>
            <input className="form-input" placeholder="Roll No" value={newRoll}
              onChange={e=>setNewRoll(e.target.value)} style={{ width:80 }} />
            <input className="form-input" placeholder="Student full name" value={newName}
              onChange={e=>setNewName(e.target.value)} required style={{ flex:1 }} />
            <button type="submit" className="btn-primary" style={{ whiteSpace:"nowrap" }}>+ Add</button>
          </form>

          {students.length === 0 ? (
            <div style={{ textAlign:"center", color:"#94a3b8", padding:"32px 0" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>👥</div>
              <p>No students yet. Add students above.</p>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
              <thead>
                <tr style={{ background:"#f1f5f9" }}>
                  <th style={rth}>Roll</th>
                  <th style={{ ...rth, textAlign:"left" }}>Student Name</th>
                  <th style={rth}></th>
                </tr>
              </thead>
              <tbody>
                {students
                  .slice().sort((a,b)=>Number(a.rollNo)-Number(b.rollNo))
                  .map(s => (
                    <tr key={s.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                      <td style={{ ...rtd, textAlign:"center", color:"#64748b", fontWeight:600 }}>{s.rollNo}</td>
                      <td style={{ ...rtd, fontWeight:500 }}>{s.name}</td>
                      <td style={{ ...rtd, textAlign:"center" }}>
                        <button onClick={()=>removeStudent(s.id)}
                          style={{ background:"#fee2e2", border:"none", color:"#dc2626", borderRadius:6,
                            padding:"3px 8px", cursor:"pointer", fontSize:12 }}>Remove</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ════════════ TAB: MARK ATTENDANCE ════════════ */}
      {tab === "mark" && (
        <div>
          {/* Date + summary bar */}
          <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap", marginBottom:16 }}>
            <div className="form-field" style={{ minWidth:180 }}>
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={selDate}
                max={today} onChange={e=>setSelDate(e.target.value)} />
              {selDate && (() => { const parts = selDate.split("-"); return new Date(+parts[0], +parts[1]-1, +parts[2]).getDay() === 0; })() && (
                <div style={{ marginTop:4, fontSize:12, color:"#b45309", background:"#fef3c7",
                  borderRadius:6, padding:"3px 8px" }}>
                  ⚠️ Sunday — this date won't appear in the monthly report
                </div>
              )}
            </div>

            {students.length > 0 && (
              <div style={{ display:"flex", gap:8, alignItems:"flex-end", paddingBottom:2, flexWrap:"wrap" }}>
                <span style={chip("#dcfce7","#16a34a")}>✅ Present: {presentToday}</span>
                <span style={chip("#fee2e2","#dc2626")}>❌ Absent: {absentToday}</span>
                <span style={chip("#f1f5f9","#64748b")}>— Unmarked: {unmarkedToday}</span>
              </div>
            )}
          </div>

          {students.length === 0 ? (
            <div className="card" style={{ textAlign:"center", color:"#94a3b8", padding:"40px 24px" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>👥</div>
              <p>Add students in the <b>Roster</b> tab first.</p>
            </div>
          ) : (
            <div className="card" style={{ maxWidth: 640 }}>
              {/* Quick mark all */}
              <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
                <span style={{ fontSize:13, color:"#64748b", alignSelf:"center", marginRight:4 }}>Mark all:</span>
                {Object.entries(STATUS).map(([k,v])=>(
                  <button key={k} onClick={()=>markAll(k,selDate)}
                    style={{ background: STATUS_COLOR[k], color: STATUS_TEXT[k], border:"none",
                      borderRadius:8, padding:"6px 16px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                    {k} – {v}
                  </button>
                ))}
              </div>

              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                    <th style={rth}>Roll</th>
                    <th style={{ ...rth, textAlign:"left" }}>Student Name</th>
                    <th style={{ ...rth, textAlign:"center", width:200 }}>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .slice().sort((a,b)=>Number(a.rollNo)-Number(b.rollNo))
                    .map(s => {
                      const st = getStatus(s.id, selDate);
                      return (
                        <tr key={s.id} style={{ borderBottom:"1px solid #f1f5f9",
                          background: st ? STATUS_COLOR[st] + "55" : "#fff" }}>
                          <td style={{ ...rtd, textAlign:"center", color:"#64748b", fontWeight:600 }}>{s.rollNo}</td>
                          <td style={{ ...rtd, fontWeight:500 }}>{s.name}</td>
                          <td style={{ ...rtd, textAlign:"center" }}>
                            <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                              {Object.keys(STATUS).map(k => (
                                <button key={k} onClick={()=>setStatus(s.id,selDate,k)}
                                  style={{
                                    width:38, height:34, borderRadius:8, fontWeight:700, fontSize:13,
                                    cursor:"pointer", transition:"all 0.15s",
                                    border: st===k ? "2px solid "+STATUS_TEXT[k] : "1.5px solid #e2e8f0",
                                    background: st===k ? STATUS_COLOR[k] : "#fff",
                                    color: st===k ? STATUS_TEXT[k] : "#94a3b8",
                                  }}>
                                  {k}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              <div style={{ marginTop:14, textAlign:"right" }}>
                <span style={{ fontSize:13, color:"#64748b" }}>
                  {presentToday + absentToday} / {students.length} marked
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ TAB: MONTHLY REPORT ════════════ */}
      {tab === "report" && (
        <div>
          {/* Controls */}
          <div style={{ display:"flex", gap:12, alignItems:"flex-end", marginBottom:16, flexWrap:"wrap" }}>
            <div className="form-field">
              <label className="form-label">Month</label>
              <select className="form-select" value={repMonth} onChange={e=>setRepMonth(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Year</label>
              <input type="number" className="form-input" value={repYear} min={2024} max={2035}
                onChange={e=>setRepYear(Number(e.target.value))} style={{ width:90 }} />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn-secondary" onClick={downloadPDF}>⬇ PDF Register</button>
              <button className="btn-secondary" onClick={downloadExcel}>⬇ Excel</button>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="card" style={{ textAlign:"center", color:"#94a3b8", padding:"40px 24px" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
              <p>Add students in the <b>Roster</b> tab first.</p>
            </div>
          ) : (
            <div className="result-box">
              <div className="result-box-header">
                <span className="result-box-title">
                  {className} {section} — {MONTHS[repMonth-1]} {repYear}
                </span>
                <span style={{ fontSize:13, color:"#64748b" }}>
                  {repSchoolDays.length} school days
                </span>
              </div>

              <div style={{ overflowX:"auto" }}>
                <table style={{ borderCollapse:"collapse", fontSize:12, whiteSpace:"nowrap", minWidth:600 }}>
                  <thead>
                    <tr>
                      <th style={{ ...rth, background:"#1e3a8a", color:"#fff", minWidth:30 }}>Roll</th>
                      <th style={{ ...rth, background:"#1e3a8a", color:"#fff", textAlign:"left", minWidth:140 }}>Name</th>
                      {repSchoolDays.map(d=>(
                        <th key={d} style={{ ...rth, background:"#1e3a8a", color:"#fff", width:28, fontSize:10 }}>
                          {d}<br/><span style={{ fontWeight:400 }}>{dayName(repYear,repMonth,d).slice(0,1)}</span>
                        </th>
                      ))}
                      <th style={{ ...rth, background:"#0f172a", color:"#60a5fa" }}>P</th>
                      <th style={{ ...rth, background:"#0f172a", color:"#f87171" }}>A</th>
                      <th style={{ ...rth, background:"#0f172a", color:"#fbbf24" }}>L</th>
                      <th style={{ ...rth, background:"#0f172a", color:"#fff", minWidth:44 }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((r, ri) => (
                      <tr key={r.id} style={{ background: ri%2===0?"#fff":"#f8fafc" }}>
                        <td style={{ ...rtd, textAlign:"center", color:"#64748b", fontWeight:600 }}>{r.rollNo}</td>
                        <td style={{ ...rtd, fontWeight:500, color:"#0f172a" }}>{r.name}</td>
                        {r.cells.map((c,ci)=>(
                          <td key={ci} style={{ ...rtd, textAlign:"center", padding:"4px 2px",
                            background: STATUS_COLOR[c] || "transparent",
                            color: STATUS_TEXT[c] || "#cbd5e1", fontWeight:700, fontSize:11 }}>
                            {c || "·"}
                          </td>
                        ))}
                        <td style={{ ...rtd, textAlign:"center", color:"#16a34a", fontWeight:700 }}>{r.present}</td>
                        <td style={{ ...rtd, textAlign:"center", color:"#dc2626", fontWeight:700 }}>{r.absent}</td>
                        <td style={{ ...rtd, textAlign:"center", color:"#ca8a04", fontWeight:700 }}>{r.late}</td>
                        <td style={{ ...rtd, textAlign:"center", fontWeight:800,
                          color: r.pct < 75 ? "#dc2626" : "#16a34a" }}>
                          {r.pct}%
                          {r.pct < 75 && <span title="Below 75%" style={{ marginLeft:3 }}>⚠️</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div style={{ display:"flex", gap:16, marginTop:14, flexWrap:"wrap" }}>
                {[["P","Present","#dcfce7","#16a34a"],["A","Absent","#fee2e2","#dc2626"],["L","Late","#fef9c3","#ca8a04"]].map(([k,v,bg,tc])=>(
                  <span key={k} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
                    <span style={{ background:bg, color:tc, borderRadius:4, padding:"1px 7px", fontWeight:700 }}>{k}</span>
                    <span style={{ color:"#64748b" }}>{v}</span>
                  </span>
                ))}
                <span style={{ fontSize:12, color:"#dc2626" }}>⚠️ Below 75% attendance</span>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── small style helpers ── */
const rth = { padding:"9px 10px", fontWeight:700, fontSize:12, textAlign:"center",
              borderBottom:"2px solid #e2e8f0", color:"#374151" };
const rtd = { padding:"9px 10px", borderBottom:"1px solid #f1f5f9", fontSize:13 };
const chip = (bg,tc) => ({ background:bg, color:tc, borderRadius:8,
  padding:"5px 12px", fontSize:13, fontWeight:600 });

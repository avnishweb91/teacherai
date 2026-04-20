import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";
import jsPDF from "jspdf";
import SchoolLogoUpload from "../components/SchoolLogoUpload";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, BorderStyle, AlignmentType, ShadingType
} from "docx";

/* ─────────────────── constants ─────────────────── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const GRADES = [
  "LKG","UKG","Class 1","Class 2","Class 3","Class 4","Class 5",
  "Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"
];
const ASSEMBLY_OPTIONS  = ["Prayer & Thought", "Prayer & Rhyme", "Prayer & Song", "Morning Assembly"];
const NEXT_TIME_OPTIONS = ["Recap","Practice","Reinforce","Revision","Assessment","Recall","—"];
const COLUMNS = [
  { key: "assembly",    label: "Assembly",                    type: "select", options: ASSEMBLY_OPTIONS },
  { key: "language",    label: "Language Development",        type: "text" },
  { key: "cognitive",   label: "Cognitive Development",       type: "text" },
  { key: "nextTime",    label: "Next Time",                   type: "select", options: NEXT_TIME_OPTIONS },
  { key: "creativeArt", label: "Creative & Expressive Art",   type: "text" },
  { key: "physical",    label: "Physical Development",        type: "text" },
  { key: "social",      label: "Social & Emotional Growth",   type: "text" },
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const NEXT_TIME_CYCLE = ["Recap","Practice","Reinforce","Revision","Assessment","Recall"];

/* ─────────────────── helpers ─────────────────── */
function getDaysInMonth(year, month) {
  // month is 1-based
  const days = [];
  const total = new Date(year, month, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month - 1, d);
    days.push({ day: d, dayName: DAY_NAMES[date.getDay()], date });
  }
  return days;
}

function buildInitialRows(year, month, holidayMap) {
  const all = getDaysInMonth(year, month);
  const rows = [];
  let schoolDayCount = 0;

  for (const { day, dayName, date } of all) {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend) continue; // skip weekends

    const dateLabel = `${day} ${MONTHS[month - 1].slice(0, 3)}`;
    const holidayName = holidayMap[day] || null;

    if (holidayName) {
      rows.push({ day, dayName, dateLabel, isHoliday: true, holidayName, ...emptyFields() });
    } else {
      schoolDayCount++;
      rows.push({
        day, dayName, dateLabel,
        isHoliday: false, holidayName: "",
        assembly:   schoolDayCount % 2 === 1 ? "Prayer & Thought" : "Prayer & Rhyme",
        language:   "",
        cognitive:  "",
        nextTime:   NEXT_TIME_CYCLE[(schoolDayCount - 1) % NEXT_TIME_CYCLE.length],
        creativeArt:"",
        physical:   "",
        social:     "",
      });
    }
  }
  return rows;
}

function emptyFields() {
  return { assembly: "—", language: "—", cognitive: "—", nextTime: "—", creativeArt: "—", physical: "—", social: "—" };
}

/* ─────────────────── component ─────────────────── */
export default function MonthlyPlanner() {
  const now = new Date();

  // Config
  const [logo, setLogo] = useState(() => localStorage.getItem("school_logo") || null);
  const [grade,      setGrade]      = useState("UKG");
  const [board,      setBoard]      = useState("CBSE");
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [year,       setYear]       = useState(now.getFullYear());
  const [schoolName, setSchoolName] = useState("");
  const [subject,    setSubject]    = useState("");

  // Holidays: [{day, name}]
  const [holidays, setHolidays] = useState([{ day: "", name: "" }]);

  // Generated rows
  const [rows, setRows] = useState(null);
  const [limitHit, setLimitHit] = useState(false);
  const [userPlan, setUserPlan] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/user/me", { _skipAuthRedirect: true }).then(res => setUserPlan(res.data.planType)).catch(() => {});
  }, []);

  const checkAndCountUsage = () => {
    if (userPlan === "PRO" || userPlan === "SCHOOL") return true;
    const today = new Date().toISOString().slice(0, 10);
    const key = `usage_PLANNER_${today}`;
    const used = parseInt(localStorage.getItem(key) || "0");
    if (used >= 1) { setLimitHit(true); return false; }
    localStorage.setItem(key, String(used + 1));
    return true;
  };

  /* ── Build planner ── */
  const buildPlanner = (e) => {
    e.preventDefault();
    setLimitHit(false);
    if (!checkAndCountUsage()) return;
    const holidayMap = {};
    for (const h of holidays) {
      if (h.day && h.name) holidayMap[parseInt(h.day)] = h.name;
    }
    setRows(buildInitialRows(year, month, holidayMap));
  };

  /* ── Cell update ── */
  const updateCell = (i, field, val) => {
    const copy = [...rows];
    copy[i] = { ...copy[i], [field]: val };
    setRows(copy);
  };

  /* ── Toggle holiday ── */
  const toggleHoliday = (i) => {
    const copy = [...rows];
    if (copy[i].isHoliday) {
      // Un-mark holiday
      let schoolCount = rows.slice(0, i).filter(r => !r.isHoliday).length + 1;
      copy[i] = {
        ...copy[i], isHoliday: false, holidayName: "",
        assembly:   schoolCount % 2 === 1 ? "Prayer & Thought" : "Prayer & Rhyme",
        language: "", cognitive: "",
        nextTime:   NEXT_TIME_CYCLE[(schoolCount - 1) % NEXT_TIME_CYCLE.length],
        creativeArt: "", physical: "", social: ""
      };
    } else {
      copy[i] = { ...copy[i], isHoliday: true, ...emptyFields() };
    }
    setRows(copy);
  };

  /* ── Holiday name update ── */
  const updateHolidayName = (i, val) => {
    const copy = [...rows];
    copy[i] = { ...copy[i], holidayName: val };
    setRows(copy);
  };

  /* ── Holiday config helpers ── */
  const addHoliday    = () => setHolidays([...holidays, { day: "", name: "" }]);
  const removeHoliday = (i) => setHolidays(holidays.filter((_, idx) => idx !== i));
  const updateHol     = (i, f, v) => { const h = [...holidays]; h[i][f] = v; setHolidays(h); };

  const monthName = MONTHS[month - 1];
  const title = `${grade} Day-wise Planner – ${monthName} ${year}`;
  const schoolDays = rows ? rows.filter(r => !r.isHoliday).length : 0;

  /* ── PDF ── */
  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
    const w = doc.internal.pageSize.getWidth();

    if (logo) { try { doc.addImage(logo, "PNG", 10, 5, 18, 18); } catch {} }

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title, w / 2, 13, { align: "center" });
    if (schoolName) {
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(schoolName, w / 2, 19, { align: "center" });
    }
    if (subject) {
      doc.setFontSize(9);
      doc.text(`Subject: ${subject} | Board: ${board}`, w / 2, 24, { align: "center" });
    }

    const startY = schoolName || subject ? 29 : 20;

    const head = [["Day", "Date", ...COLUMNS.map(c => c.label)]];
    const body = rows.map(r => {
      if (r.isHoliday) return [
        r.dayName, r.dateLabel,
        { content: r.holidayName || "Holiday", colSpan: 7,
          styles: { halign: "center", fontStyle: "italic", textColor: [160, 100, 100] } }
      ];
      return [r.dayName, r.dateLabel, r.assembly, r.language, r.cognitive,
              r.nextTime, r.creativeArt, r.physical, r.social];
    });

    autoTable(doc, {
      head, body, startY,
      styles: { fontSize: 7, cellPadding: 2.2, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 7.5, halign: "center" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: "center", fontStyle: "bold", textColor: [100, 116, 139] },
        1: { cellWidth: 16, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 26 },
        3: { cellWidth: 30 },
        4: { cellWidth: 28 },
        5: { cellWidth: 20, halign: "center", fontStyle: "bold", textColor: [109, 40, 217] },
        6: { cellWidth: 32 },
        7: { cellWidth: 26 },
        8: { cellWidth: 32 },
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const r = rows[data.row.index];
          if (r?.isHoliday) {
            data.cell.styles.fillColor = [254, 242, 242];
            data.cell.styles.textColor = [180, 100, 100];
          }
        }
      },
      margin: { top: startY, left: 7, right: 7 },
    });

    // Footer
    doc.setFontSize(7.5); doc.setTextColor(160);
    doc.text("Generated by TeacherAI", w / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" });

    doc.save(`${grade.replace(" ", "_")}_Planner_${monthName}_${year}.pdf`);
  };

  /* ── Excel (CSV) ── */
  const downloadExcel = () => {
    const headers = ["Day", "Date", ...COLUMNS.map(c => c.label)];
    const esc = v => `"${(v || "").replace(/"/g, '""')}"`;
    const csvRows = [
      [esc(title)],
      schoolName ? [esc(schoolName)] : null,
      [],
      headers.map(esc),
      ...rows.map(r =>
        r.isHoliday
          ? [esc(r.dayName), esc(r.dateLabel), esc(r.holidayName || "Holiday"), "", "", "", "", "", ""]
          : [esc(r.dayName), esc(r.dateLabel), esc(r.assembly), esc(r.language),
             esc(r.cognitive), esc(r.nextTime), esc(r.creativeArt), esc(r.physical), esc(r.social)]
      )
    ].filter(Boolean);

    const csv = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${grade.replace(" ", "_")}_Planner_${monthName}_${year}.csv`);
  };

  /* ── Word ── */
  const downloadWord = async () => {
    const headerCells = ["Day", "Date", ...COLUMNS.map(c => c.label)].map(text =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 16, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
        shading: { type: ShadingType.SOLID, color: "1e3a8a" },
      })
    );

    const tableRows = [new TableRow({ children: headerCells, tableHeader: true })];

    rows.forEach((r, idx) => {
      const bg = r.isHoliday ? "FEF2F2" : idx % 2 === 0 ? "FFFFFF" : "F8FAFC";
      const cells = r.isHoliday
        ? [
            new TableCell({ children: [new Paragraph(r.dayName)], shading: { type: ShadingType.SOLID, color: bg } }),
            new TableCell({ children: [new Paragraph(r.dateLabel)], shading: { type: ShadingType.SOLID, color: bg } }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: r.holidayName || "Holiday", italics: true, color: "B46464", size: 18 })], alignment: AlignmentType.CENTER })],
              columnSpan: 7, shading: { type: ShadingType.SOLID, color: bg }
            })
          ]
        : [r.dayName, r.dateLabel, r.assembly, r.language, r.cognitive, r.nextTime, r.creativeArt, r.physical, r.social]
            .map(text => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: text || "", size: 16 })] })],
              shading: { type: ShadingType.SOLID, color: bg }
            }));

      tableRows.push(new TableRow({ children: cells }));
    });

    const borderStyle = { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" };
    const doc = new Document({
      sections: [{
        properties: { page: { size: { orientation: "landscape" } } },
        children: [
          new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 26 })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
          ...(schoolName ? [new Paragraph({ children: [new TextRun({ text: schoolName, size: 20 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } })] : []),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
            borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle, insideH: borderStyle, insideV: borderStyle }
          }),
          new Paragraph({ children: [new TextRun({ text: "Generated by TeacherAI", size: 14, color: "94A3B8" })], alignment: AlignmentType.CENTER, spacing: { before: 200 } })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${grade.replace(" ", "_")}_Planner_${monthName}_${year}.docx`);
  };

  /* ─────── UI ─────── */
  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Monthly Day-wise Planner</h1>
        <p className="page-subtitle">Build a customisable school planner for any class and month — fill each cell yourself and download.</p>
      </div>

      {/* ── Config form ── */}
      <div className="card" style={{ maxWidth: 760, marginBottom: 24 }}>
        <form onSubmit={buildPlanner}>
          <SchoolLogoUpload logo={logo} setLogo={setLogo} />
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">School Name <span style={{ color: "#94a3b8" }}>(optional)</span></label>
              <input className="form-input" placeholder="e.g. Delhi Public School" value={schoolName} onChange={e => setSchoolName(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Subject <span style={{ color: "#94a3b8" }}>(optional)</span></label>
              <input className="form-input" placeholder="e.g. EVS, Maths" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Class / Grade</label>
              <select className="form-select" value={grade} onChange={e => setGrade(e.target.value)}>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Board</label>
              <select className="form-select" value={board} onChange={e => setBoard(e.target.value)}>
                {["CBSE","ICSE","Bihar Board","State Board"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Month</label>
              <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Year</label>
              <input type="number" className="form-input" value={year} min={2024} max={2035} onChange={e => setYear(Number(e.target.value))} />
            </div>
          </div>

          {/* Holidays */}
          <p className="section-divider-label" style={{ marginTop: 20 }}>Holidays / Off Days</p>
          {holidays.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input
                type="number" className="form-input" placeholder="Day" min={1} max={31}
                value={h.day} onChange={e => updateHol(i, "day", e.target.value)}
                style={{ width: 80 }}
              />
              <input
                type="text" className="form-input" placeholder="Reason (e.g. Gandhi Jayanti)"
                value={h.name} onChange={e => updateHol(i, "name", e.target.value)}
                style={{ flex: 1 }}
              />
              {holidays.length > 1 && (
                <button type="button" className="section-remove" onClick={() => removeHoliday(i)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="section-add-btn" onClick={addHoliday} style={{ marginBottom: 4 }}>
            + Add Holiday
          </button>

          <div style={{ marginTop: 20 }}>
            <button type="submit" className="btn-primary">
              📅 Build Planner
            </button>
          </div>

          {limitHit && (
            <div style={{
              marginTop:16, padding:"16px 20px", borderRadius:12,
              background:"#fffbeb", border:"1px solid #fcd34d",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap"
            }}>
              <div>
                <div style={{ fontWeight:700, color:"#92400e" }}>Daily limit reached</div>
                <div style={{ fontSize:13, color:"#b45309" }}>FREE plan allows 1 planner/day. Upgrade for unlimited access.</div>
              </div>
              <button className="btn-primary" onClick={() => navigate("/upgrade")} style={{ whiteSpace:"nowrap" }}>
                Upgrade to PRO
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ── Editable planner table ── */}
      {rows && (
        <div className="result-box">
          {/* Header bar */}
          <div className="result-box-header">
            <div>
              <div className="result-box-title">{title}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                {schoolDays} school days &nbsp;·&nbsp; {rows.filter(r => r.isHoliday).length} holidays
                &nbsp;·&nbsp; <span style={{ color: "#94a3b8", fontSize: 12 }}>Click any cell to edit</span>
              </div>
            </div>
            <div className="result-box-actions">
              <button className="btn-secondary" onClick={downloadPDF}>⬇ PDF</button>
              <button className="btn-secondary" onClick={downloadExcel}>⬇ Excel</button>
              <button className="btn-secondary" onClick={downloadWord}>⬇ Word</button>
            </div>
          </div>

          {/* Scroll wrapper */}
          <div style={{ overflowX: "auto", marginTop: 4 }}>
            <table style={tbl.table}>
              <thead>
                <tr>
                  <th style={{ ...tbl.th, width: 44 }}>Day</th>
                  <th style={{ ...tbl.th, width: 66 }}>Date</th>
                  {COLUMNS.map(c => (
                    <th key={c.key} style={tbl.th}>{c.label}</th>
                  ))}
                  <th style={{ ...tbl.th, width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={row.isHoliday ? tbl.holidayRow : i % 2 === 0 ? tbl.evenRow : tbl.oddRow}>
                    {/* Day */}
                    <td style={{ ...tbl.td, textAlign: "center", color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>
                      {row.dayName}
                    </td>
                    {/* Date */}
                    <td style={{ ...tbl.td, textAlign: "center", fontWeight: 700, color: "#1e3a8a", fontSize: 13 }}>
                      {row.dateLabel}
                    </td>

                    {row.isHoliday ? (
                      /* Holiday row — spans all 7 columns */
                      <td colSpan={7} style={{ ...tbl.td, padding: "6px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14 }}>🏖</span>
                          <input
                            className="form-input"
                            value={row.holidayName}
                            onChange={e => updateHolidayName(i, e.target.value)}
                            placeholder="Holiday name"
                            style={{ flex: 1, color: "#b45454", fontStyle: "italic", background: "transparent", border: "1px dashed #fca5a5", padding: "4px 8px", fontSize: 13 }}
                          />
                        </div>
                      </td>
                    ) : (
                      /* School day cells */
                      COLUMNS.map(col => (
                        <td key={col.key} style={tbl.td}>
                          {col.type === "select" ? (
                            <select
                              value={row[col.key]}
                              onChange={e => updateCell(i, col.key, e.target.value)}
                              style={{
                                ...tbl.cellInput,
                                color: col.key === "nextTime" ? "#7c3aed" : "#1e293b",
                                fontWeight: col.key === "nextTime" ? 700 : 400,
                                cursor: "pointer"
                              }}
                            >
                              {col.options.map(o => <option key={o}>{o}</option>)}
                            </select>
                          ) : (
                            <textarea
                              value={row[col.key]}
                              onChange={e => updateCell(i, col.key, e.target.value)}
                              rows={2}
                              placeholder="—"
                              style={tbl.cellInput}
                            />
                          )}
                        </td>
                      ))
                    )}

                    {/* Toggle holiday button */}
                    <td style={{ ...tbl.td, textAlign: "center", padding: "4px" }}>
                      <button
                        title={row.isHoliday ? "Mark as school day" : "Mark as holiday"}
                        onClick={() => toggleHoliday(i)}
                        style={{
                          background: row.isHoliday ? "#fee2e2" : "#f1f5f9",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 6px",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        {row.isHoliday ? "📚" : "🏖"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom download strip */}
          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button className="btn-secondary" onClick={downloadPDF}>⬇ Download PDF</button>
            <button className="btn-secondary" onClick={downloadExcel}>⬇ Download Excel</button>
            <button className="btn-secondary" onClick={downloadWord}>⬇ Download Word</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── Table styles ── */
const tbl = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    fontFamily: "inherit",
    minWidth: 900,
  },
  th: {
    background: "#1e3a8a",
    color: "#fff",
    padding: "10px 10px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
    borderBottom: "2px solid #1d4ed8",
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  td: {
    padding: "5px 8px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "middle",
  },
  evenRow:    { background: "#fff" },
  oddRow:     { background: "#f8fafc" },
  holidayRow: { background: "#fef2f2" },
  cellInput: {
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    fontSize: 12.5,
    color: "#1e293b",
    fontFamily: "inherit",
    resize: "none",
    lineHeight: 1.4,
    padding: "2px 0",
  },
};

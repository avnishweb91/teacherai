import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import axios from "axios";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import SchoolLogoUpload from "../components/SchoolLogoUpload";

/* ── constants ── */
const GRADES   = ["LKG","UKG","Class 1","Class 2","Class 3","Class 4","Class 5",
                  "Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"];
const SECTIONS = ["A","B","C","D","E"];
const TERMS    = ["Term 1","Term 2","Half Yearly","Annual","Mid-Term"];
const DEF_SUBJECTS = ["English","Hindi","Mathematics","Science","Social Studies","Computer"];

const GRADE_LABEL = (pct) => {
  if (pct >= 91) return { g: "A+", c: "#15803d" };
  if (pct >= 81) return { g: "A",  c: "#16a34a" };
  if (pct >= 71) return { g: "B+", c: "#2563eb" };
  if (pct >= 61) return { g: "B",  c: "#3b82f6" };
  if (pct >= 51) return { g: "C",  c: "#ca8a04" };
  if (pct >= 41) return { g: "D",  c: "#ea580c" };
  return              { g: "F",  c: "#dc2626" };
};

const token = () => localStorage.getItem("token");
const API   = `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/api/reportcard/remark`;

/* ── Compute attendance % from pre-fetched API data ── */
function lookupAttendance(rollNo, forYear, forClassName, forSection, attStudents, attRecords) {
  try {
    const attStudent =
      attStudents.find(s =>
        String(s.rollNo) === String(rollNo) &&
        s.className === forClassName &&
        s.section   === forSection
      ) ||
      attStudents.find(s => String(s.rollNo) === String(rollNo));

    if (!attStudent) return null;

    const sid = String(attStudent.id);
    const yearStr = String(forYear);

    const activeMonths = new Set();
    Object.keys(attRecords).forEach(dateKey => {
      if (dateKey.startsWith(yearStr)) activeMonths.add(dateKey.slice(0, 7));
    });
    if (activeMonths.size === 0) return null;

    let present = 0, totalSchoolDays = 0;
    activeMonths.forEach(ym => {
      const [y, m] = ym.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        if (new Date(y, m - 1, d).getDay() === 0) continue;
        totalSchoolDays++;
        const key = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const dayRec = attRecords[key];
        if (dayRec) {
          const st = dayRec[sid];
          if (st === "P" || st === "L") present++;
        }
      }
    });

    if (totalSchoolDays === 0) return null;
    return Math.round((present / totalSchoolDays) * 100);
  } catch { return null; }
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function ReportCard() {

  const [logo, setLogo] = useState(() => localStorage.getItem("school_logo") || null);

  /* ── class config ── */
  const [schoolName,   setSchoolName]   = useState("Delhi Public School");
  const [className,    setClassName]    = useState("Class 5");
  const [section,      setSection]      = useState("A");
  const [term,         setTerm]         = useState("Term 1");
  const [year,         setYear]         = useState(new Date().getFullYear());
  const [teacherName,  setTeacherName]  = useState("");
  const [maxMarks,     setMaxMarks]     = useState(100);

  /* ── subjects ── */
  const [subjects,     setSubjects]     = useState(DEF_SUBJECTS);
  const [newSubject,   setNewSubject]   = useState("");

  /* ── students ── */
  const [students,     setStudents]     = useState([]);
  const [newName,      setNewName]      = useState("");
  const [newRoll,      setNewRoll]      = useState("");

  /* ── attendance lookup data (from API) ── */
  const [attStudents,   setAttStudents]   = useState([]);
  const [attRecordsYear, setAttRecordsYear] = useState({});

  useEffect(() => {
    api.get("/api/attendance/students").then(r => setAttStudents(r.data)).catch(() => {});
    api.get(`/api/attendance/records/year?year=${year}`).then(r => setAttRecordsYear(r.data)).catch(() => {});
  }, [year]); // eslint-disable-line

  /* ── ui ── */
  const [step,         setStep]         = useState(1); // 1=Setup 2=Students 3=Remarks
  const [generating,   setGenerating]   = useState(false);
  const [genProgress,  setGenProgress]  = useState(0);
  const [error,        setError]        = useState("");
  const [limitHit,     setLimitHit]     = useState(false);
  const [preview,      setPreview]      = useState(null); // student being previewed

  const navigate = useNavigate();

  /* ── add subject ── */
  const addSubject = (e) => {
    e.preventDefault();
    const s = newSubject.trim();
    if (!s || subjects.includes(s)) return;
    setSubjects([...subjects, s]);
    setNewSubject("");
  };
  const removeSubject = (s) => setSubjects(subjects.filter(x => x !== s));

  /* ── add student (auto-fills attendance from att_records) ── */
  const addStudent = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const id   = Date.now();
    const roll = newRoll || String(students.length + 1);
    const marks = {};
    subjects.forEach(s => { marks[s] = ""; });
    const autoAtt = lookupAttendance(roll, year, className, section, attStudents, attRecordsYear);
    setStudents([...students, {
      id, rollNo: roll, name: newName.trim(), marks,
      attendance: autoAtt !== null ? String(autoAtt) : "",
      attAutoFilled: autoAtt !== null,
      remark: "",
    }]);
    setNewName(""); setNewRoll("");
  };

  const removeStudent = (id) => setStudents(students.filter(s => s.id !== id));

  /* ── sync all students' attendance from att_records ── */
  const syncAttendance = () => {
    setStudents(prev => prev.map(s => {
      const autoAtt = lookupAttendance(s.rollNo, year, className, section, attStudents, attRecordsYear);
      return autoAtt !== null
        ? { ...s, attendance: String(autoAtt), attAutoFilled: true }
        : s;
    }));
  };

  /* ── update marks / attendance ── */
  const updateMark = (id, subject, val) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, marks: { ...s.marks, [subject]: val } } : s
    ));
  };
  const updateAttendance = (id, val) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, attendance: val } : s));
  };
  const updateRemark = (id, val) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, remark: val } : s));
  };

  /* ── AI generate all remarks ── */
  const generateAllRemarks = async () => {
    setGenerating(true); setError(""); setLimitHit(false); setGenProgress(0);
    let done = 0;
    const updated = [...students];

    for (let i = 0; i < updated.length; i++) {
      const s = updated[i];
      const marksMap = {};
      subjects.forEach(sub => {
        const v = parseInt(s.marks[sub]);
        if (!isNaN(v)) marksMap[sub] = v;
      });

      try {
        const res = await axios.post(API, {
          studentName: s.name,
          rollNo: s.rollNo,
          grade: className,
          section,
          term,
          year: Number(year),
          subjectMarks: marksMap,
          maxMarks: Number(maxMarks),
          attendance: parseFloat(s.attendance) || 0,
          teacherName,
          schoolName,
        }, { headers: { Authorization: `Bearer ${token()}` } });

        updated[i] = { ...s, remark: res.data };
      } catch (e) {
        if (e.response?.status === 402) {
          setLimitHit(true);
          setGenerating(false);
          setStudents([...updated]);
          return;
        }
        updated[i] = { ...s, remark: updated[i].remark || "Unable to generate remark. Please edit manually." };
      }

      done++;
      setGenProgress(Math.round((done / updated.length) * 100));
      setStudents([...updated]);
    }

    setGenerating(false);
    setStep(3);
  };

  /* ── per-student PDF ── */
  const downloadStudentPDF = (s) => {
    const doc = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
    buildStudentPDF(doc, s);
    doc.save(`ReportCard_${s.name.replace(/\s+/g,"_")}_${term}_${year}.pdf`);
  };

  /* ── bulk PDF ── */
  const downloadAllPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
    students.forEach((s, i) => {
      if (i > 0) doc.addPage();
      buildStudentPDF(doc, s);
    });
    doc.save(`ReportCards_${className}_${section}_${term}_${year}.pdf`);
  };

  /* ── PDF builder for one student ── */
  const buildStudentPDF = (doc, s) => {
    const pw = doc.internal.pageSize.getWidth();   // 210mm
    const ph = doc.internal.pageSize.getHeight();  // 297mm

    // ── border
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.8);
    doc.rect(8, 8, pw - 16, ph - 16);
    doc.setLineWidth(0.3);
    doc.rect(10, 10, pw - 20, ph - 20);

    // ── header band
    doc.setFillColor(30, 58, 138);
    doc.rect(10, 10, pw - 20, 22, "F");

    if (logo) { try { doc.addImage(logo, "PNG", 13, 12, 16, 16); } catch {} }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(schoolName, pw / 2, 19, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("Student Progress Report Card", pw / 2, 26, { align: "center" });

    // ── term / class band
    doc.setFillColor(239, 246, 255);
    doc.rect(10, 32, pw - 20, 10, "F");
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(`${term}  |  ${year}  |  ${className} - ${section}`, pw / 2, 39, { align: "center" });

    // ── student info row
    const infoY = 50;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(12, infoY, pw - 24, 18, 2, 2, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(`Name:`, 16, infoY + 7);
    doc.setFont("helvetica", "normal");
    doc.text(s.name, 32, infoY + 7);

    doc.setFont("helvetica", "bold");
    doc.text(`Roll No:`, 90, infoY + 7);
    doc.setFont("helvetica", "normal");
    doc.text(String(s.rollNo), 110, infoY + 7);

    doc.setFont("helvetica", "bold");
    doc.text(`Attendance:`, 145, infoY + 7);
    const attPct = parseFloat(s.attendance) || 0;
    doc.setTextColor(attPct < 75 ? 220 : 22, attPct < 75 ? 38 : 163, attPct < 75 ? 38 : 74);
    doc.setFont("helvetica", "bold");
    doc.text(`${attPct.toFixed(1)}%`, 174, infoY + 7);
    if (attPct < 75) {
      doc.setFontSize(7); doc.text("(Low)", 183, infoY + 7);
    }

    doc.setTextColor(15, 23, 42); doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Class Teacher:`, 16, infoY + 14);
    doc.setFont("helvetica", "normal");
    doc.text(teacherName || "—", 48, infoY + 14);

    // ── marks table
    const tableData = subjects.map(sub => {
      const obtained = parseInt(s.marks[sub]) || 0;
      const pct = maxMarks > 0 ? Math.round((obtained / maxMarks) * 100) : 0;
      const { g } = GRADE_LABEL(pct);
      return [sub, obtained, maxMarks, `${pct}%`, g];
    });

    // totals row
    const totalObt = subjects.reduce((acc, sub) => acc + (parseInt(s.marks[sub]) || 0), 0);
    const totalMax = subjects.length * maxMarks;
    const totalPct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
    const { g: totalGrade } = GRADE_LABEL(totalPct);

    autoTable(doc, {
      head: [["Subject", "Marks Obtained", "Maximum Marks", "Percentage", "Grade"]],
      body: tableData,
      foot: [["TOTAL", totalObt, totalMax, `${totalPct}%`, totalGrade]],
      startY: 74,
      styles: { fontSize: 9.5, cellPadding: 3, halign: "center", valign: "middle" },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { halign: "left", cellWidth: 55 },
        4: { fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const pct = parseInt(data.row.cells[3].raw);
          const { c } = GRADE_LABEL(pct);
          const rgb = hexToRgb(c);
          if (rgb) data.cell.styles.textColor = [rgb.r, rgb.g, rgb.b];
        }
        if (data.section === "body" && data.column.index === 1) {
          const pct = data.row.cells[3]
            ? parseInt(data.row.cells[3].raw) : 0;
          if (pct < 40) data.cell.styles.textColor = [220, 38, 38];
        }
      },
      margin: { left: 12, right: 12 },
    });

    // ── remarks box
    const remarkY = doc.lastAutoTable.finalY + 10;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(12, remarkY, pw - 24, 42, 2, 2, "FD");

    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("Class Teacher's Remarks:", 16, remarkY + 7);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
    const remarkText = s.remark || "—";
    const lines = doc.splitTextToSize(remarkText, pw - 32);
    doc.text(lines, 16, remarkY + 14);

    // ── signature row
    const sigY = ph - 30;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);

    const sigCols = [
      [14,          "Class Teacher's Signature"],
      [pw / 2 - 23, "Principal's Signature"],
      [pw - 60,     "Parent's Signature"],
    ];
    sigCols.forEach(([x, label]) => {
      doc.line(x, sigY, x + 46, sigY);
      doc.text(label, x + 23, sigY + 5, { align: "center" });
    });

    // ── footer
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    // branding removed
  };

  /* helper */
  function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
  }

  /* ── overall pct helper ── */
  const overallPct = (s) => {
    let obtained = 0, max = 0;
    subjects.forEach(sub => {
      const v = parseInt(s.marks[sub]);
      if (!isNaN(v)) { obtained += v; max += maxMarks; }
    });
    return max > 0 ? Math.round((obtained / max) * 100) : 0;
  };

  /* ══════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Report Card Generator</h1>
        <p className="page-subtitle">AI-powered personalized remarks for every student — printable PDF in seconds.</p>
      </div>

      {/* ── Step indicator ── */}
      <div style={{ display:"flex", gap:0, marginBottom:28, maxWidth:540 }}>
        {[["1","Class Setup"],["2","Student Marks"],["3","Remarks & PDF"]].map(([n,l],i)=>(
          <div key={n} style={{ flex:1, display:"flex", alignItems:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
              <div style={{
                width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center",
                justifyContent:"center", fontWeight:800, fontSize:14,
                background: step >= i+1 ? "#2563eb" : "#e2e8f0",
                color: step >= i+1 ? "#fff" : "#94a3b8",
              }}>{n}</div>
              <div style={{ fontSize:11, marginTop:4, fontWeight:600,
                color: step >= i+1 ? "#2563eb" : "#94a3b8" }}>{l}</div>
            </div>
            {i < 2 && <div style={{ height:2, flex:1, background: step > i+1 ? "#2563eb" : "#e2e8f0",
              marginBottom:18, marginTop:-4 }} />}
          </div>
        ))}
      </div>

      {/* ════════ STEP 1: Setup ════════ */}
      {step === 1 && (
        <div style={{ maxWidth: 700 }}>
          <div className="card" style={{ marginBottom:20 }}>
            <p style={{ fontWeight:700, color:"#0f172a", fontSize:15, marginBottom:16 }}>Class Information</p>
            <SchoolLogoUpload logo={logo} setLogo={setLogo} />
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">School Name</label>
                <input className="form-input" value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="Your school name" />
              </div>
              <div className="form-field">
                <label className="form-label">Teacher Name</label>
                <input className="form-input" value={teacherName} onChange={e=>setTeacherName(e.target.value)} placeholder="Class teacher's name" />
              </div>
              <div className="form-field">
                <label className="form-label">Class</label>
                <select className="form-select" value={className} onChange={e=>setClassName(e.target.value)}>
                  {GRADES.map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Section</label>
                <select className="form-select" value={section} onChange={e=>setSection(e.target.value)}>
                  {SECTIONS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Term / Exam</label>
                <select className="form-select" value={term} onChange={e=>setTerm(e.target.value)}>
                  {TERMS.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Year</label>
                <input type="number" className="form-input" value={year} min={2020} max={2035}
                  onChange={e=>setYear(e.target.value)} style={{ width:100 }} />
              </div>
              <div className="form-field">
                <label className="form-label">Max Marks per Subject</label>
                <input type="number" className="form-input" value={maxMarks} min={1} max={200}
                  onChange={e=>setMaxMarks(Number(e.target.value))} style={{ width:100 }} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom:20 }}>
            <p style={{ fontWeight:700, color:"#0f172a", fontSize:15, marginBottom:12 }}>Subjects</p>
            <form onSubmit={addSubject} style={{ display:"flex", gap:8, marginBottom:14 }}>
              <input className="form-input" placeholder="Add subject" value={newSubject}
                onChange={e=>setNewSubject(e.target.value)} style={{ flex:1 }} />
              <button type="submit" className="btn-primary">+ Add</button>
            </form>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {subjects.map(s => (
                <span key={s} style={{ background:"#eff6ff", color:"#2563eb", borderRadius:20,
                  padding:"5px 14px", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                  {s}
                  <button onClick={()=>removeSubject(s)}
                    style={{ background:"none", border:"none", color:"#93c5fd", cursor:"pointer",
                      fontSize:15, lineHeight:1, padding:0 }}>×</button>
                </span>
              ))}
            </div>
          </div>

          <button className="btn-primary" style={{ padding:"12px 32px", fontSize:15 }}
            onClick={()=>setStep(2)} disabled={subjects.length === 0}>
            Next: Add Students →
          </button>
        </div>
      )}

      {/* ════════ STEP 2: Student Marks ════════ */}
      {step === 2 && (
        <div>
          {/* Add student form */}
          <div className="card" style={{ maxWidth:500, marginBottom:20 }}>
            <p style={{ fontWeight:700, color:"#0f172a", fontSize:15, marginBottom:12 }}>Add Student</p>
            <form onSubmit={addStudent} style={{ display:"flex", gap:8 }}>
              <input className="form-input" placeholder="Roll No" value={newRoll}
                onChange={e=>setNewRoll(e.target.value)} style={{ width:80 }} />
              <input className="form-input" placeholder="Student full name" value={newName}
                onChange={e=>setNewName(e.target.value)} required style={{ flex:1 }} />
              <button type="submit" className="btn-primary" style={{ whiteSpace:"nowrap" }}>+ Add</button>
            </form>
          </div>

          {students.length === 0 ? (
            <div className="card" style={{ textAlign:"center", color:"#94a3b8", padding:"48px 24px", maxWidth:500 }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
              <p>Add students above to enter their marks.</p>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap" }}>
                <button onClick={syncAttendance}
                  style={{ background:"#eff6ff", color:"#2563eb", border:"1.5px solid #bfdbfe",
                    borderRadius:8, padding:"7px 16px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                  🔄 Sync Attendance from Records
                </button>
                <span style={{ fontSize:12, color:"#64748b" }}>
                  Matches {className} – {section} roll numbers with Attendance Manager records for {year}
                </span>
              </div>
              <table style={{ borderCollapse:"collapse", fontSize:13, minWidth:600 }}>
                <thead>
                  <tr style={{ background:"#1e3a8a" }}>
                    <th style={{ ...th, color:"#fff", width:50 }}>Roll</th>
                    <th style={{ ...th, color:"#fff", textAlign:"left", minWidth:140 }}>Name</th>
                    {subjects.map(s=>(
                      <th key={s} style={{ ...th, color:"#fff", minWidth:80 }}>{s}</th>
                    ))}
                    <th style={{ ...th, color:"#93c5fd", minWidth:90 }}>Att % 🔄</th>
                    <th style={{ ...th, color:"#fff", minWidth:60 }}>Overall</th>
                    <th style={{ ...th, color:"#fff" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice().sort((a,b)=>Number(a.rollNo)-Number(b.rollNo)).map((s,ri) => {
                    const pct = overallPct(s);
                    const { g, c } = GRADE_LABEL(pct);
                    return (
                      <tr key={s.id} style={{ background: ri%2===0?"#fff":"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
                        <td style={{ ...td, textAlign:"center", color:"#64748b", fontWeight:600 }}>{s.rollNo}</td>
                        <td style={{ ...td, fontWeight:600, color:"#0f172a" }}>{s.name}</td>
                        {subjects.map(sub=>(
                          <td key={sub} style={{ td, padding:"6px 4px" }}>
                            <input
                              type="number" min={0} max={maxMarks}
                              value={s.marks[sub]}
                              onChange={e=>updateMark(s.id, sub, e.target.value)}
                              style={{ width:64, textAlign:"center", border:"1.5px solid #e2e8f0",
                                borderRadius:6, padding:"5px 4px", fontSize:13, outline:"none" }}
                              placeholder="—"
                            />
                          </td>
                        ))}
                        <td style={{ ...td, padding:"6px 4px" }}>
                          <div style={{ position:"relative", display:"inline-block" }}>
                            <input type="number" min={0} max={100}
                              value={s.attendance}
                              onChange={e => {
                                updateAttendance(s.id, e.target.value);
                                setStudents(prev => prev.map(x =>
                                  x.id === s.id ? { ...x, attAutoFilled: false } : x
                                ));
                              }}
                              style={{ width:64, textAlign:"center",
                                border: s.attAutoFilled ? "1.5px solid #86efac" : "1.5px solid #e2e8f0",
                                background: s.attAutoFilled ? "#f0fdf4" : "#fff",
                                borderRadius:6, padding:"5px 4px", fontSize:13, outline:"none" }}
                              placeholder="—"
                            />
                            {s.attAutoFilled && (
                              <span style={{ position:"absolute", top:-7, right:-4, background:"#16a34a",
                                color:"#fff", fontSize:9, fontWeight:700, borderRadius:4,
                                padding:"1px 4px", lineHeight:1.4 }}>auto</span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...td, textAlign:"center", fontWeight:800, color: c }}>
                          {pct > 0 ? `${pct}% (${g})` : "—"}
                        </td>
                        <td style={{ ...td, textAlign:"center" }}>
                          <button onClick={()=>removeStudent(s.id)}
                            style={{ background:"#fee2e2", border:"none", color:"#dc2626",
                              borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:12 }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display:"flex", gap:12, marginTop:20 }}>
            <button className="btn-secondary" onClick={()=>setStep(1)}>← Back</button>
            {students.length > 0 && (
              <button className="btn-primary" style={{ padding:"12px 28px", fontSize:15 }}
                onClick={generateAllRemarks} disabled={generating}>
                {generating
                  ? `Generating… ${genProgress}%`
                  : `✨ Generate AI Remarks for ${students.length} Student${students.length>1?"s":""}`}
              </button>
            )}
          </div>

          {generating && (
            <div style={{ marginTop:16, maxWidth:400 }}>
              <div style={{ height:8, background:"#e2e8f0", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${genProgress}%`, background:"#2563eb",
                  borderRadius:99, transition:"width 0.3s" }} />
              </div>
              <p style={{ fontSize:13, color:"#64748b", marginTop:6 }}>
                Generating AI remarks… {genProgress}%
              </p>
            </div>
          )}
          {limitHit && (
            <div style={{
              marginTop:12, padding:"16px 20px", borderRadius:12,
              background:"#fffbeb", border:"1px solid #fcd34d",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap"
            }}>
              <div>
                <div style={{ fontWeight:700, color:"#92400e" }}>Daily limit reached</div>
                <div style={{ fontSize:13, color:"#b45309" }}>FREE plan allows 1 report card session/day. Upgrade for unlimited access.</div>
              </div>
              <button className="btn-primary" onClick={() => navigate("/upgrade")} style={{ whiteSpace:"nowrap" }}>
                Upgrade to PRO
              </button>
            </div>
          )}
          {error && <div className="alert-error" style={{ marginTop:12 }}>{error}</div>}
        </div>
      )}

      {/* ════════ STEP 3: Remarks & PDF ════════ */}
      {step === 3 && (
        <div>
          {/* Action bar */}
          <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
            <button className="btn-secondary" onClick={()=>setStep(2)}>← Edit Marks</button>
            <button className="btn-primary" onClick={downloadAllPDF} style={{ gap:6 }}>
              ⬇ Bulk Download PDF ({students.length} cards)
            </button>
            <span style={{ fontSize:13, color:"#64748b", alignSelf:"center" }}>
              or download individually below
            </span>
          </div>

          {/* Cards grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
            {students.slice().sort((a,b)=>Number(a.rollNo)-Number(b.rollNo)).map(s => {
              const pct = overallPct(s);
              const { g, c } = GRADE_LABEL(pct);
              const attPct = parseFloat(s.attendance) || 0;
              return (
                <div key={s.id} className="card" style={{ padding:20 }}>
                  {/* Student header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{s.name}</div>
                      <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                        Roll {s.rollNo} · {className} {section}
                      </div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:900, color: c }}>{g}</div>
                      <div style={{ fontSize:11, color:"#64748b" }}>{pct}%</div>
                    </div>
                  </div>

                  {/* Mini marks */}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
                    {subjects.map(sub => {
                      const v = parseInt(s.marks[sub]);
                      const sp = !isNaN(v) ? Math.round((v/maxMarks)*100) : null;
                      return (
                        <span key={sub} style={{ fontSize:11, background: sp !== null && sp < 40 ? "#fee2e2" : "#f1f5f9",
                          color: sp !== null && sp < 40 ? "#dc2626" : "#475569",
                          borderRadius:6, padding:"2px 7px", fontWeight:600 }}>
                          {sub}: {isNaN(v) ? "—" : v}
                        </span>
                      );
                    })}
                    <span style={{ fontSize:11, background: attPct < 75 ? "#fee2e2" : "#dcfce7",
                      color: attPct < 75 ? "#dc2626" : "#16a34a",
                      borderRadius:6, padding:"2px 7px", fontWeight:600 }}>
                      Att: {attPct}%
                    </span>
                  </div>

                  {/* Remark text */}
                  <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8,
                    padding:"10px 12px", marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#92400e", marginBottom:4 }}>Teacher's Remark:</div>
                    <textarea
                      value={s.remark}
                      onChange={e=>updateRemark(s.id, e.target.value)}
                      rows={4}
                      style={{ width:"100%", border:"none", background:"transparent", resize:"vertical",
                        fontSize:12, color:"#1c1917", lineHeight:1.6, outline:"none", fontFamily:"inherit" }}
                    />
                  </div>

                  {/* Download button */}
                  <button onClick={()=>downloadStudentPDF(s)}
                    style={{ width:"100%", background:"#2563eb", color:"#fff", border:"none",
                      borderRadius:8, padding:"9px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                    ⬇ Download PDF
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── style helpers ── */
const th = { padding:"10px 10px", fontWeight:700, fontSize:12, textAlign:"center",
             borderBottom:"2px solid rgba(255,255,255,0.15)", color:"#fff" };
const td = { padding:"8px 10px", borderBottom:"1px solid #f1f5f9", fontSize:13 };

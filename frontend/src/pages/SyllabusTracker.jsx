import { useState, useEffect } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import SchoolLogoUpload from "../components/SchoolLogoUpload";

const GRADES = ["LKG","UKG","Class 1","Class 2","Class 3","Class 4","Class 5",
                "Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"];
const BOARDS = ["CBSE","ICSE","Bihar Board"];

export default function SyllabusTracker() {
  const [grade, setGrade]       = useState("Class 6");
  const [board, setBoard]       = useState("CBSE");
  const [subject, setSubject]   = useState("");
  const [newChapter, setNewChapter] = useState("");
  const [logo, setLogo]         = useState(() => localStorage.getItem("school_logo") || null);
  const [activeSubject, setActiveSubject] = useState(null);

  /* chaptersBySubject: { subjectName: [{id, name, done}] } */
  const [chaptersBySubject, setChaptersBySubject] = useState({});
  /* subjects from API + locally added empty subjects */
  const [localSubjects, setLocalSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const subjects = [...new Set([...Object.keys(chaptersBySubject), ...localSubjects])];
  const chapters = activeSubject ? (chaptersBySubject[activeSubject] || []) : [];

  /* load whenever grade or board changes */
  useEffect(() => {
    loadChapters(grade, board);
  }, [grade, board]); // eslint-disable-line

  useEffect(() => {
    setLocalSubjects([]);
  }, [grade, board]);

  const loadChapters = async (g, b) => {
    setLoading(true);
    try {
      const resp = await api.get(`/api/syllabus?grade=${encodeURIComponent(g)}&board=${encodeURIComponent(b)}`);
      if (resp.data.length === 0) {
        await migrateFromLocal(g, b);
        const r2 = await api.get(`/api/syllabus?grade=${encodeURIComponent(g)}&board=${encodeURIComponent(b)}`);
        applyChapters(r2.data, g, b);
      } else {
        applyChapters(resp.data, g, b);
      }
    } catch { /* API unavailable */ }
    setLoading(false);
  };

  const applyChapters = (data, g, b) => {
    const bySubject = {};
    data.forEach(c => {
      if (!bySubject[c.subject]) bySubject[c.subject] = [];
      bySubject[c.subject].push({ id: c.id, name: c.chapterName, done: c.done });
    });
    setChaptersBySubject(bySubject);
    setActiveSubject(prev => {
      const keys = Object.keys(bySubject);
      if (prev && bySubject[prev]) return prev;
      return keys[0] || null;
    });
    setLocalSubjects(ls => ls.filter(s => !bySubject[s]));
  };

  const migrateFromLocal = async (g, b) => {
    const stored = (() => { try { return JSON.parse(localStorage.getItem("syllabus_tracker_v1") || "{}"); } catch { return {}; } })();
    const gradeKey = `${g}||${b}`;
    const gradeData = stored[gradeKey];
    if (!gradeData) return;

    for (const [sub, chs] of Object.entries(gradeData)) {
      if (!chs || !chs.length) continue;
      const payload = chs.map((c, i) => ({ chapterName: c.name, done: c.done || false, sortOrder: i }));
      await api.post(
        `/api/syllabus/bulk?grade=${encodeURIComponent(g)}&board=${encodeURIComponent(b)}&subject=${encodeURIComponent(sub)}`,
        payload
      );
    }

    delete stored[gradeKey];
    if (Object.keys(stored).length === 0) {
      localStorage.removeItem("syllabus_tracker_v1");
    } else {
      localStorage.setItem("syllabus_tracker_v1", JSON.stringify(stored));
    }
  };

  /* ── add subject ── */
  const addSubject = (e) => {
    e.preventDefault();
    if (!subject.trim()) return;
    const s = subject.trim();
    if (subjects.includes(s)) { setSubject(""); return; }
    setLocalSubjects(prev => [...prev, s]);
    setActiveSubject(s);
    setSubject("");
  };

  const removeSubject = async (s) => {
    if (!window.confirm(`Delete subject "${s}" and all its chapters?`)) return;
    if (localSubjects.includes(s)) {
      setLocalSubjects(prev => prev.filter(x => x !== s));
    } else {
      try {
        await api.post(
          `/api/syllabus/bulk?grade=${encodeURIComponent(grade)}&board=${encodeURIComponent(board)}&subject=${encodeURIComponent(s)}`,
          []
        );
        setChaptersBySubject(prev => {
          const copy = { ...prev };
          delete copy[s];
          return copy;
        });
      } catch {}
    }
    setActiveSubject(prev => {
      const remaining = subjects.filter(x => x !== s);
      return remaining[0] || null;
    });
  };

  /* ── add chapter ── */
  const addChapter = async (e) => {
    e.preventDefault();
    if (!activeSubject || !newChapter.trim()) return;
    try {
      const resp = await api.post("/api/syllabus", {
        grade, board, subject: activeSubject,
        chapterName: newChapter.trim(),
        done: false,
        sortOrder: chapters.length,
      });
      const newEntry = { id: resp.data.id, name: resp.data.chapterName, done: resp.data.done };
      setChaptersBySubject(prev => ({
        ...prev,
        [activeSubject]: [...(prev[activeSubject] || []), newEntry]
      }));
      /* if was a local (empty) subject, move to persisted */
      setLocalSubjects(prev => prev.filter(s => s !== activeSubject));
      setNewChapter("");
    } catch {}
  };

  const toggleChapter = async (id) => {
    try {
      const resp = await api.patch(`/api/syllabus/${id}/toggle`);
      const updated = { id: resp.data.id, name: resp.data.chapterName, done: resp.data.done };
      setChaptersBySubject(prev => ({
        ...prev,
        [activeSubject]: prev[activeSubject].map(c => c.id === id ? updated : c)
      }));
    } catch {}
  };

  const removeChapter = async (id) => {
    try {
      await api.delete(`/api/syllabus/${id}`);
      setChaptersBySubject(prev => ({
        ...prev,
        [activeSubject]: prev[activeSubject].filter(c => c.id !== id)
      }));
    } catch {}
  };

  const pct = (chs) => {
    if (!chs || chs.length === 0) return 0;
    return Math.round((chs.filter(c => c.done).length / chs.length) * 100);
  };

  const overallPct = () => {
    const all = subjects.flatMap(s => chaptersBySubject[s] || []);
    return pct(all);
  };

  /* ── PDF ── */
  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
    const pw = doc.internal.pageSize.getWidth();

    if (logo) { try { doc.addImage(logo, "PNG", 10, 8, 18, 18); } catch {} }
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(`Syllabus Completion Report`, pw / 2, 16, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`${grade} — ${board} | Overall: ${overallPct()}% complete`, pw / 2, 23, { align: "center" });
    doc.text(new Date().toLocaleDateString("en-IN"), pw / 2, 28, { align: "center" });

    let startY = 35;
    subjects.forEach(s => {
      const chs = chaptersBySubject[s] || [];
      if (!chs.length) return;
      const p = pct(chs);
      const body = chs.map(c => [c.done ? "✓" : "○", c.name, c.done ? "Completed" : "Pending"]);

      autoTable(doc, {
        head: [[`${s}`, "", `${p}% done (${chs.filter(c=>c.done).length}/${chs.length})`]],
        body,
        startY,
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 130 },
          2: { cellWidth: 35, halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            if (data.column.index === 2 && data.cell.raw === "Completed") {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = "bold";
            }
            if (data.column.index === 2 && data.cell.raw === "Pending") {
              data.cell.styles.textColor = [148, 163, 184];
            }
          }
        },
        margin: { left: 14, right: 14 },
      });
      startY = doc.lastAutoTable.finalY + 8;
    });

    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text("Generated by SmartBoard AI", pw / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
    doc.save(`Syllabus_${grade.replace(/\s/g,"")}_${board}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Syllabus Tracker</h1>
        <p className="page-subtitle">Track chapter completion per subject and class — download a progress report anytime.</p>
      </div>

      {/* Config bar */}
      <div className="card" style={{ maxWidth: 800, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-field" style={{ minWidth: 140 }}>
            <label className="form-label">Class</label>
            <select className="form-select" value={grade} onChange={e => setGrade(e.target.value)}>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ minWidth: 140 }}>
            <label className="form-label">Board</label>
            <select className="form-select" value={board} onChange={e => setBoard(e.target.value)}>
              {BOARDS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <SchoolLogoUpload logo={logo} setLogo={setLogo} />
          </div>
        </div>

        {/* Overall progress */}
        {subjects.length > 0 && !loading && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#f8fafc", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Overall Completion — {grade}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>{overallPct()}%</span>
            </div>
            <div style={{ background: "#e2e8f0", borderRadius: 99, height: 8 }}>
              <div style={{ background: "linear-gradient(90deg, #2563eb, #7c3aed)", borderRadius: 99, height: 8, width: `${overallPct()}%`, transition: "width 0.4s" }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, maxWidth: 800 }}>

        {/* Subject list */}
        <div>
          <div className="card" style={{ padding: "16px" }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>Subjects</p>
            {loading ? (
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>Loading…</p>
            ) : subjects.length === 0 ? (
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>No subjects yet.</p>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {subjects.map(s => {
                const p = pct(chaptersBySubject[s] || []);
                const isActive = activeSubject === s;
                return (
                  <div key={s}
                    onClick={() => setActiveSubject(s)}
                    style={{
                      padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                      background: isActive ? "#eff6ff" : "#f8fafc",
                      border: isActive ? "1.5px solid #93c5fd" : "1.5px solid transparent",
                      transition: "all 0.15s",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "#2563eb" : "#0f172a" }}>{s}</span>
                      <button onClick={e => { e.stopPropagation(); removeSubject(s); }}
                        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <div style={{ flex: 1, background: "#e2e8f0", borderRadius: 99, height: 4 }}>
                        <div style={{ background: p === 100 ? "#16a34a" : "#2563eb", borderRadius: 99, height: 4, width: `${p}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b", minWidth: 28 }}>{p}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={addSubject} style={{ display: "flex", gap: 6 }}>
              <input className="form-input" placeholder="Add subject" value={subject}
                onChange={e => setSubject(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
              <button type="submit" className="btn-primary" style={{ padding: "8px 12px", fontSize: 12 }}>+</button>
            </form>
          </div>

          {subjects.length > 0 && (
            <button className="btn-secondary" onClick={downloadPDF} style={{ width: "100%", marginTop: 10 }}>
              ⬇ PDF Report
            </button>
          )}
        </div>

        {/* Chapter list */}
        <div className="card">
          {!activeSubject ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
              <p>Select or add a subject to track chapters.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", margin: 0 }}>{activeSubject}</p>
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  {chapters.filter(c => c.done).length} / {chapters.length} chapters done
                </span>
              </div>

              {chapters.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>
                  <p style={{ fontSize: 13 }}>No chapters yet. Add chapters below.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {chapters.map((c, i) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 8,
                      background: c.done ? "#f0fdf4" : "#f8fafc",
                      border: c.done ? "1px solid #86efac" : "1px solid #e2e8f0",
                    }}>
                      <button onClick={() => toggleChapter(c.id)}
                        style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: "pointer",
                          border: c.done ? "none" : "2px solid #cbd5e1",
                          background: c.done ? "#16a34a" : "#fff",
                          color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                        {c.done ? "✓" : ""}
                      </button>
                      <span style={{ flex: 1, fontSize: 14, color: c.done ? "#64748b" : "#0f172a",
                        textDecoration: c.done ? "line-through" : "none", fontWeight: c.done ? 400 : 500 }}>
                        <span style={{ color: "#94a3b8", marginRight: 6, fontSize: 12 }}>{i + 1}.</span>
                        {c.name}
                      </span>
                      <button onClick={() => removeChapter(c.id)}
                        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={addChapter} style={{ display: "flex", gap: 8 }}>
                <input className="form-input" placeholder="e.g. Chapter 1 — Real Numbers" value={newChapter}
                  onChange={e => setNewChapter(e.target.value)} style={{ flex: 1 }} />
                <button type="submit" className="btn-primary" style={{ whiteSpace: "nowrap" }}>+ Add Chapter</button>
              </form>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

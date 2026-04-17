import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import axios from "axios";
import jsPDF from "jspdf";

/* ─── constants ─── */
const NOTICE_TYPES = [
  { value: "PTM",               label: "📅 PTM – Parent-Teacher Meeting",     hint: "Date, time, venue of the PTM" },
  { value: "Fee Reminder",      label: "💰 Fee Reminder",                     hint: "Due date, amount, payment modes" },
  { value: "Exam Schedule",     label: "📝 Exam Schedule / Time Table",       hint: "Exam dates, syllabus, timing" },
  { value: "Holiday Notice",    label: "🏖️ Holiday / School Closure",         hint: "Holiday dates and reason" },
  { value: "Annual Day",        label: "🎭 Annual Day / Cultural Event",      hint: "Event date, venue, dress code" },
  { value: "Sports Day",        label: "🏃 Sports Day",                       hint: "Date, venue, activities, dress code" },
  { value: "Result Declaration",label: "📊 Result Declaration",               hint: "Result date, collection procedure" },
  { value: "Picnic / Trip",     label: "🚌 Educational Picnic / Trip",        hint: "Destination, date, cost, permissions" },
  { value: "Health Checkup",    label: "🏥 Health / Medical Checkup",         hint: "Date, doctor details, what to bring" },
  { value: "Book Distribution", label: "📚 Book / Stationery Distribution",   hint: "Date, list of items, cost" },
  { value: "Uniform Notice",    label: "👕 Uniform / Dress Code Notice",      hint: "New uniform details, where to buy, deadline" },
  { value: "Custom",            label: "✍️ Custom Notice",                    hint: "Describe what the notice is about" },
];

const CLASSES = ["All Classes","LKG","UKG","Class 1","Class 2","Class 3","Class 4","Class 5",
                 "Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"];

const API = `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/api/notice/generate`;
const token = () => localStorage.getItem("token");

const todayStr = () => {
  const d = new Date();
  return d.toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function NoticeGenerator() {

  /* ── form state ── */
  const [schoolName,   setSchoolName]   = useState("Delhi Public School");
  const [principal,    setPrincipal]    = useState("");
  const [teacherName,  setTeacherName]  = useState("");
  const [circularNo,   setCircularNo]   = useState("");
  const [noticeDate,   setNoticeDate]   = useState(todayStr());
  const [noticeType,   setNoticeType]   = useState(NOTICE_TYPES[0].value);
  const [targetClass,  setTargetClass]  = useState("All Classes");
  const [keyDetails,   setKeyDetails]   = useState("");
  const [tone,         setTone]         = useState("Formal");
  const [language,     setLanguage]     = useState("English");
  const [extraInstr,   setExtraInstr]   = useState("");

  /* ── output state ── */
  const [noticeText,   setNoticeText]   = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [limitHit,     setLimitHit]     = useState(false);

  const navigate = useNavigate();

  /* ── saved notices history ── */
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("notice_history") || "[]"); } catch { return []; }
  });

  const selectedType = NOTICE_TYPES.find(t => t.value === noticeType);

  /* ── generate ── */
  const generate = async () => {
    setLoading(true); setError(""); setNoticeText(""); setLimitHit(false);
    try {
      const res = await axios.post(API, {
        schoolName, principalName: principal, teacherName,
        noticeType, targetClass, keyDetails,
        tone, language, circularNo, noticeDate, extraInstructions: extraInstr,
      }, { headers: { Authorization: `Bearer ${token()}` } });

      const text = res.data;
      setNoticeText(text);

      // save to history
      const entry = {
        id: Date.now(),
        type: noticeType,
        targetClass,
        date: noticeDate,
        circularNo,
        text,
        schoolName,
        principal,
        teacherName,
      };
      const updated = [entry, ...history].slice(0, 20);
      setHistory(updated);
      localStorage.setItem("notice_history", JSON.stringify(updated));

    } catch (e) {
      if (e.response?.status === 402) setLimitHit(true);
      else setError("Failed to generate notice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── PDF builder ── */
  const downloadPDF = (entry = null) => {
    const src = entry || {
      schoolName, principal, teacherName, circularNo, noticeDate,
      noticeType, targetClass, text: noticeText,
    };

    const doc = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
    const pw = doc.internal.pageSize.getWidth();   // 210
    const ph = doc.internal.pageSize.getHeight();  // 297

    /* ── outer border ── */
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(1);
    doc.rect(7, 7, pw - 14, ph - 14);
    doc.setLineWidth(0.3);
    doc.rect(9.5, 9.5, pw - 19, ph - 19);

    /* ── header band ── */
    doc.setFillColor(30, 58, 138);
    doc.rect(9.5, 9.5, pw - 19, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(17);
    doc.text(src.schoolName || "School Name", pw / 2, 21, { align: "center" });
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
    doc.text("Excellence in Education", pw / 2, 28, { align: "center" });

    /* ── circular info row ── */
    doc.setFillColor(239, 246, 255);
    doc.rect(9.5, 37.5, pw - 19, 11, "F");
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    const circNo = src.circularNo ? `Circular No: ${src.circularNo}` : "";
    doc.text(circNo, 14, 44.5);
    doc.text(`Date: ${src.noticeDate || todayStr()}`, pw - 14, 44.5, { align: "right" });

    /* ── notice type title ── */
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(src.noticeType.toUpperCase(), pw / 2, 60, { align: "center" });

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(14, 63, pw - 14, 63);

    /* ── to line ── */
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`To: Parents / Guardians of ${src.targetClass}`, 14, 71);

    /* ── body text ── */
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);

    const bodyText = src.text || "";
    const lines = doc.splitTextToSize(bodyText, pw - 28);

    let curY = 80;
    const lineH = 5.5;
    const pageBottom = ph - 55; // leave room for ack slip

    lines.forEach(line => {
      if (curY + lineH > pageBottom) {
        doc.addPage();
        curY = 20;
      }
      doc.text(line, 14, curY);
      curY += lineH;
    });

    /* ── sign off ── */
    curY += 8;
    if (curY + 22 > pageBottom) { doc.addPage(); curY = 20; }

    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("Yours sincerely,", 14, curY);
    curY += 14;
    doc.setFont("helvetica", "bold");
    doc.text(src.principal || src.teacherName || "Principal", 14, curY);
    curY += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(src.principal ? "Principal" : "Class Teacher", 14, curY);

    /* ── acknowledgement slip ── */
    const ackY = ph - 45;
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.4);
    // dashed separator
    for (let x = 14; x < pw - 14; x += 5) {
      doc.line(x, ackY, x + 3, ackY);
    }
    doc.setTextColor(100, 116, 139); doc.setFontSize(7.5);
    doc.text("✂  Acknowledgement Slip — Please sign and return to class teacher", pw / 2, ackY + 5, { align: "center" });

    doc.setTextColor(15, 23, 42); doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const ackLine1 = `I/We have read the circular regarding "${src.noticeType}" dated ${src.noticeDate || ""}.`;
    doc.text(ackLine1, 14, ackY + 12);

    // slip fields
    const ackY2 = ackY + 20;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    [
      [14,   "Student Name: ___________________________"],
      [110,  `Class: __________`],
    ].forEach(([x, t]) => doc.text(t, x, ackY2));

    [
      [14,   "Parent's Signature: ______________________"],
      [110,  "Date: ____________"],
    ].forEach(([x, t]) => doc.text(t, x, ackY2 + 10));

    /* ── footer ── */
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    // branding removed

    const filename = `Notice_${(src.noticeType||"Notice").replace(/\s+/g,"_")}_${(src.targetClass||"All").replace(/\s+/g,"_")}.pdf`;
    doc.save(filename);
  };

  /* ══════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Notice / Circular Generator</h1>
        <p className="page-subtitle">AI-powered parent circulars with school letterhead — ready to print in seconds.</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 420px", gap:24, alignItems:"start" }}>

        {/* ── LEFT: Form ── */}
        <div>
          {/* School details */}
          <div className="card" style={{ marginBottom:16 }}>
            <p style={{ fontWeight:700, color:"#0f172a", fontSize:14, marginBottom:14 }}>School Details</p>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">School Name</label>
                <input className="form-input" value={schoolName} onChange={e=>setSchoolName(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label">Principal Name</label>
                <input className="form-input" value={principal} onChange={e=>setPrincipal(e.target.value)} placeholder="Optional" />
              </div>
              <div className="form-field">
                <label className="form-label">Issued by (Teacher)</label>
                <input className="form-input" value={teacherName} onChange={e=>setTeacherName(e.target.value)} placeholder="Optional" />
              </div>
              <div className="form-field">
                <label className="form-label">Circular No.</label>
                <input className="form-input" value={circularNo} onChange={e=>setCircularNo(e.target.value)} placeholder="e.g. 2025-26/001" />
              </div>
              <div className="form-field">
                <label className="form-label">Date</label>
                <input className="form-input" value={noticeDate} onChange={e=>setNoticeDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Notice details */}
          <div className="card" style={{ marginBottom:16 }}>
            <p style={{ fontWeight:700, color:"#0f172a", fontSize:14, marginBottom:14 }}>Notice Details</p>

            {/* Notice type grid */}
            <div className="form-field" style={{ marginBottom:14 }}>
              <label className="form-label">Notice Type</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {NOTICE_TYPES.map(t => (
                  <label key={t.value}
                    style={{
                      display:"flex", alignItems:"center", gap:8, cursor:"pointer",
                      border: noticeType===t.value ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                      borderRadius:10, padding:"8px 12px", fontSize:13, fontWeight:600,
                      background: noticeType===t.value ? "#eff6ff" : "#fff",
                      color: noticeType===t.value ? "#2563eb" : "#374151",
                      transition:"all 0.15s",
                    }}>
                    <input type="radio" name="noticeType" value={t.value}
                      checked={noticeType===t.value}
                      onChange={()=>setNoticeType(t.value)}
                      style={{ display:"none" }} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">For Class</label>
                <select className="form-select" value={targetClass} onChange={e=>setTargetClass(e.target.value)}>
                  {CLASSES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Tone</label>
                <div style={{ display:"flex", gap:8 }}>
                  {["Formal","Friendly"].map(t=>(
                    <button key={t} type="button"
                      onClick={()=>setTone(t)}
                      style={{ flex:1, padding:"8px", borderRadius:8, fontWeight:700, fontSize:13,
                        cursor:"pointer", border: tone===t ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                        background: tone===t ? "#eff6ff" : "#fff",
                        color: tone===t ? "#2563eb" : "#64748b" }}>
                      {t==="Formal" ? "🎩 Formal" : "😊 Friendly"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Language</label>
                <div style={{ display:"flex", gap:8 }}>
                  {["English","Hindi"].map(l=>(
                    <button key={l} type="button"
                      onClick={()=>setLanguage(l)}
                      style={{ flex:1, padding:"8px", borderRadius:8, fontWeight:700, fontSize:13,
                        cursor:"pointer", border: language===l ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                        background: language===l ? "#eff6ff" : "#fff",
                        color: language===l ? "#2563eb" : "#64748b" }}>
                      {l==="English" ? "🇬🇧 English" : "🇮🇳 Hindi"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-field" style={{ marginTop:4 }}>
              <label className="form-label">
                Key Details
                {selectedType && <span style={{ fontWeight:400, color:"#94a3b8", marginLeft:6 }}>— {selectedType.hint}</span>}
              </label>
              <textarea className="form-input" rows={3} value={keyDetails}
                onChange={e=>setKeyDetails(e.target.value)}
                placeholder={selectedType?.hint || "Describe the key information for this notice..."}
                style={{ resize:"vertical" }} />
            </div>

            <div className="form-field">
              <label className="form-label">Extra Instructions <span style={{ fontWeight:400, color:"#94a3b8" }}>(optional)</span></label>
              <input className="form-input" value={extraInstr} onChange={e=>setExtraInstr(e.target.value)}
                placeholder="e.g. Mention uniform is compulsory, parking details, etc." />
            </div>
          </div>

          <button className="btn-primary"
            style={{ padding:"13px 36px", fontSize:15, width:"100%", opacity: loading ? 0.7 : 1 }}
            onClick={generate} disabled={loading || !keyDetails.trim()}>
            {loading
              ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span className="spinner" style={{ width:16, height:16, borderWidth:2 }} /> Generating Notice…
                </span>
              : "✨ Generate Notice"}
          </button>

          {limitHit && (
            <div style={{
              marginTop:12, padding:"16px 20px", borderRadius:12,
              background:"#fffbeb", border:"1px solid #fcd34d",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap"
            }}>
              <div>
                <div style={{ fontWeight:700, color:"#92400e" }}>Daily limit reached</div>
                <div style={{ fontSize:13, color:"#b45309" }}>FREE plan allows 2 notices/day. Upgrade for unlimited access.</div>
              </div>
              <button className="btn-primary" onClick={() => navigate("/upgrade")} style={{ whiteSpace:"nowrap" }}>
                Upgrade to PRO
              </button>
            </div>
          )}
          {error && <div className="alert-error" style={{ marginTop:12 }}>{error}</div>}
        </div>

        {/* ── RIGHT: Preview + History ── */}
        <div>
          {/* Preview */}
          {noticeText ? (
            <div className="result-box" style={{ marginTop:0, marginBottom:16 }}>
              <div className="result-box-header">
                <span className="result-box-title">Notice Preview</span>
                <button className="btn-primary" style={{ fontSize:13, padding:"7px 16px" }}
                  onClick={() => downloadPDF()}>
                  ⬇ Download PDF
                </button>
              </div>

              {/* Letterhead preview */}
              <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10,
                overflow:"hidden", fontFamily:"serif" }}>
                {/* Header */}
                <div style={{ background:"#1e3a8a", color:"#fff", textAlign:"center", padding:"14px 16px" }}>
                  <div style={{ fontWeight:800, fontSize:16 }}>{schoolName}</div>
                  <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>Excellence in Education</div>
                </div>
                {/* Circular info */}
                <div style={{ background:"#eff6ff", display:"flex", justifyContent:"space-between",
                  padding:"6px 14px", fontSize:12, color:"#2563eb", fontWeight:700 }}>
                  <span>{circularNo ? `Circular No: ${circularNo}` : ""}</span>
                  <span>Date: {noticeDate}</span>
                </div>
                {/* Body */}
                <div style={{ padding:"16px 18px" }}>
                  <div style={{ fontWeight:800, textAlign:"center", letterSpacing:1, fontSize:13,
                    color:"#0f172a", marginBottom:10, textTransform:"uppercase" }}>
                    {noticeType}
                  </div>
                  <div style={{ fontSize:12, color:"#374151", marginBottom:8, fontWeight:600 }}>
                    To: Parents / Guardians of {targetClass}
                  </div>
                  <div style={{ fontSize:12.5, color:"#1c1917", lineHeight:1.75, whiteSpace:"pre-wrap" }}>
                    {noticeText}
                  </div>
                  <div style={{ marginTop:16, fontSize:12 }}>
                    <div>Yours sincerely,</div>
                    <div style={{ fontWeight:700, marginTop:10 }}>{principal || teacherName || "Principal"}</div>
                    <div style={{ color:"#64748b", fontSize:11 }}>{principal ? "Principal" : "Class Teacher"}</div>
                  </div>
                  {/* Ack slip preview */}
                  <div style={{ borderTop:"1px dashed #94a3b8", marginTop:16, paddingTop:10 }}>
                    <div style={{ fontSize:10.5, color:"#64748b", textAlign:"center", marginBottom:6 }}>
                      ✂ Acknowledgement Slip
                    </div>
                    <div style={{ fontSize:11, color:"#374151" }}>
                      I/We have read the circular regarding "{noticeType}" dated {noticeDate}.
                    </div>
                    <div style={{ display:"flex", gap:16, marginTop:8, fontSize:11, color:"#94a3b8" }}>
                      <span>Student Name: _____________</span>
                      <span>Class: _____</span>
                    </div>
                    <div style={{ display:"flex", gap:16, marginTop:6, fontSize:11, color:"#94a3b8" }}>
                      <span>Parent Signature: ___________</span>
                      <span>Date: ______</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit textarea */}
              <div style={{ marginTop:12 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>
                  Edit notice text if needed:
                </label>
                <textarea
                  value={noticeText}
                  onChange={e=>setNoticeText(e.target.value)}
                  rows={8}
                  style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8,
                    padding:"10px 12px", fontSize:13, lineHeight:1.6, resize:"vertical",
                    outline:"none", fontFamily:"inherit" }}
                />
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign:"center", color:"#94a3b8", padding:"48px 24px", marginBottom:16 }}>
              <div style={{ fontSize:44, marginBottom:12 }}>📋</div>
              <p style={{ fontWeight:600, color:"#64748b" }}>Notice preview will appear here</p>
              <p style={{ fontSize:13, marginTop:4 }}>Fill in the details and click Generate</p>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="card">
              <p style={{ fontWeight:700, color:"#0f172a", fontSize:14, marginBottom:12 }}>
                Recent Notices
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {history.slice(0,8).map(h => (
                  <div key={h.id}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      background:"#f8fafc", borderRadius:8, padding:"10px 12px",
                      border:"1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{h.type}</div>
                      <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>
                        {h.targetClass} · {h.date}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button
                        onClick={() => { setNoticeText(h.text); setNoticeType(h.type);
                          setTargetClass(h.targetClass); setNoticeDate(h.date);
                          setCircularNo(h.circularNo || ""); setPrincipal(h.principal || "");
                          setTeacherName(h.teacherName || ""); setSchoolName(h.schoolName || schoolName);
                        }}
                        style={{ background:"#eff6ff", color:"#2563eb", border:"none", borderRadius:6,
                          padding:"5px 10px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                        Load
                      </button>
                      <button onClick={() => downloadPDF(h)}
                        style={{ background:"#f0fdf4", color:"#16a34a", border:"none", borderRadius:6,
                          padding:"5px 10px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                        PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

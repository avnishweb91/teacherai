import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─── subject colour palette ─── */
const PALETTE = [
  { bg:"#dbeafe", tx:"#1e40af" }, { bg:"#dcfce7", tx:"#15803d" },
  { bg:"#fef9c3", tx:"#854d0e" }, { bg:"#fee2e2", tx:"#991b1b" },
  { bg:"#f3e8ff", tx:"#6b21a8" }, { bg:"#ffedd5", tx:"#9a3412" },
  { bg:"#e0f2fe", tx:"#0369a1" }, { bg:"#fce7f3", tx:"#9d174d" },
  { bg:"#ecfdf5", tx:"#065f46" }, { bg:"#fdf4ff", tx:"#701a75" },
  { bg:"#fff7ed", tx:"#c2410c" }, { bg:"#f0fdf4", tx:"#166534" },
];

const DAYS_ALL  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const GRADES    = ["LKG","UKG","Class 1","Class 2","Class 3","Class 4","Class 5",
                   "Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"];
const SECTIONS  = ["A","B","C","D","E"];

/* ─── helpers ─── */
const uid   = () => Date.now() + Math.round(Math.random()*1e6);
const addMin = (t, m) => {
  const [h,min] = t.split(":").map(Number);
  const tot = h*60+min+m;
  return `${String(Math.floor(tot/60)).padStart(2,"0")}:${String(tot%60).padStart(2,"0")}`;
};
const hexRgb = hex => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1],16),parseInt(r[2],16),parseInt(r[3],16)] : null;
};

/* recalculate all start times after first period */
const recalc = arr => {
  const out = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    const prev = out[i-1];
    out.push({ ...arr[i], startTime: addMin(prev.startTime, prev.duration) });
  }
  return out;
};

/* default schedule */
const DEF_PERIODS = recalc([
  { id:1, label:"Period 1",    startTime:"08:00", duration:40, isBreak:false },
  { id:2, label:"Period 2",    startTime:"",      duration:40, isBreak:false },
  { id:3, label:"Period 3",    startTime:"",      duration:40, isBreak:false },
  { id:4, label:"Lunch Break", startTime:"",      duration:30, isBreak:true  },
  { id:5, label:"Period 4",    startTime:"",      duration:40, isBreak:false },
  { id:6, label:"Period 5",    startTime:"",      duration:40, isBreak:false },
  { id:7, label:"Period 6",    startTime:"",      duration:40, isBreak:false },
  { id:8, label:"Short Break", startTime:"",      duration:15, isBreak:true  },
  { id:9, label:"Period 7",    startTime:"",      duration:40, isBreak:false },
  { id:10,label:"Period 8",    startTime:"",      duration:40, isBreak:false },
]);

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export default function TimetableBuilder() {

  /* school info */
  const [schoolName, setSchoolName] = useState("Delhi Public School");
  const [address,    setAddress]    = useState("");
  const [className,  setClassName]  = useState("Class 5");
  const [section,    setSection]    = useState("A");
  const [acadYear,   setAcadYear]   = useState("2025-26");
  const [logo,       setLogo]       = useState(null);
  const logoRef = useRef();

  /* schedule */
  const [activeDays, setActiveDays] = useState(DAYS_ALL);
  const [periods,    setPeriods]    = useState(DEF_PERIODS);

  /* timetable data  { [day]: { [periodId]: { subject, teacher } } } */
  const [tt, setTt] = useState({});

  /* subject → palette index */
  const [colorMap, setColorMap] = useState({});

  /* step 1=setup  2=grid */
  const [step, setStep] = useState(1);

  /* editing cell id */
  const [editCell, setEditCell] = useState(null); // "day-pid"

  const [limitHit, setLimitHit] = useState(false);
  const [userPlan, setUserPlan] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/user/me").then(res => setUserPlan(res.data.planType)).catch(() => {});
  }, []);

  const goToStep2 = () => {
    if (userPlan === "PRO" || userPlan === "SCHOOL") { setStep(2); return; }
    const today = new Date().toISOString().slice(0, 10);
    const key = `usage_TIMETABLE_${today}`;
    const used = parseInt(localStorage.getItem(key) || "0");
    if (used >= 1) { setLimitHit(true); return; }
    localStorage.setItem(key, String(used + 1));
    setStep(2);
  };

  /* ── logo upload ── */
  const handleLogo = e => {
    const f = e.target.files[0]; if (!f) return;
    new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result); r.readAsDataURL(f); })
      .then(b64 => setLogo(b64));
  };

  /* ── toggle day ── */
  const toggleDay = d => setActiveDays(prev =>
    prev.includes(d) ? prev.filter(x=>x!==d) : DAYS_ALL.filter(x=>[...prev,d].includes(x))
  );

  /* ── period ops ── */
  const updatePeriod = (id, field, val) => {
    setPeriods(prev => {
      const arr = prev.map(p => p.id===id ? {...p, [field]: field==="duration" ? Number(val)||0 : val} : p);
      return recalc(arr);
    });
  };
  const removePeriod = id => setPeriods(prev => recalc(prev.filter(p=>p.id!==id)));
  const movePeriod   = (id, dir) => setPeriods(prev => {
    const i = prev.findIndex(p=>p.id===id); if(i<0) return prev;
    const j = i+dir; if(j<0||j>=prev.length) return prev;
    const a = [...prev]; [a[i],a[j]]=[a[j],a[i]]; return recalc(a);
  });
  const addPeriod = (isBreak=false) => {
    const last = periods[periods.length-1];
    const start = last ? addMin(last.startTime, last.duration) : "08:00";
    const pCount = periods.filter(p=>!p.isBreak).length;
    const label  = isBreak ? "Break" : `Period ${pCount+1}`;
    setPeriods(prev => recalc([...prev, {id:uid(), label, startTime:start, duration: isBreak?15:40, isBreak}]));
  };
  const recalcFromFirst = () => setPeriods(prev => recalc(prev));

  /* ── cell ops ── */
  const getCell = (day, pid) => tt[day]?.[pid] || { subject:"", teacher:"" };
  const setCell = (day, pid, field, val) => {
    setTt(prev => ({
      ...prev,
      [day]: { ...(prev[day]||{}), [pid]: { ...(prev[day]?.[pid]||{}), [field]: val } }
    }));
    // register colour
    if (field==="subject" && val.trim()) {
      const key = val.trim().toLowerCase();
      setColorMap(prev => {
        if (prev[key] !== undefined) return prev;
        const idx = Object.keys(prev).length % PALETTE.length;
        return { ...prev, [key]: idx };
      });
    }
  };

  /* colour for a subject string */
  const subjectColor = sub => {
    if (!sub?.trim()) return null;
    const idx = colorMap[sub.trim().toLowerCase()];
    return idx !== undefined ? PALETTE[idx] : PALETTE[Object.keys(colorMap).length % PALETTE.length];
  };

  /* ── fill column (all days same subject/teacher) ── */
  const fillColumn = (pid) => {
    const subject = window.prompt("Subject for all days in this period:");
    if (!subject) return;
    const teacher = window.prompt("Teacher (optional):") || "";
    setActiveDays.forEach ? null : null; // just to reference
    activeDays.forEach(day => setCell(day, pid, "subject", subject));
    activeDays.forEach(day => setCell(day, pid, "teacher", teacher));
    if (subject.trim()) {
      const key = subject.trim().toLowerCase();
      setColorMap(prev => {
        if (prev[key] !== undefined) return prev;
        const idx = Object.keys(prev).length % PALETTE.length;
        return { ...prev, [key]: idx };
      });
    }
  };

  /* ── PDF download ── */
  const downloadPDF = () => {
    const doc = new jsPDF({ orientation:"landscape", format:"a4", unit:"mm" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    /* header */
    let y = 8;

    // logo
    if (logo) {
      try { doc.addImage(logo, "PNG", 10, 6, 22, 22); } catch {}
    }

    // school name
    doc.setFont("helvetica","bold"); doc.setFontSize(17); doc.setTextColor(15,23,42);
    doc.text(schoolName, pw/2, y+8, { align:"center" });

    if (address) {
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(100,116,139);
      doc.text(address, pw/2, y+15, { align:"center" });
    }

    doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(30,58,138);
    const classLine = `${className}  –  Section ${section}   |   Academic Year: ${acadYear}`;
    doc.text(classLine, pw/2, y+(address?21:18), { align:"center" });

    const sepY = y+(address?25:22);
    doc.setDrawColor(30,58,138); doc.setLineWidth(0.5);
    doc.line(10, sepY, pw-10, sepY);

    /* table */
    const head = [["Day", ...periods.map(p => {
      const end = addMin(p.startTime, p.duration);
      return `${p.label}\n${p.startTime}–${end}`;
    })]];

    const body = activeDays.map(day => [
      day,
      ...periods.map(p => {
        if (p.isBreak) return "—";
        const c = getCell(day, p.id);
        return c.subject ? `${c.subject}${c.teacher ? "\n"+c.teacher:""}` : "";
      })
    ]);

    const colW = Math.min(28, (pw - 20 - 28) / periods.length);

    autoTable(doc, {
      head, body,
      startY: sepY + 4,
      styles: { fontSize:7.5, cellPadding:2.5, halign:"center", valign:"middle", lineWidth:0.25, lineColor:[203,213,225] },
      headStyles: { fillColor:[30,58,138], textColor:255, fontStyle:"bold", fontSize:8 },
      columnStyles: { 0: { fontStyle:"bold", cellWidth:26, halign:"left", fillColor:[239,246,255] } },
      didParseCell: data => {
        if (data.section==="head" && data.column.index>0) {
          const p = periods[data.column.index-1];
          if (p?.isBreak) data.cell.styles.fillColor=[71,85,105];
        }
        if (data.section==="body" && data.column.index>0) {
          const p = periods[data.column.index-1];
          if (p?.isBreak) {
            data.cell.styles.fillColor=[248,250,252];
            data.cell.styles.textColor=[148,163,184];
            data.cell.styles.fontStyle="italic";
          } else {
            const raw  = String(data.cell.raw||"");
            const sub  = raw.split("\n")[0].trim();
            const cidx = colorMap[sub.toLowerCase()];
            if (cidx!==undefined) {
              const c = PALETTE[cidx];
              const bg = hexRgb(c.bg); if(bg) data.cell.styles.fillColor=bg;
              const tc = hexRgb(c.tx); if(tc) data.cell.styles.textColor=tc;
              data.cell.styles.fontStyle="bold";
            }
          }
        }
      },
      alternateRowStyles: { fillColor:[249,250,251] },
      margin: { left:10, right:10 },
    });

    // colour legend
    const usedSubjects = [...new Set(
      activeDays.flatMap(d => periods.filter(p=>!p.isBreak).map(p => getCell(d,p.id).subject).filter(Boolean))
    )];
    if (usedSubjects.length > 0) {
      const legendY = doc.lastAutoTable.finalY + 5;
      if (legendY + 8 < ph - 8) {
        doc.setFontSize(7); doc.setTextColor(100,116,139);
        doc.text("Subjects:", 10, legendY+4);
        let lx = 28;
        usedSubjects.forEach(sub => {
          const cidx = colorMap[sub.toLowerCase()];
          if (cidx===undefined) return;
          const c = PALETTE[cidx];
          const bg = hexRgb(c.bg); const tc = hexRgb(c.tx);
          if(bg) doc.setFillColor(...bg);
          doc.roundedRect(lx, legendY, 20, 6, 1, 1, "F");
          if(tc) doc.setTextColor(...tc);
          doc.setFont("helvetica","bold"); doc.setFontSize(6.5);
          doc.text(sub, lx+10, legendY+4, {align:"center"});
          lx += 24;
          if (lx > pw-30) return;
        });
      }
    }

    doc.setFontSize(7); doc.setTextColor(148,163,184);
    doc.text("Generated by TeacherAI", pw/2, ph-5, {align:"center"});
    doc.save(`Timetable_${className.replace(/\s+/g,"")}_${section}_${acadYear}.pdf`);
  };

  /* ════════════════════════════ RENDER ════════════════════════════ */
  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Timetable Builder</h1>
        <p className="page-subtitle">Build your class timetable with custom periods, breaks, and download a colour-coded PDF.</p>
      </div>

      {/* step indicator */}
      <div style={{ display:"flex", gap:0, marginBottom:24, maxWidth:380 }}>
        {[["1","Setup"],["2","Build & Download"]].map(([n,l],i)=>(
          <div key={n} style={{ flex:1, display:"flex", alignItems:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
              <div style={{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center",
                justifyContent:"center", fontWeight:800, fontSize:14,
                background:step>=i+1?"#2563eb":"#e2e8f0", color:step>=i+1?"#fff":"#94a3b8" }}>{n}</div>
              <div style={{ fontSize:11, marginTop:4, fontWeight:600,
                color:step>=i+1?"#2563eb":"#94a3b8" }}>{l}</div>
            </div>
            {i<1 && <div style={{ height:2, flex:1, background:step>1?"#2563eb":"#e2e8f0",
              marginBottom:18, marginTop:-4 }} />}
          </div>
        ))}
      </div>

      {/* ══════════ STEP 1: SETUP ══════════ */}
      {step===1 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, maxWidth:860 }}>

          {/* school info */}
          <div className="card">
            <p style={sectionTitle}>School Information</p>

            {/* logo upload */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
              <div onClick={()=>logoRef.current.click()}
                style={{ width:72, height:72, borderRadius:12, border:"2px dashed #cbd5e1",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", overflow:"hidden", background:"#f8fafc", flexShrink:0 }}>
                {logo
                  ? <img src={logo} alt="logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                  : <div style={{ textAlign:"center", color:"#94a3b8", fontSize:11 }}>
                      <div style={{ fontSize:24 }}>🏫</div><div>Upload Logo</div>
                    </div>}
              </div>
              <div>
                <input ref={logoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleLogo} />
                <button onClick={()=>logoRef.current.click()}
                  style={{ background:"#eff6ff", color:"#2563eb", border:"1.5px solid #bfdbfe",
                    borderRadius:8, padding:"7px 16px", fontWeight:700, fontSize:13, cursor:"pointer", display:"block", marginBottom:6 }}>
                  {logo ? "Change Logo" : "Upload School Logo"}
                </button>
                {logo && <button onClick={()=>setLogo(null)}
                  style={{ background:"none", border:"none", color:"#dc2626", fontSize:12, cursor:"pointer", padding:0 }}>
                  Remove logo
                </button>}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">School Name</label>
              <input className="form-input" value={schoolName} onChange={e=>setSchoolName(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Address <span style={{ fontWeight:400, color:"#94a3b8" }}>(optional)</span></label>
              <input className="form-input" value={address} onChange={e=>setAddress(e.target.value)}
                placeholder="123, Main Road, New Delhi – 110001" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 1fr", gap:10 }}>
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
                <label className="form-label">Academic Year</label>
                <input className="form-input" value={acadYear} onChange={e=>setAcadYear(e.target.value)} placeholder="2025-26" />
              </div>
            </div>
          </div>

          {/* schedule config */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* days */}
            <div className="card">
              <p style={sectionTitle}>School Days</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {DAYS_ALL.map(d => (
                  <button key={d} onClick={()=>toggleDay(d)}
                    style={{ padding:"7px 14px", borderRadius:8, fontWeight:700, fontSize:13,
                      cursor:"pointer", border: activeDays.includes(d)?"2px solid #2563eb":"1.5px solid #e2e8f0",
                      background: activeDays.includes(d)?"#eff6ff":"#fff",
                      color: activeDays.includes(d)?"#2563eb":"#94a3b8" }}>
                    {d.slice(0,3)}
                  </button>
                ))}
              </div>
            </div>

            {/* periods */}
            <div className="card" style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <p style={{ ...sectionTitle, marginBottom:0 }}>Periods & Breaks</p>
                <button onClick={recalcFromFirst}
                  title="Recalculate all start times from the first period"
                  style={{ background:"#f1f5f9", border:"none", color:"#64748b", borderRadius:6,
                    padding:"5px 10px", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                  🔄 Sync Times
                </button>
              </div>

              {/* header row */}
              <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 72px 52px 52px 28px", gap:6,
                fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6, paddingLeft:2 }}>
                <span></span><span>Label</span><span style={{textAlign:"center"}}>Start</span>
                <span style={{textAlign:"center"}}>Mins</span><span style={{textAlign:"center"}}>End</span><span></span>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {periods.map((p,i) => {
                  const end = addMin(p.startTime, p.duration);
                  return (
                    <div key={p.id} style={{ display:"grid", gridTemplateColumns:"28px 1fr 72px 52px 52px 28px",
                      gap:6, alignItems:"center",
                      background: p.isBreak?"#f8fafc":"#fff",
                      border:"1px solid #f1f5f9", borderRadius:8, padding:"5px 6px" }}>
                      {/* move */}
                      <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                        <button onClick={()=>movePeriod(p.id,-1)} disabled={i===0}
                          style={arrowBtn}>▲</button>
                        <button onClick={()=>movePeriod(p.id,1)} disabled={i===periods.length-1}
                          style={arrowBtn}>▼</button>
                      </div>
                      {/* label */}
                      <input value={p.label} onChange={e=>updatePeriod(p.id,"label",e.target.value)}
                        style={{ border:"1px solid #e2e8f0", borderRadius:6, padding:"4px 8px",
                          fontSize:12, outline:"none", fontWeight: p.isBreak?400:600,
                          color: p.isBreak?"#64748b":"#0f172a",
                          background: p.isBreak?"#f8fafc":"#fff" }} />
                      {/* start time */}
                      <input type="time" value={p.startTime}
                        onChange={e=>updatePeriod(p.id,"startTime",e.target.value)}
                        style={{ border:"1px solid #e2e8f0", borderRadius:6, padding:"4px 4px",
                          fontSize:11, outline:"none", textAlign:"center" }} />
                      {/* duration */}
                      <input type="number" min={5} max={180} value={p.duration}
                        onChange={e=>updatePeriod(p.id,"duration",e.target.value)}
                        style={{ border:"1px solid #e2e8f0", borderRadius:6, padding:"4px 4px",
                          fontSize:12, outline:"none", textAlign:"center" }} />
                      {/* end time */}
                      <span style={{ fontSize:11, color:"#64748b", textAlign:"center" }}>{end}</span>
                      {/* remove */}
                      <button onClick={()=>removePeriod(p.id)}
                        style={{ background:"#fee2e2", border:"none", color:"#dc2626",
                          borderRadius:6, padding:"3px 5px", cursor:"pointer", fontSize:12 }}>✕</button>
                    </div>
                  );
                })}
              </div>

              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <button onClick={()=>addPeriod(false)}
                  style={{ flex:1, background:"#eff6ff", color:"#2563eb", border:"1.5px solid #bfdbfe",
                    borderRadius:8, padding:"7px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                  + Period
                </button>
                <button onClick={()=>addPeriod(true)}
                  style={{ flex:1, background:"#f8fafc", color:"#64748b", border:"1.5px solid #e2e8f0",
                    borderRadius:8, padding:"7px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                  + Break
                </button>
              </div>
            </div>
          </div>

          {/* next button */}
          <div style={{ gridColumn:"1/-1" }}>
            <button className="btn-primary" style={{ padding:"12px 40px", fontSize:15 }}
              onClick={goToStep2}>
              Next: Build Timetable →
            </button>
            {limitHit && (
              <div style={{
                marginTop:16, padding:"16px 20px", borderRadius:12,
                background:"#fffbeb", border:"1px solid #fcd34d",
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap"
              }}>
                <div>
                  <div style={{ fontWeight:700, color:"#92400e" }}>Daily limit reached</div>
                  <div style={{ fontSize:13, color:"#b45309" }}>FREE plan allows 1 timetable/day. Upgrade for unlimited access.</div>
                </div>
                <button className="btn-primary" onClick={() => navigate("/upgrade")} style={{ whiteSpace:"nowrap" }}>
                  Upgrade to PRO
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ STEP 2: GRID ══════════ */}
      {step===2 && (
        <div>
          {/* toolbar */}
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            <button className="btn-secondary" onClick={()=>setStep(1)}>← Back to Setup</button>
            <button className="btn-primary" onClick={downloadPDF} style={{ padding:"10px 24px" }}>
              ⬇ Download PDF
            </button>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
              {/* colour legend */}
              {Object.entries(colorMap).map(([sub,idx])=>(
                <span key={sub} style={{ background:PALETTE[idx].bg, color:PALETTE[idx].tx,
                  borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:700 }}>
                  {sub}
                </span>
              ))}
            </div>
          </div>

          {/* timetable grid */}
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", minWidth:600, fontSize:13 }}>
              <thead>
                <tr>
                  <th style={{ ...hth, minWidth:90, background:"#0f172a" }}>Day</th>
                  {periods.map(p => {
                    const end = addMin(p.startTime, p.duration);
                    return (
                      <th key={p.id}
                        style={{ ...hth, minWidth:100, background: p.isBreak?"#475569":"#1e3a8a",
                          cursor: p.isBreak?"default":"pointer" }}
                        title={p.isBreak?"":"Click to fill all days with same subject"}
                        onClick={()=>{ if(!p.isBreak) fillColumn(p.id); }}>
                        <div style={{ fontWeight:800 }}>{p.label}</div>
                        <div style={{ fontWeight:400, fontSize:10, opacity:0.8, marginTop:1 }}>
                          {p.startTime} – {end}
                        </div>
                        {!p.isBreak && <div style={{ fontSize:9, opacity:0.55, marginTop:1 }}>click to fill all ↓</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {activeDays.map((day,ri)=>(
                  <tr key={day} style={{ background: ri%2===0?"#fff":"#f8fafc" }}>
                    <td style={{ ...htd, fontWeight:800, color:"#1e3a8a", background:"#eff6ff",
                      whiteSpace:"nowrap", padding:"10px 14px" }}>{day}</td>
                    {periods.map(p=>{
                      if (p.isBreak) return (
                        <td key={p.id} style={{ ...htd, background:"#f1f5f9", textAlign:"center",
                          color:"#94a3b8", fontSize:11, fontStyle:"italic" }}>
                          {p.label}
                        </td>
                      );
                      const cell = getCell(day, p.id);
                      const col  = cell.subject ? subjectColor(cell.subject) : null;
                      const cid  = `${day}-${p.id}`;
                      const isEd = editCell===cid;
                      return (
                        <td key={p.id}
                          style={{ ...htd, padding:"6px", cursor:"pointer", verticalAlign:"middle",
                            background: col ? col.bg : "transparent",
                            border:"1px solid #e2e8f0" }}
                          onClick={()=>setEditCell(cid)}>
                          {isEd ? (
                            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                              <input autoFocus value={cell.subject}
                                onChange={e=>setCell(day,p.id,"subject",e.target.value)}
                                onBlur={()=>setEditCell(null)}
                                placeholder="Subject"
                                style={{ border:"1.5px solid #2563eb", borderRadius:6,
                                  padding:"4px 6px", fontSize:12, outline:"none",
                                  fontWeight:700, width:"100%", boxSizing:"border-box" }} />
                              <input value={cell.teacher}
                                onChange={e=>setCell(day,p.id,"teacher",e.target.value)}
                                onBlur={()=>setEditCell(null)}
                                placeholder="Teacher"
                                style={{ border:"1px solid #e2e8f0", borderRadius:6,
                                  padding:"3px 6px", fontSize:11, outline:"none",
                                  color:"#64748b", width:"100%", boxSizing:"border-box" }} />
                            </div>
                          ) : (
                            <div style={{ minHeight:36, display:"flex", flexDirection:"column",
                              justifyContent:"center", alignItems:"center", gap:2 }}>
                              {cell.subject
                                ? <>
                                    <span style={{ fontWeight:800, fontSize:12,
                                      color: col?.tx||"#0f172a" }}>{cell.subject}</span>
                                    {cell.teacher && <span style={{ fontSize:10, color:"#64748b" }}>{cell.teacher}</span>}
                                  </>
                                : <span style={{ fontSize:11, color:"#cbd5e1" }}>+ tap to add</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* tip */}
          <p style={{ fontSize:12, color:"#94a3b8", marginTop:12 }}>
            💡 Click any cell to enter subject + teacher. Click a period column header to fill all days at once.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── style helpers ── */
const sectionTitle = { fontWeight:700, color:"#0f172a", fontSize:14, marginBottom:12 };
const hth = { padding:"10px 10px", color:"#fff", textAlign:"center",
              borderBottom:"2px solid rgba(255,255,255,0.15)", border:"1px solid #334155" };
const htd = { padding:"8px 6px", borderBottom:"1px solid #f1f5f9", fontSize:13 };
const arrowBtn = { background:"none", border:"none", color:"#94a3b8", cursor:"pointer",
                   fontSize:9, padding:"0 2px", lineHeight:1 };

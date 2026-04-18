import { useState, useEffect } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import jsPDF from "jspdf";
import SchoolLogoUpload from "../components/SchoolLogoUpload";

const GRADES = ["LKG","UKG","Class 1","Class 2","Class 3","Class 4","Class 5",
                "Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"];
const SECTIONS = ["A","B","C","D","E"];

const TEMPLATES = [
  {
    label: "📅 Exam Reminder",
    body: "Dear {parentName}, this is to inform you that {studentName} of {grade} {section} has an upcoming exam on {date}. Kindly ensure your child is well prepared. — {schoolName}",
  },
  {
    label: "⚠️ Low Attendance",
    body: "Dear {parentName}, the attendance of {studentName} ({grade} {section}) has fallen below 75%. Kindly ensure regular attendance to avoid any academic issues. — {schoolName}",
  },
  {
    label: "📢 PTM Notice",
    body: "Dear {parentName}, Parent-Teacher Meeting for {grade} {section} is scheduled on {date} at {time}. Your presence is requested. Please contact the school for more details. — {schoolName}",
  },
  {
    label: "💰 Fee Reminder",
    body: "Dear {parentName}, this is a gentle reminder that school fees for {studentName} ({grade} {section}) are due. Kindly clear the dues at the earliest to avoid any late charges. — {schoolName}",
  },
  {
    label: "📋 Homework Due",
    body: "Dear {parentName}, {studentName} of {grade} {section} has pending homework due on {date}. Kindly ensure timely submission. — {schoolName}",
  },
  {
    label: "🏆 Achievement",
    body: "Dear {parentName}, we are pleased to inform you that {studentName} of {grade} {section} has shown excellent performance. We commend your support and encouragement. — {schoolName}",
  },
  {
    label: "✏️ Custom",
    body: "",
  },
];

const STUDENTS_KEY  = "att_students";
const CONTACTS_KEY  = "parent_contacts_v1";

const loadStudents = () => { try { return JSON.parse(localStorage.getItem(STUDENTS_KEY) || "[]"); } catch { return []; } };
const loadContacts = () => { try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || "{}"); } catch { return {}; } };
const saveContacts = (c) => localStorage.setItem(CONTACTS_KEY, JSON.stringify(c));

export default function ParentPortal() {
  const [grade, setGrade]     = useState("Class 6");
  const [section, setSection] = useState("A");
  const [logo, setLogo]       = useState(() => localStorage.getItem("school_logo") || null);
  const [tab, setTab]         = useState("contacts");
  const [students]            = useState(loadStudents);
  const [contacts, setContacts] = useState(loadContacts);
  const [schoolName, setSchoolName] = useState(() => localStorage.getItem("parent_school_name") || "");

  const [tplIdx, setTplIdx]   = useState(0);
  const [message, setMessage] = useState(TEMPLATES[0].body);
  const [extraDate, setExtraDate] = useState("");
  const [extraTime, setExtraTime] = useState("10:00 AM");
  const [generated, setGenerated] = useState([]);
  const [copied, setCopied]   = useState(null);

  useEffect(() => {
    setMessage(TEMPLATES[tplIdx].body);
    setGenerated([]);
  }, [tplIdx]);

  useEffect(() => {
    if (schoolName) localStorage.setItem("parent_school_name", schoolName);
  }, [schoolName]);

  const classStudents = students
    .filter(s => s.className === grade && s.section === section)
    .sort((a, b) => Number(a.rollNo) - Number(b.rollNo));

  const updateContact = (sid, field, value) => {
    setContacts(prev => {
      const next = { ...prev, [sid]: { ...(prev[sid] || {}), [field]: value } };
      saveContacts(next);
      return next;
    });
  };

  const resolve = (tpl, student) => {
    const c = contacts[student.id] || {};
    const dateStr = extraDate
      ? new Date(extraDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
      : "[DATE]";
    return tpl
      .replace(/{parentName}/g, c.parentName || "Parent")
      .replace(/{studentName}/g, student.name)
      .replace(/{grade}/g, grade)
      .replace(/{section}/g, section)
      .replace(/{date}/g, dateStr)
      .replace(/{time}/g, extraTime)
      .replace(/{schoolName}/g, schoolName || "School");
  };

  const generateMessages = () => {
    setGenerated(classStudents.map(s => ({
      student: s,
      contact: contacts[s.id] || {},
      text: resolve(message, s),
    })));
  };

  const copyOne = (idx, text) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    const all = generated
      .map((m, i) => `${i + 1}. ${m.contact.phone ? m.contact.phone + "\n" : ""}${m.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(all);
    setCopied("all");
    setTimeout(() => setCopied(null), 2500);
  };

  const downloadPDF = () => {
    if (!generated.length) return;
    const doc = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    generated.forEach((m, idx) => {
      if (idx > 0) doc.addPage();
      if (logo) { try { doc.addImage(logo, "PNG", 10, 8, 18, 18); } catch {} }
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text(schoolName || "School Notice", pw / 2, 16, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(new Date().toLocaleDateString("en-IN"), pw / 2, 22, { align: "center" });

      doc.setFontSize(10.5);
      const lines = doc.splitTextToSize(m.text, pw - 40);
      doc.text(lines, 20, 34);

      const tearY = Math.min(34 + lines.length * 6 + 18, ph - 44);
      doc.setLineDashPattern([3, 3], 0);
      doc.setDrawColor(180, 180, 180);
      doc.line(14, tearY, pw - 14, tearY);
      doc.setLineDashPattern([], 0);

      doc.setFontSize(8); doc.setTextColor(100);
      doc.text("— Acknowledgement Slip (tear here) —", pw / 2, tearY + 7, { align: "center" });
      doc.setFontSize(9.5); doc.setTextColor(0);
      doc.text(
        `Student: ${m.student.name}   Class: ${grade} ${section}   Roll No: ${m.student.rollNo}`,
        20, tearY + 16
      );
      doc.text("Parent Signature: ____________________   Date: ____________", 20, tearY + 25);

      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text("Generated by SmartBoard AI", pw / 2, ph - 8, { align: "center" });
    });

    doc.save(`ParentNotice_${grade.replace(/\s/g,"")}_${section}.pdf`);
  };

  const needsDate = message.includes("{date}");
  const needsTime = message.includes("{time}");
  const withPhone = generated.filter(m => m.contact.phone).length;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Parent Communication</h1>
        <p className="page-subtitle">Store parent contacts and send personalised notices via WhatsApp or printable PDF slips.</p>
      </div>

      {/* Config */}
      <div className="card" style={{ maxWidth: 860, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-field" style={{ minWidth: 140 }}>
            <label className="form-label">Class</label>
            <select className="form-select" value={grade} onChange={e => setGrade(e.target.value)}>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ minWidth: 100 }}>
            <label className="form-label">Section</label>
            <select className="form-select" value={section} onChange={e => setSection(e.target.value)}>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ minWidth: 200 }}>
            <label className="form-label">School Name <span style={{ fontWeight: 400, color: "#94a3b8" }}>(for messages)</span></label>
            <input className="form-input" placeholder="Your School Name" value={schoolName}
              onChange={e => setSchoolName(e.target.value)} />
          </div>
          <div style={{ marginLeft: "auto" }}>
            <SchoolLogoUpload logo={logo} setLogo={setLogo} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="auth-tabs" style={{ maxWidth: 380, marginBottom: 20 }}>
        {[
          ["contacts", "👨‍👩‍👧 Parent Contacts"],
          ["message",  "💬 Send Message"],
        ].map(([k, l]) => (
          <button key={k} className={`auth-tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── Parent Contacts tab ── */}
      {tab === "contacts" && (
        <div className="card" style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>
              Parent Contacts — {grade} {section}
            </p>
            <span style={{ fontSize: 13, color: "#64748b" }}>{classStudents.length} students</span>
          </div>

          {classStudents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
              <p>No students found for {grade} {section}.<br />Add students in the Attendance Manager first.</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                Changes are saved automatically. Parent contacts are stored on this device.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={th}>Roll</th>
                      <th style={{ ...th, textAlign: "left" }}>Student Name</th>
                      <th style={{ ...th, textAlign: "left" }}>Parent / Guardian Name</th>
                      <th style={{ ...th, textAlign: "left" }}>WhatsApp Number</th>
                      <th style={{ ...th, textAlign: "left" }}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map(s => {
                      const c = contacts[s.id] || {};
                      return (
                        <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ ...td, textAlign: "center", color: "#64748b", fontWeight: 600 }}>{s.rollNo}</td>
                          <td style={{ ...td, fontWeight: 600 }}>{s.name}</td>
                          <td style={td}>
                            <input className="form-input" style={{ fontSize: 12, padding: "5px 8px" }}
                              placeholder="Parent name"
                              value={c.parentName || ""}
                              onChange={e => updateContact(s.id, "parentName", e.target.value)} />
                          </td>
                          <td style={td}>
                            <input className="form-input" style={{ fontSize: 12, padding: "5px 8px" }}
                              placeholder="10-digit mobile"
                              value={c.phone || ""}
                              onChange={e => updateContact(s.id, "phone", e.target.value)} />
                          </td>
                          <td style={td}>
                            <input className="form-input" style={{ fontSize: 12, padding: "5px 8px" }}
                              placeholder="parent@email.com"
                              value={c.email || ""}
                              onChange={e => updateContact(s.id, "email", e.target.value)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Send Message tab ── */}
      {tab === "message" && (
        <div style={{ maxWidth: 860 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Compose Message</p>

            {/* Template chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => setTplIdx(i)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: tplIdx === i ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                    background: tplIdx === i ? "#eff6ff" : "#fff",
                    color: tplIdx === i ? "#2563eb" : "#64748b",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {(needsDate || needsTime) && (
              <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                {needsDate && (
                  <div className="form-field">
                    <label className="form-label">Date to mention</label>
                    <input type="date" className="form-input" value={extraDate}
                      onChange={e => setExtraDate(e.target.value)} />
                  </div>
                )}
                {needsTime && (
                  <div className="form-field">
                    <label className="form-label">Time</label>
                    <input className="form-input" value={extraTime} placeholder="10:00 AM"
                      onChange={e => setExtraTime(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            <div className="form-field">
              <label className="form-label">Message</label>
              <textarea className="form-input" rows={4} style={{ resize: "vertical", fontFamily: "inherit" }}
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Write your message. Use {parentName} {studentName} {grade} {section} {date} {time} {schoolName} as placeholders." />
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                Placeholders: &#123;parentName&#125; &#123;studentName&#125; &#123;grade&#125; &#123;section&#125; &#123;date&#125; &#123;time&#125; &#123;schoolName&#125;
              </p>
            </div>

            <button className="btn-primary" onClick={generateMessages}
              disabled={!message.trim() || classStudents.length === 0}>
              Generate Messages for {classStudents.length} Parents
            </button>
            {classStudents.length === 0 && (
              <p style={{ fontSize: 12, color: "#f59e0b", marginTop: 8 }}>
                ⚠ No students in {grade} {section}. Add students via Attendance Manager first.
              </p>
            )}
          </div>

          {generated.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 15, margin: 0 }}>
                    {generated.length} Messages Ready
                  </p>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                    {withPhone} have WhatsApp numbers saved
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-secondary" onClick={copyAll}>
                    {copied === "all" ? "✓ Copied!" : "📋 Copy All"}
                  </button>
                  <button className="btn-secondary" onClick={downloadPDF}>⬇ PDF Slips</button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {generated.map((m, i) => (
                  <div key={i} style={{ padding: "12px 16px", borderRadius: 10,
                    background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{m.student.name}</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>Roll {m.student.rollNo}</span>
                        {m.contact.phone
                          ? <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>📱 {m.contact.phone}</span>
                          : <span style={{ fontSize: 11, color: "#f59e0b" }}>No phone saved</span>
                        }
                      </div>
                      <button onClick={() => copyOne(i, m.text)}
                        style={{ background: "#eff6ff", border: "none", color: "#2563eb", borderRadius: 6,
                          padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                        {copied === i ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.65 }}>{m.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

const th = { padding: "9px 10px", fontWeight: 700, fontSize: 12, textAlign: "center",
             borderBottom: "2px solid #e2e8f0", color: "#374151" };
const td = { padding: "8px 10px", borderBottom: "1px solid #f1f5f9" };

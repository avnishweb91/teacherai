import { useState, useRef } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";

const EMPTY_HEADER = {
  schoolName: "", location: "", examType: "", session: "",
  subject: "", className: "", maxMarks: "", time: "",
};

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getImageType(mime) {
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

export default function QuestionPaperBuilder() {
  const [header, setHeader] = useState(EMPTY_HEADER);
  const [questions, setQuestions] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const fileRefs = useRef({});

  /* ── Header ── */
  const setH = (k, v) => setHeader(h => ({ ...h, [k]: v }));

  /* ── Questions ── */
  const addQuestion = (type) => {
    setQuestions(q => [...q, { id: Date.now(), type, text: "", imageBase64: null, imageMime: null, imgW: 300, imgH: 200, answerLines: 2 }]);
  };

  const updateQ = (id, field, value) => {
    setQuestions(q => q.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const deleteQ = (id) => setQuestions(q => q.filter(x => x.id !== id));

  const moveQ = (idx, dir) => {
    const arr = [...questions];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    setQuestions(arr);
  };

  const handleImage = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1];
      const mime = file.type;
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        const w = Math.min(img.width, maxW);
        const h = Math.round(img.height * (w / img.width));
        updateQ(id, "imageBase64", base64);
        updateQ(id, "imageMime", mime);
        updateQ(id, "imgW", w);
        updateQ(id, "imgH", h);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  /* ── Download .docx ── */
  const downloadDocx = async () => {
    if (questions.length === 0) { alert("Add at least one question first."); return; }
    setDownloading(true);
    try {
      const paras = [];

      const centered = (text, opts = {}) => new Paragraph({
        children: [new TextRun({ text, ...opts })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
      });

      // ── Header ──
      if (header.schoolName) paras.push(centered(header.schoolName.toUpperCase(), { bold: true, size: 30 }));
      if (header.location)   paras.push(centered(header.location, { size: 24 }));
      if (header.examType || header.session)
        paras.push(centered(`${header.examType}${header.session ? ` (SESSION ${header.session})` : ""}`, { bold: true, size: 24 }));

      // Class / Subject / Marks / Time row
      const metaParts = [];
      if (header.className) metaParts.push(`Class: ${header.className}`);
      if (header.subject)   metaParts.push(`Subject: ${header.subject}`);
      if (header.maxMarks)  metaParts.push(`Max Marks: ${header.maxMarks}`);
      if (header.time)      metaParts.push(`Time: ${header.time}`);
      if (metaParts.length) paras.push(centered(metaParts.join("     "), { size: 22 }));

      // ── "Questions Answer:" ──
      paras.push(new Paragraph({
        children: [new TextRun({ text: "Questions Answer:", bold: true, size: 24 })],
        spacing: { before: 240, after: 120 },
      }));

      // ── Questions ──
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const label = `Q${i + 1}. `;

        paras.push(new Paragraph({
          children: [new TextRun({ text: label + (q.text || ""), size: 22 })],
          spacing: { before: 180, after: 80 },
        }));

        if (q.type === "image" && q.imageBase64) {
          paras.push(new Paragraph({
            children: [
              new ImageRun({
                type: getImageType(q.imageMime),
                data: base64ToUint8Array(q.imageBase64),
                transformation: { width: q.imgW, height: q.imgH },
              }),
            ],
            spacing: { before: 80, after: 80 },
          }));
        }

        for (let l = 0; l < (q.answerLines || 0); l++) {
          paras.push(new Paragraph({
            children: [new TextRun({ text: "_".repeat(70), size: 22 })],
            spacing: { before: 80 },
          }));
        }
      }

      // ── Separator ──
      paras.push(new Paragraph({
        children: [new TextRun({ text: "-".repeat(100), size: 20 })],
        spacing: { before: 400 },
      }));

      const doc = new Document({ sections: [{ children: paras }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Question paper.docx");
    } catch (e) {
      alert("Download failed: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  /* ── UI ── */
  return (
    <DashboardLayout>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px" }}>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>📋 Question Paper Builder</h1>
        <p style={{ color: "#64748b", marginBottom: 28 }}>Build a custom question paper with text and image-based questions. Download as Word file.</p>

        {/* ── HEADER SECTION ── */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "24px", marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1e3a8a", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
            📄 Paper Header
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { key: "schoolName", label: "School Name", placeholder: "e.g. DAV Public School", full: true },
              { key: "location",   label: "Location / Address", placeholder: "e.g. Malighat, Muzaffarpur" },
              { key: "examType",   label: "Exam Type", placeholder: "e.g. Periodic-1 / Final Exam" },
              { key: "session",    label: "Session", placeholder: "e.g. 2026-27" },
              { key: "className",  label: "Class", placeholder: "e.g. Class 3" },
              { key: "subject",    label: "Subject", placeholder: "e.g. English" },
              { key: "maxMarks",   label: "Max Marks", placeholder: "e.g. 50" },
              { key: "time",       label: "Time", placeholder: "e.g. 1.5 Hours" },
            ].map(f => (
              <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : undefined }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>{f.label}</label>
                <input
                  value={header[f.key]}
                  onChange={e => setH(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── QUESTIONS ── */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "24px", marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1e3a8a", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
            ❓ Questions ({questions.length})
          </h2>

          {questions.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8", background: "#f8fafc", borderRadius: 10, marginBottom: 16 }}>
              No questions yet. Add your first question below.
            </div>
          )}

          {questions.map((q, idx) => (
            <div key={q.id} style={{
              border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 18, marginBottom: 14,
              background: q.type === "image" ? "#fafafa" : "#fff",
            }}>
              {/* Question header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{
                  background: q.type === "image" ? "#7c3aed" : "#2563eb",
                  color: "#fff", borderRadius: 20, padding: "2px 12px", fontSize: 12, fontWeight: 700,
                }}>
                  Q{idx + 1} {q.type === "image" ? "· Image" : "· Text"}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button onClick={() => moveQ(idx, -1)} disabled={idx === 0}
                    style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 13, color: "#64748b" }}>↑</button>
                  <button onClick={() => moveQ(idx, 1)} disabled={idx === questions.length - 1}
                    style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 13, color: "#64748b" }}>↓</button>
                  <button onClick={() => deleteQ(q.id)}
                    style={{ border: "1px solid #fecaca", background: "#fff", borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 13, color: "#ef4444" }}>✕</button>
                </div>
              </div>

              {/* Question text */}
              <textarea
                value={q.text}
                onChange={e => updateQ(q.id, "text", e.target.value)}
                placeholder={`Write question ${idx + 1} here...`}
                rows={2}
                style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />

              {/* Image upload (only for image type) */}
              {q.type === "image" && (
                <div style={{ marginTop: 12 }}>
                  <input
                    type="file" accept="image/*"
                    ref={el => fileRefs.current[q.id] = el}
                    style={{ display: "none" }}
                    onChange={e => handleImage(q.id, e.target.files[0])}
                  />
                  {q.imageBase64 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <img
                        src={`data:${q.imageMime};base64,${q.imageBase64}`}
                        alt="question"
                        style={{ maxHeight: 120, maxWidth: 240, borderRadius: 8, border: "1px solid #e2e8f0", objectFit: "contain" }}
                      />
                      <button
                        onClick={() => fileRefs.current[q.id]?.click()}
                        style={{ fontSize: 12, color: "#7c3aed", border: "1px solid #ddd6fe", background: "#faf5ff", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}
                      >Change Image</button>
                      <button
                        onClick={() => { updateQ(q.id, "imageBase64", null); updateQ(q.id, "imageMime", null); }}
                        style={{ fontSize: 12, color: "#ef4444", border: "1px solid #fecaca", background: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}
                      >Remove</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRefs.current[q.id]?.click()}
                      style={{
                        width: "100%", padding: "20px", border: "2px dashed #c4b5fd",
                        borderRadius: 10, background: "#faf5ff", color: "#7c3aed",
                        cursor: "pointer", fontSize: 14, fontWeight: 600,
                      }}
                    >
                      📷 Click to upload image for this question
                    </button>
                  )}
                </div>
              )}

              {/* Answer lines */}
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Answer lines:</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[0, 1, 2, 3, 4].map(n => (
                    <button key={n} onClick={() => updateQ(q.id, "answerLines", n)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: "1.5px solid",
                        borderColor: q.answerLines === n ? "#2563eb" : "#e2e8f0",
                        background: q.answerLines === n ? "#eff6ff" : "#fff",
                        color: q.answerLines === n ? "#2563eb" : "#64748b",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Add question buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              onClick={() => addQuestion("text")}
              style={{
                flex: 1, padding: "12px", border: "2px dashed #93c5fd", borderRadius: 10,
                background: "#eff6ff", color: "#2563eb", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >+ Text Question</button>
            <button
              onClick={() => addQuestion("image")}
              style={{
                flex: 1, padding: "12px", border: "2px dashed #c4b5fd", borderRadius: 10,
                background: "#faf5ff", color: "#7c3aed", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >+ Image Question</button>
          </div>
        </div>

        {/* ── DOWNLOAD ── */}
        <button
          onClick={downloadDocx}
          disabled={downloading || questions.length === 0}
          style={{
            width: "100%", padding: "16px", background: downloading ? "#94a3b8" : "linear-gradient(135deg, #1e3a8a, #2563eb)",
            color: "#fff", border: "none", borderRadius: 12, fontWeight: 800,
            fontSize: 16, cursor: downloading || questions.length === 0 ? "not-allowed" : "pointer",
            boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
          }}
        >
          {downloading ? "⏳ Generating..." : "⬇️ Download Question Paper (.docx)"}
        </button>

        {questions.length === 0 && (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 8 }}>Add at least one question to enable download</p>
        )}
      </div>
    </DashboardLayout>
  );
}

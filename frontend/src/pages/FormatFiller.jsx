import { useState, useRef } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from "docx";

/* ── helpers ── */
async function extractDocxText(file) {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractXlsxText(file) {
  const XLSX = await import("xlsx");
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  let text = "";
  wb.SheetNames.forEach((name) => {
    const ws = wb.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(ws);
    text += `Sheet: ${name}\n${csv}\n\n`;
  });
  return text;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function detectFileType(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return "word";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "excel";
  if (name.match(/\.(jpg|jpeg|png|webp)$/)) return "image";
  return null;
}

/* ── document generators ── */
async function generateWordDoc(fields, values, tableRows, tableColumns, documentType) {
  const titlePara = new Paragraph({
    text: documentType,
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  });

  const fieldParas = fields
    .filter((f) => f.type !== "table")
    .map((f) => {
      const val = values[f.key] || "";
      return new Paragraph({
        children: [
          new TextRun({ text: `${f.label}: `, bold: true }),
          new TextRun({ text: val }),
        ],
        spacing: { after: 200 },
      });
    });

  const children = [titlePara, ...fieldParas];

  if (tableColumns && tableColumns.length > 0 && tableRows.length > 0) {
    children.push(
      new Paragraph({ text: "", spacing: { after: 200 } })
    );

    const headerRow = new TableRow({
      children: tableColumns.map(
        (col) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: col, bold: true })] })],
            width: { size: Math.floor(9000 / tableColumns.length), type: WidthType.DXA },
          })
      ),
    });

    const dataRows = tableRows.map(
      (row) =>
        new TableRow({
          children: tableColumns.map(
            (col, i) =>
              new TableCell({
                children: [new Paragraph({ text: row[i] || "" })],
                width: { size: Math.floor(9000 / tableColumns.length), type: WidthType.DXA },
              })
          ),
        })
    );

    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 9000, type: WidthType.DXA },
    });
    children.push(table);
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${documentType.replace(/\s+/g, "_")}_filled.docx`);
}

async function generateExcelDoc(fields, values, tableRows, tableColumns, documentType) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const wsData = fields
    .filter((f) => f.type !== "table")
    .map((f) => [f.label, values[f.key] || ""]);

  if (tableColumns && tableColumns.length > 0 && tableRows.length > 0) {
    wsData.push([]);
    wsData.push(tableColumns);
    tableRows.forEach((row) => wsData.push(row));
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, "Filled Data");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${documentType.replace(/\s+/g, "_")}_filled.xlsx`);
}

function generateImagePdf(fields, values, tableRows, tableColumns, documentType, imageDataUrl) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(documentType, pageW / 2, 20, { align: "center" });

  if (imageDataUrl) {
    try {
      doc.addImage(imageDataUrl, "JPEG", 10, 28, pageW - 20, 60);
    } catch {
      // skip image if it can't be embedded
    }
  }

  let y = imageDataUrl ? 96 : 32;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Filled Details", 14, y);
  y += 6;
  doc.setLineWidth(0.3);
  doc.line(14, y, pageW - 14, y);
  y += 6;

  fields
    .filter((f) => f.type !== "table")
    .forEach((f) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`${f.label}:`, 14, y);
      doc.setFont("helvetica", "normal");
      const val = values[f.key] || "—";
      const lines = doc.splitTextToSize(val, pageW - 80);
      doc.text(lines, 70, y);
      y += Math.max(7, lines.length * 5 + 2);
    });

  if (tableColumns && tableColumns.length > 0 && tableRows.length > 0) {
    y += 4;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Table Data", 14, y);
    y += 8;

    const colW = (pageW - 28) / tableColumns.length;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    tableColumns.forEach((col, i) => doc.text(col, 14 + i * colW, y));
    y += 5;
    doc.line(14, y, pageW - 14, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    tableRows.forEach((row) => {
      if (y > 270) { doc.addPage(); y = 20; }
      row.forEach((cell, i) => doc.text(cell || "", 14 + i * colW, y));
      y += 6;
    });
  }

  doc.save(`${documentType.replace(/\s+/g, "_")}_filled.pdf`);
}

/* ════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════ */
export default function FormatFiller() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  const [documentType, setDocumentType] = useState("");
  const [fields, setFields] = useState([]);
  const [hasTable, setHasTable] = useState(false);
  const [tableColumns, setTableColumns] = useState([]);

  const [values, setValues] = useState({});
  const [tableRows, setTableRows] = useState([[]]);

  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef(null);

  /* ── step 1: upload & parse ── */
  async function handleFile(selected) {
    setParseError("");
    const type = detectFileType(selected);
    if (!type) {
      setParseError("Please upload a .docx, .xlsx, or image (jpg/png) file.");
      return;
    }
    setFile(selected);
    setFileType(type);

    if (type === "image") {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(selected);
    } else {
      setImagePreview(null);
    }
  }

  async function handleParse() {
    if (!file) return;
    setParsing(true);
    setParseError("");
    try {
      let payload = { fileType };

      if (fileType === "word") {
        payload.textContent = await extractDocxText(file);
      } else if (fileType === "excel") {
        payload.textContent = await extractXlsxText(file);
      } else {
        payload.base64Image = await fileToBase64(file);
        payload.mimeType = file.type || "image/jpeg";
      }

      const { data } = await api.post("/api/template/parse", payload);

      setDocumentType(data.documentType || "Document");
      setFields(data.fields || []);
      setHasTable(data.hasTable || false);
      setTableColumns(data.tableColumns || []);
      setValues({});
      setTableRows([new Array(data.tableColumns?.length || 0).fill("")]);
      setStep(2);
    } catch (err) {
      setParseError("Could not analyse the file. Please try again.");
      console.error(err);
    } finally {
      setParsing(false);
    }
  }

  /* ── step 2: fill fields ── */
  function setValue(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function updateTableCell(rowIdx, colIdx, val) {
    setTableRows((prev) => {
      const copy = prev.map((r) => [...r]);
      if (!copy[rowIdx]) copy[rowIdx] = [];
      copy[rowIdx][colIdx] = val;
      return copy;
    });
  }

  function addTableRow() {
    setTableRows((prev) => [...prev, new Array(tableColumns.length).fill("")]);
  }

  function removeTableRow(idx) {
    setTableRows((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ── step 3: generate ── */
  async function handleGenerate() {
    setGenerating(true);
    try {
      if (fileType === "word") {
        await generateWordDoc(fields, values, tableRows, tableColumns, documentType);
      } else if (fileType === "excel") {
        await generateExcelDoc(fields, values, tableRows, tableColumns, documentType);
      } else {
        generateImagePdf(fields, values, tableRows, tableColumns, documentType, imagePreview);
      }
    } catch (err) {
      console.error("Generation failed", err);
    } finally {
      setGenerating(false);
    }
  }

  function resetAll() {
    setStep(1);
    setFile(null);
    setFileType(null);
    setImagePreview(null);
    setParseError("");
    setDocumentType("");
    setFields([]);
    setHasTable(false);
    setTableColumns([]);
    setValues({});
    setTableRows([[]]);
  }

  const outputLabel = fileType === "word" ? ".docx" : fileType === "excel" ? ".xlsx" : ".pdf";

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Format Filler</h2>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>
            Upload any prescribed format — Word, Excel, or image — and fill it with your data in seconds.
          </p>
        </div>

        {/* Steps indicator */}
        <StepBar step={step} />

        {/* ── STEP 1: Upload ── */}
        {step === 1 && (
          <div style={card}>
            <p style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Upload your prescribed format</p>

            <div
              style={{
                border: "2px dashed #d1d5db",
                borderRadius: 12,
                padding: "40px 24px",
                textAlign: "center",
                background: "#f9fafb",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>📁</div>
              <p style={{ margin: 0, fontWeight: 600, color: "#374151" }}>
                {file ? file.name : "Drag & drop or click to upload"}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9ca3af" }}>
                Supported: .docx &nbsp;·&nbsp; .xlsx &nbsp;·&nbsp; JPG / PNG
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
              />
            </div>

            {imagePreview && (
              <img
                src={imagePreview}
                alt="preview"
                style={{ marginTop: 16, maxHeight: 200, borderRadius: 8, border: "1px solid #e5e7eb", display: "block", maxWidth: "100%" }}
              />
            )}

            {parseError && (
              <p style={{ color: "#dc2626", marginTop: 12, fontSize: 13 }}>{parseError}</p>
            )}

            {file && (
              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <button onClick={handleParse} disabled={parsing} style={primaryBtn}>
                  {parsing ? "Analysing…" : "Analyse Format →"}
                </button>
                <button onClick={() => { setFile(null); setFileType(null); setImagePreview(null); }} style={ghostBtn}>
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Fill Fields ── */}
        {step === 2 && (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{documentType}</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  {fields.length} field{fields.length !== 1 ? "s" : ""} detected from your format
                </p>
              </div>
              <button onClick={() => setStep(1)} style={ghostBtn}>← Back</button>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {fields.map((f) => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
                    {f.label}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={values[f.key] || ""}
                      onChange={(e) => setValue(f.key, e.target.value)}
                      style={inputStyle}
                      placeholder={`Enter ${f.label.toLowerCase()}…`}
                    />
                  ) : (
                    <input
                      type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                      value={values[f.key] || ""}
                      onChange={(e) => setValue(f.key, e.target.value)}
                      style={inputStyle}
                      placeholder={`Enter ${f.label.toLowerCase()}…`}
                    />
                  )}
                </div>
              ))}
            </div>

            {hasTable && tableColumns.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Table Data</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        {tableColumns.map((col, i) => (
                          <th key={i} style={thStyle}>{col}</th>
                        ))}
                        <th style={thStyle}>Del</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, ri) => (
                        <tr key={ri}>
                          {tableColumns.map((_, ci) => (
                            <td key={ci} style={tdStyle}>
                              <input
                                style={{ width: "100%", border: "none", outline: "none", fontSize: 13, background: "transparent", padding: "2px 4px" }}
                                value={row[ci] || ""}
                                onChange={(e) => updateTableCell(ri, ci, e.target.value)}
                              />
                            </td>
                          ))}
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <button
                              onClick={() => removeTableRow(ri)}
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}
                            >×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={addTableRow} style={{ ...ghostBtn, marginTop: 10, fontSize: 13 }}>
                  + Add Row
                </button>
              </div>
            )}

            <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
              <button onClick={() => setStep(3)} style={primaryBtn}>
                Preview & Download →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview & Download ── */}
        {step === 3 && (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Ready to Download</p>
              <button onClick={() => setStep(2)} style={ghostBtn}>← Edit</button>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#15803d" }}>{documentType}</p>
              <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                {fields.filter((f) => values[f.key]).length} of {fields.length} fields filled
                {hasTable && tableRows.length > 0 ? ` · ${tableRows.length} table row${tableRows.length > 1 ? "s" : ""}` : ""}
              </p>
            </div>

            <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
              {fields.map((f) => (
                <div key={f.key} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: "#374151", minWidth: 160 }}>{f.label}:</span>
                  <span style={{ color: values[f.key] ? "#111827" : "#9ca3af" }}>{values[f.key] || "—"}</span>
                </div>
              ))}
            </div>

            {hasTable && tableColumns.length > 0 && tableRows.length > 0 && (
              <div style={{ overflowX: "auto", marginBottom: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>{tableColumns.map((c, i) => <th key={i} style={thStyle}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, ri) => (
                      <tr key={ri}>{tableColumns.map((_, ci) => <td key={ci} style={tdStyle}>{row[ci] || "—"}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={handleGenerate} disabled={generating} style={primaryBtn}>
                {generating ? "Generating…" : `Download ${outputLabel}`}
              </button>
              <button onClick={resetAll} style={ghostBtn}>
                Fill Another Format
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ── sub-components & styles ── */
function StepBar({ step }) {
  const steps = ["Upload Format", "Fill Data", "Download"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28, gap: 0 }}>
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "unset" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: done ? "#10b981" : active ? "#6366f1" : "#e5e7eb",
                color: done || active ? "#fff" : "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#111827" : "#6b7280", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? "#10b981" : "#e5e7eb", margin: "0 10px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: "24px 24px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const primaryBtn = {
  background: "#6366f1",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 22px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const ghostBtn = {
  background: "transparent",
  color: "#6b7280",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "10px 18px",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const thStyle = {
  padding: "8px 10px",
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  fontWeight: 600,
  textAlign: "left",
  fontSize: 12,
};

const tdStyle = {
  padding: "6px 10px",
  border: "1px solid #e5e7eb",
  verticalAlign: "middle",
};

import { useState, useRef, useCallback } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ShadingType } from "docx";

/* ── file helpers ── */
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
    text += `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(ws)}\n\n`;
  });
  return text;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(",")[1]);
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

/* ── HTML template helpers ── */
function buildRenderedHtml(htmlTemplate, fields, values, editableTables, tableData) {
  if (!htmlTemplate) return "";
  let html = htmlTemplate;

  // Replace {{key}} scalar placeholders
  for (const f of fields) {
    const val = values[f.key] || `{{${f.key}}}`;
    html = html.split(`{{${f.key}}}`).join(val);
  }

  // Inject editable table rows at <!-- ROWS:id --> markers
  for (const table of editableTables) {
    const rows = tableData[table.id] || table.rows || [];
    const cellSt = table.cellStyle || "border:1px solid #ccc; padding:4px 8px; text-align:center; font-size:13px";
    const altSt = table.altRowStyle || "";
    const rowsHtml = rows.map((row, ri) => {
      const rowStyle = altSt && ri % 2 === 1 ? ` style='${altSt}'` : "";
      const cells = row.map(cell => `<td style='${cellSt}'>${cell || ""}</td>`).join("");
      return `<tr${rowStyle}>${cells}</tr>`;
    }).join("");
    html = html.replace(`<!-- ROWS:${table.id} -->`, rowsHtml);
  }

  return html;
}

/* ── PDF from HTML ── */
async function downloadHtmlAsPdf(htmlContent, filename) {
  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;background:#fff";
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#fff", width: 794 });
    const imgData = canvas.toDataURL("image/png");
    const pageW = 210; // A4 mm
    const imgH = (canvas.height / canvas.width) * pageW;

    const doc = new jsPDF({ orientation: imgH > 297 ? "portrait" : "portrait", unit: "mm", format: "a4" });

    let y = 0;
    const pageH = 297;

    if (imgH <= pageH) {
      doc.addImage(imgData, "PNG", 0, 0, pageW, imgH);
    } else {
      // Multi-page: slice canvas
      const pxPerPage = Math.floor((pageH / imgH) * canvas.height);
      let srcY = 0;
      while (srcY < canvas.height) {
        const sliceH = Math.min(pxPerPage, canvas.height - srcY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        sliceCanvas.getContext("2d").drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (srcY > 0) doc.addPage();
        const sliceData = sliceCanvas.toDataURL("image/png");
        const sliceMmH = (sliceH / canvas.height) * imgH;
        doc.addImage(sliceData, "PNG", 0, 0, pageW, sliceMmH);
        srcY += sliceH;
      }
    }

    doc.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

/* ── Word/Excel generators (word and excel file types) ── */
async function generateWordDoc(fields, values, tableRows, tableColumns, documentType) {
  const titlePara = new Paragraph({
    text: documentType,
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  });
  const fieldParas = fields.filter((f) => f.type !== "table").map((f) =>
    new Paragraph({
      children: [new TextRun({ text: `${f.label}: `, bold: true }), new TextRun({ text: values[f.key] || "" })],
      spacing: { after: 200 },
    })
  );
  const children = [titlePara, ...fieldParas];
  if (tableColumns?.length > 0 && tableRows.length > 0) {
    children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
    const colW = Math.floor(9000 / tableColumns.length);
    const headerRow = new TableRow({
      children: tableColumns.map((col) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: col, bold: true })] })],
        width: { size: colW, type: WidthType.DXA },
      })),
    });
    const dataRows = tableRows.map((row) => new TableRow({
      children: tableColumns.map((_, i) => new TableCell({
        children: [new Paragraph({ text: row[i] || "" })],
        width: { size: colW, type: WidthType.DXA },
      })),
    }));
    children.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 9000, type: WidthType.DXA } }));
  }
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  saveAs(blob, `${documentType.replace(/\s+/g, "_")}_filled.docx`);
}

async function generateExcelDoc(fields, values, tableRows, tableColumns, documentType) {
  const XLSX = await import("xlsx");
  const wsData = fields.filter((f) => f.type !== "table").map((f) => [f.label, values[f.key] || ""]);
  if (tableColumns?.length > 0 && tableRows.length > 0) {
    wsData.push([]);
    wsData.push(tableColumns);
    tableRows.forEach((row) => wsData.push(row));
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [{ wch: 30 }, { wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Filled Data");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${documentType.replace(/\s+/g, "_")}_filled.xlsx`);
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
  const [tableRowHeaders, setTableRowHeaders] = useState([]);

  // Image-template state
  const [htmlTemplate, setHtmlTemplate] = useState("");
  const [editableTables, setEditableTables] = useState([]);
  const [tableData, setTableData] = useState({});  // { tableId: [[...], [...]] }

  const [values, setValues] = useState({});
  const [tableRows, setTableRows] = useState([[]]);  // for word/excel path
  const [generating, setGenerating] = useState(false);

  const fileInputRef = useRef(null);

  async function handleFile(selected) {
    setParseError("");
    const type = detectFileType(selected);
    if (!type) { setParseError("Please upload a .docx, .xlsx, or image (jpg/png) file."); return; }
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
      setTableRowHeaders(data.tableRowHeaders || []);
      setValues({});

      // Image path — HTML template
      if (fileType === "image") {
        setHtmlTemplate(data.htmlTemplate || "");
        const tables = data.editableTables || [];
        setEditableTables(tables);
        const initialData = {};
        tables.forEach(t => { initialData[t.id] = t.rows ? t.rows.map(r => [...r]) : []; });
        setTableData(initialData);
      } else {
        // Word/Excel path
        const cols = data.tableColumns || [];
        const rowHeaders = data.tableRowHeaders || [];
        if (rowHeaders.length > 0 && cols.length > 0) {
          setTableRows(rowHeaders.map(h => { const r = new Array(cols.length).fill(""); r[0] = h; return r; }));
        } else {
          setTableRows([new Array(cols.length || 1).fill("")]);
        }
      }

      setStep(2);
    } catch (err) {
      setParseError("Could not analyse the file. Please try again.");
      console.error(err);
    } finally {
      setParsing(false);
    }
  }

  function setValue(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  // Table data management for image path
  function updateTableCell(tableId, rowIdx, colIdx, val) {
    setTableData(prev => {
      const rows = (prev[tableId] || []).map(r => [...r]);
      if (!rows[rowIdx]) rows[rowIdx] = [];
      rows[rowIdx][colIdx] = val;
      return { ...prev, [tableId]: rows };
    });
  }

  function addTableRow(tableId, numCols) {
    setTableData(prev => ({
      ...prev,
      [tableId]: [...(prev[tableId] || []), new Array(numCols).fill("")]
    }));
  }

  function removeTableRow(tableId, rowIdx) {
    setTableData(prev => ({
      ...prev,
      [tableId]: (prev[tableId] || []).filter((_, i) => i !== rowIdx)
    }));
  }

  // Word/Excel table row management
  function updateLegacyCell(rowIdx, colIdx, val) {
    setTableRows(prev => { const copy = prev.map(r => [...r]); if (!copy[rowIdx]) copy[rowIdx] = []; copy[rowIdx][colIdx] = val; return copy; });
  }

  async function handleGenerate(format) {
    setGenerating(format || "pdf");
    try {
      if (fileType === "image") {
        const rendered = buildRenderedHtml(htmlTemplate, fields, values, editableTables, tableData);
        await downloadHtmlAsPdf(rendered, `${documentType.replace(/\s+/g, "_")}_filled.pdf`);
      } else if (fileType === "word") {
        await generateWordDoc(fields, values, tableRows, tableColumns, documentType);
      } else if (fileType === "excel") {
        await generateExcelDoc(fields, values, tableRows, tableColumns, documentType);
      }
    } catch (err) {
      console.error("Generation failed", err);
    } finally {
      setGenerating(false);
    }
  }

  function resetAll() {
    setStep(1); setFile(null); setFileType(null); setImagePreview(null); setParseError("");
    setDocumentType(""); setFields([]); setHasTable(false); setTableColumns([]); setTableRowHeaders([]);
    setHtmlTemplate(""); setEditableTables([]); setTableData({}); setValues({}); setTableRows([[]]);
  }

  const previewHtml = fileType === "image"
    ? buildRenderedHtml(htmlTemplate, fields, values, editableTables, tableData)
    : "";

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Format Filler</h2>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>
            Upload any school format — Word, Excel, or image — and fill it with your data.
          </p>
        </div>

        <StepBar step={step} />

        {/* ── STEP 1: Upload ── */}
        {step === 1 && (
          <div style={card}>
            <p style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Upload your prescribed format</p>
            <div
              style={{ border: "2px dashed #d1d5db", borderRadius: 12, padding: "40px 24px", textAlign: "center", background: "#f9fafb", cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>📁</div>
              <p style={{ margin: 0, fontWeight: 600, color: "#374151" }}>{file ? file.name : "Drag & drop or click to upload"}</p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9ca3af" }}>Supported: .docx &nbsp;·&nbsp; .xlsx &nbsp;·&nbsp; JPG / PNG</p>
              <input ref={fileInputRef} type="file" accept=".docx,.xlsx,.xls,.jpg,.jpeg,.png,.webp" style={{ display: "none" }}
                onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            </div>
            {imagePreview && (
              <img src={imagePreview} alt="preview" style={{ marginTop: 16, maxHeight: 200, borderRadius: 8, border: "1px solid #e5e7eb", display: "block", maxWidth: "100%" }} />
            )}
            {parseError && <p style={{ color: "#dc2626", marginTop: 12, fontSize: 13 }}>{parseError}</p>}
            {file && (
              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <button onClick={handleParse} disabled={parsing} style={primaryBtn}>{parsing ? "Analysing…" : "Analyse Format →"}</button>
                <button onClick={() => { setFile(null); setFileType(null); setImagePreview(null); }} style={ghostBtn}>Remove</button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Fill Fields ── */}
        {step === 2 && (
          <div>
            {/* Top bar */}
            <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{documentType}</p>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6b7280" }}>
                  Fill in the details below, then preview and download.
                </p>
              </div>
              <button onClick={() => setStep(1)} style={ghostBtn}>← Back</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: fileType === "image" && editableTables.length > 0 ? "1fr 1fr" : "1fr", gap: 16 }}>

              {/* Scalar fields */}
              <div style={card}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, marginTop: 0 }}>Document Details</p>
                {fields.length === 0 && <p style={{ fontSize: 13, color: "#9ca3af" }}>No editable header fields detected.</p>}
                <div style={{ display: "grid", gap: 14 }}>
                  {fields.map((f) => (
                    <div key={f.key}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{f.label}</label>
                      <input
                        type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                        value={values[f.key] || ""}
                        onChange={(e) => setValue(f.key, e.target.value)}
                        style={inputStyle}
                        placeholder={`Enter ${f.label.toLowerCase()}…`}
                      />
                    </div>
                  ))}
                </div>

                {/* Word/Excel table (legacy path) */}
                {fileType !== "image" && hasTable && tableColumns.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Table Data</p>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr>{tableColumns.map((col, i) => <th key={i} style={thStyle}>{col}</th>)}<th style={thStyle}>Del</th></tr>
                        </thead>
                        <tbody>
                          {tableRows.map((row, ri) => (
                            <tr key={ri}>
                              {tableColumns.map((_, ci) => (
                                <td key={ci} style={{ ...tdStyle, background: ci === 0 && tableRowHeaders.length > 0 ? "#f3f4f6" : "transparent" }}>
                                  <input
                                    style={{ width: "100%", border: "none", outline: "none", fontSize: 13, background: "transparent", padding: "2px 4px", fontWeight: ci === 0 && tableRowHeaders.length > 0 ? 600 : 400 }}
                                    value={row[ci] || ""}
                                    readOnly={ci === 0 && tableRowHeaders.length > 0}
                                    onChange={(e) => updateLegacyCell(ri, ci, e.target.value)}
                                  />
                                </td>
                              ))}
                              <td style={{ ...tdStyle, textAlign: "center" }}>
                                <button onClick={() => setTableRows(p => p.filter((_, i) => i !== ri))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button onClick={() => setTableRows(p => [...p, new Array(tableColumns.length).fill("")])} style={{ ...ghostBtn, marginTop: 10, fontSize: 13 }}>+ Add Row</button>
                  </div>
                )}
              </div>

              {/* Editable tables for image path */}
              {fileType === "image" && editableTables.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {editableTables.map((table) => (
                    <div key={table.id} style={card}>
                      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, marginTop: 0 }}>
                        {table.title || table.id}
                      </p>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr>{table.columns.map((col, i) => <th key={i} style={thStyle}>{col}</th>)}<th style={thStyle}>Del</th></tr>
                          </thead>
                          <tbody>
                            {(tableData[table.id] || []).map((row, ri) => (
                              <tr key={ri}>
                                {table.columns.map((_, ci) => (
                                  <td key={ci} style={tdStyle}>
                                    <input
                                      style={{ width: "100%", border: "none", outline: "none", fontSize: 13, background: "transparent", padding: "2px 4px" }}
                                      value={row[ci] || ""}
                                      onChange={(e) => updateTableCell(table.id, ri, ci, e.target.value)}
                                    />
                                  </td>
                                ))}
                                <td style={{ ...tdStyle, textAlign: "center" }}>
                                  <button onClick={() => removeTableRow(table.id, ri)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button onClick={() => addTableRow(table.id, table.columns.length)} style={{ ...ghostBtn, marginTop: 10, fontSize: 13 }}>+ Add Row</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live preview for image path */}
            {fileType === "image" && previewHtml && (
              <div style={{ ...card, marginTop: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, marginTop: 0 }}>Live Preview</p>
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
                  <div
                    style={{ transform: "scale(0.75)", transformOrigin: "top left", width: "794px" }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button onClick={() => setStep(3)} style={primaryBtn}>Preview & Download →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview & Download ── */}
        {step === 3 && (
          <div>
            <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Ready to Download</p>
              <button onClick={() => setStep(2)} style={ghostBtn}>← Edit</button>
            </div>

            {/* Full-size preview for image-based */}
            {fileType === "image" && previewHtml && (
              <div style={{ ...card, marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, marginTop: 0 }}>Document Preview</p>
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} style={{ width: 794 }} />
                </div>
              </div>
            )}

            {/* Summary for word/excel */}
            {fileType !== "image" && (
              <div style={{ ...card, marginBottom: 16 }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#15803d" }}>{documentType}</p>
                <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                  {fields.filter((f) => values[f.key]).length} of {fields.length} fields filled
                  {hasTable && tableRows.length > 0 ? ` · ${tableRows.length} table row${tableRows.length > 1 ? "s" : ""}` : ""}
                </p>
                <div style={{ display: "grid", gap: 6, marginTop: 14 }}>
                  {fields.map((f) => (
                    <div key={f.key} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: "#374151", minWidth: 160 }}>{f.label}:</span>
                      <span style={{ color: values[f.key] ? "#111827" : "#9ca3af" }}>{values[f.key] || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {fileType === "image" ? (
                <button onClick={() => handleGenerate("pdf")} disabled={!!generating} style={primaryBtn}>
                  {generating === "pdf" ? "Generating PDF…" : "Download PDF"}
                </button>
              ) : fileType === "word" ? (
                <button onClick={() => handleGenerate("word")} disabled={!!generating} style={primaryBtn}>
                  {generating ? "Generating…" : "Download .docx"}
                </button>
              ) : (
                <button onClick={() => handleGenerate("excel")} disabled={!!generating} style={{ ...primaryBtn, background: "#16a34a" }}>
                  {generating ? "Generating…" : "Download .xlsx"}
                </button>
              )}
              <button onClick={resetAll} style={ghostBtn}>Fill Another Format</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ── sub-components ── */
function StepBar({ step }) {
  const steps = ["Upload Format", "Fill Data", "Download"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "unset" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#10b981" : active ? "#6366f1" : "#e5e7eb", color: done || active ? "#fff" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#111827" : "#6b7280", whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: done ? "#10b981" : "#e5e7eb", margin: "0 10px" }} />}
          </div>
        );
      })}
    </div>
  );
}

const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const primaryBtn = { background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 600, fontSize: 14, cursor: "pointer" };
const ghostBtn = { background: "transparent", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 18px", fontWeight: 500, fontSize: 14, cursor: "pointer" };
const inputStyle = { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" };
const thStyle = { padding: "8px 10px", background: "#f3f4f6", border: "1px solid #e5e7eb", fontWeight: 600, textAlign: "left", fontSize: 12 };
const tdStyle = { padding: "6px 10px", border: "1px solid #e5e7eb", verticalAlign: "middle" };

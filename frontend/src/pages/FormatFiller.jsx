import { useState, useRef } from "react";
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

/* ── Page header builder ── */
function buildHeaderHtml(header) {
  const { logo, schoolName, address, customText } = header;
  const hasAny = logo || schoolName || address || customText;
  if (!hasAny) return "";
  return `
    <div style='width:794px;font-family:Arial,sans-serif;padding:16px 24px 12px;border-bottom:2px solid #e5e7eb;display:flex;align-items:center;gap:16px;background:#fff;box-sizing:border-box'>
      ${logo ? `<img src='${logo}' alt='logo' style='height:72px;width:72px;object-fit:contain;flex-shrink:0' />` : ""}
      <div style='flex:1;text-align:center'>
        ${schoolName ? `<div style='font-size:20px;font-weight:700;color:#111827;line-height:1.3'>${schoolName}</div>` : ""}
        ${address ? `<div style='font-size:13px;color:#4b5563;margin-top:3px'>${address}</div>` : ""}
        ${customText ? `<div style='font-size:13px;color:#4b5563;margin-top:2px'>${customText}</div>` : ""}
      </div>
      ${logo ? `<div style='width:72px;flex-shrink:0'></div>` : ""}
    </div>`;
}

/* ── HTML template helpers ── */
function buildRenderedHtml(htmlTemplate, fields, values, editableTables, tableData, header) {
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

  const headerHtml = buildHeaderHtml(header || {});
  return headerHtml
    ? `<div style='font-family:Arial,sans-serif;background:#fff'>${headerHtml}${html}</div>`
    : html;
}

/* ── PDF from HTML ── */
async function downloadHtmlAsPdf(htmlContent, filename) {
  // Mount in a wrapper that lets content decide its own width
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:absolute;left:-9999px;top:0;background:#fff;display:inline-block;min-width:794px";
  wrapper.innerHTML = htmlContent;
  document.body.appendChild(wrapper);

  // Measure natural content width after layout
  const naturalW = Math.max(wrapper.scrollWidth, 794);
  wrapper.style.width = naturalW + "px";

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#fff",
      width: naturalW,
      windowWidth: naturalW,
    });

    const imgData = canvas.toDataURL("image/png");
    const contentAspect = canvas.width / canvas.height; // px/px

    // A4 dimensions in mm
    const A4_W = 210, A4_H = 297;
    // Use landscape if content is wider than tall relative to A4
    const useLandscape = contentAspect > A4_W / A4_H;
    const pageW = useLandscape ? A4_H : A4_W;  // mm
    const pageH = useLandscape ? A4_W : A4_H;  // mm

    const doc = new jsPDF({ orientation: useLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" });

    // Scale image to fit page width exactly
    const imgMmH = pageW / contentAspect;

    if (imgMmH <= pageH) {
      doc.addImage(imgData, "PNG", 0, 0, pageW, imgMmH);
    } else {
      // Multi-page slice
      const pxPerPage = Math.floor((pageH / imgMmH) * canvas.height);
      let srcY = 0;
      while (srcY < canvas.height) {
        const sliceH = Math.min(pxPerPage, canvas.height - srcY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        sliceCanvas.getContext("2d").drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (srcY > 0) doc.addPage();
        const sliceMmH = (sliceH / canvas.height) * imgMmH;
        doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, pageW, sliceMmH);
        srcY += sliceH;
      }
    }

    doc.save(filename);
  } finally {
    document.body.removeChild(wrapper);
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

  // Optional page header
  const [header, setHeader] = useState({ logo: "", schoolName: "", address: "", customText: "" });
  const [headerOpen, setHeaderOpen] = useState(false);

  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

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

  function handleLogoUpload(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setHeader(prev => ({ ...prev, logo: ev.target.result }));
    reader.readAsDataURL(f);
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
        const rendered = buildRenderedHtml(htmlTemplate, fields, values, editableTables, tableData, header);
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
    setHeader({ logo: "", schoolName: "", address: "", customText: "" }); setHeaderOpen(false);
  }

  const previewHtml = fileType === "image"
    ? buildRenderedHtml(htmlTemplate, fields, values, editableTables, tableData, header)
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

            {/* Optional page header */}
            <div style={{ ...card, marginBottom: 16 }}>
              <button
                onClick={() => setHeaderOpen(o => !o)}
                style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#6366f1", padding: 0, display: "flex", alignItems: "center", gap: 6 }}
              >
                <span style={{ fontSize: 16 }}>{headerOpen ? "▾" : "▸"}</span>
                Page Header (optional) — school logo, name, address
              </button>

              {headerOpen && (
                <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                  {/* Logo upload */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>School Logo</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {header.logo
                        ? <img src={header.logo} alt="logo" style={{ height: 56, width: 56, objectFit: "contain", border: "1px solid #e5e7eb", borderRadius: 6 }} />
                        : <div style={{ height: 56, width: 56, border: "1.5px dashed #d1d5db", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 22 }}>🏫</div>
                      }
                      <div>
                        <button onClick={() => logoInputRef.current?.click()} style={{ ...ghostBtn, padding: "7px 14px", fontSize: 13 }}>
                          {header.logo ? "Change Logo" : "Upload Logo"}
                        </button>
                        {header.logo && (
                          <button onClick={() => setHeader(p => ({ ...p, logo: "" }))} style={{ ...ghostBtn, padding: "7px 14px", fontSize: 13, marginLeft: 8, color: "#ef4444", borderColor: "#fca5a5" }}>Remove</button>
                        )}
                      </div>
                      <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                    </div>
                  </div>

                  {/* School name */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>School Name</label>
                    <input type="text" value={header.schoolName} onChange={e => setHeader(p => ({ ...p, schoolName: e.target.value }))}
                      style={inputStyle} placeholder="e.g. DAV Public School" />
                  </div>

                  {/* Address */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Address</label>
                    <input type="text" value={header.address} onChange={e => setHeader(p => ({ ...p, address: e.target.value }))}
                      style={inputStyle} placeholder="e.g. Sector 14, Patna — 800001" />
                  </div>

                  {/* Custom text */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Custom Text <span style={{ fontWeight: 400, color: "#9ca3af" }}>(shown below address)</span></label>
                    <input type="text" value={header.customText} onChange={e => setHeader(p => ({ ...p, customText: e.target.value }))}
                      style={inputStyle} placeholder="e.g. Ph: 0612-123456 | Email: info@davpatna.edu" />
                  </div>
                </div>
              )}
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
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb", padding: 8 }}>
                  <div
                    style={{ transform: "scale(0.7)", transformOrigin: "top left", display: "inline-block", minWidth: 794 }}
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
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", padding: 8 }}>
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} style={{ display: "inline-block", minWidth: 794 }} />
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

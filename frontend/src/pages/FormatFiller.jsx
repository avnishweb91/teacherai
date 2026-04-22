import { useState, useRef } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ShadingType } from "docx";

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

function hexToRgb(hex) {
  if (!hex || !hex.startsWith("#")) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

function hexNoHash(hex) {
  return hex ? hex.replace("#", "") : "374151";
}

const PALETTES = [
  { header: "#1a237e", headerText: "#ffffff", alt: "#e8eaf6", border: "#3949ab" }, // Navy
  { header: "#0d47a1", headerText: "#ffffff", alt: "#e3f2fd", border: "#1565c0" }, // Royal Blue
  { header: "#004d40", headerText: "#ffffff", alt: "#e0f2f1", border: "#00796b" }, // Teal
  { header: "#1b5e20", headerText: "#ffffff", alt: "#e8f5e9", border: "#388e3c" }, // Forest Green
  { header: "#880e4f", headerText: "#ffffff", alt: "#fce4ec", border: "#c2185b" }, // Maroon
  { header: "#4a148c", headerText: "#ffffff", alt: "#ede7f6", border: "#7b1fa2" }, // Purple
  { header: "#263238", headerText: "#ffffff", alt: "#eceff1", border: "#455a64" }, // Charcoal
  { header: "#bf360c", headerText: "#ffffff", alt: "#fbe9e7", border: "#e64a19" }, // Deep Orange
];

function getHue(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}

function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
}

function pickPalette(detectedHeaderColor) {
  // If color is too light or missing, use Navy as default
  if (!detectedHeaderColor || getLuminance(detectedHeaderColor) > 0.55) {
    return PALETTES[0];
  }
  // Otherwise find closest palette by hue match
  const hue = getHue(detectedHeaderColor);
  let best = PALETTES[0], bestDiff = 360;
  for (const p of PALETTES) {
    const diff = Math.abs(getHue(p.header) - hue);
    const wrapped = Math.min(diff, 360 - diff);
    if (wrapped < bestDiff) { bestDiff = wrapped; best = p; }
  }
  return best;
}

/* ── Word doc for image uploads (styled table) ── */
async function generateStyledWordFromImage(fields, values, tableRows, tableColumns, documentType, design) {
  const palette = pickPalette(design?.headerBgColor);
  const titleStr = design?.titleText || documentType;
  const hdrHex = hexNoHash(palette.header);
  const hdrTxtHex = hexNoHash(palette.headerText);
  const altHex = hexNoHash(palette.alt);

  const titlePara = new Paragraph({
    children: [new TextRun({ text: titleStr.toUpperCase(), bold: true, size: 28, color: hdrHex })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  });

  const metaParas = fields.filter((f) => f.type !== "table").map((f) =>
    new Paragraph({
      children: [
        new TextRun({ text: `${f.label}: `, bold: true, color: hdrHex }),
        new TextRun({ text: values[f.key] || "—" }),
      ],
      spacing: { after: 160 },
    })
  );

  const children = [titlePara, ...metaParas];

  if (tableColumns.length > 0 && tableRows.length > 0) {
    if (metaParas.length > 0) children.push(new Paragraph({ text: "", spacing: { after: 200 } }));

    const colW = Math.floor(9000 / tableColumns.length);

    const headerRow = new TableRow({
      children: tableColumns.map((col) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: col, bold: true, color: hdrTxtHex, size: 18 })], alignment: AlignmentType.CENTER })],
          shading: { fill: hdrHex, type: ShadingType.CLEAR, color: "auto" },
          width: { size: colW, type: WidthType.DXA },
        })
      ),
    });

    const dataRows = tableRows.map((row, ri) =>
      new TableRow({
        children: tableColumns.map((_, ci) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: row[ci] || "" })], alignment: AlignmentType.CENTER })],
            shading: ri % 2 === 1 ? { fill: altHex, type: ShadingType.CLEAR, color: "auto" } : undefined,
            width: { size: colW, type: WidthType.DXA },
          })
        ),
      })
    );

    children.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 9000, type: WidthType.DXA } }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${titleStr.replace(/\s+/g, "_")}_filled.docx`);
}

/* ── Excel for image uploads ── */
async function generateExcelFromImage(fields, values, tableRows, tableColumns, documentType, design) {
  const XLSX = await import("xlsx");
  const titleStr = design?.titleText || documentType;
  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push([titleStr]);
  wsData.push([]);

  fields.filter((f) => f.type !== "table").forEach((f) => {
    wsData.push([f.label, values[f.key] || ""]);
  });

  if (tableColumns.length > 0 && tableRows.length > 0) {
    wsData.push([]);
    wsData.push(tableColumns);
    tableRows.forEach((row) => wsData.push([...row]));
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const maxColW = Math.max(...tableColumns.map((c) => c.length), 20);
  ws["!cols"] = tableColumns.map(() => ({ wch: maxColW }));
  XLSX.utils.book_append_sheet(wb, ws, "Timetable");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${titleStr.replace(/\s+/g, "_")}_filled.xlsx`);
}

function generateImagePdf(fields, values, tableRows, tableColumns, documentType, imageDataUrl, design) {
  const isLandscape = tableColumns && tableColumns.length > 5;
  const doc = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const palette  = pickPalette(design?.headerBgColor);
  const hdrBg    = hexToRgb(palette.header);
  const hdrText  = hexToRgb(palette.headerText);
  const altRow   = hexToRgb(palette.alt);
  const border   = hexToRgb(palette.border);
  const pageBg   = [255, 255, 255];
  const titleStr = design?.titleText || documentType;

  // Page background
  doc.setFillColor(...pageBg);
  doc.rect(0, 0, pageW, pageH, "F");

  // Title bar
  doc.setFillColor(...hdrBg);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(...hdrText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(titleStr.toUpperCase(), pageW / 2, 12, { align: "center" });

  let y = 24;

  // Non-table fields (school name, class, date, etc.) as a styled row of chips
  const metaFields = fields.filter((f) => f.type !== "table");
  if (metaFields.length > 0) {
    doc.setFontSize(9);
    const colCount = Math.min(metaFields.length, 3);
    const colW = (pageW - 20) / colCount;
    let col = 0;

    metaFields.forEach((f) => {
      const x = 10 + col * colW;
      // label
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...hdrBg);
      doc.text(`${f.label}:`, x, y);
      // value
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const val = values[f.key] || "—";
      doc.text(val, x + doc.getTextWidth(`${f.label}:  `), y);

      col++;
      if (col >= colCount) { col = 0; y += 7; }
    });

    if (col !== 0) y += 7;
    y += 4;

    // divider
    doc.setDrawColor(...border);
    doc.setLineWidth(0.4);
    doc.line(10, y, pageW - 10, y);
    y += 5;
  }

  // Table
  if (tableColumns && tableColumns.length > 0 && tableRows.length > 0) {
    const colW = (pageW - 20) / tableColumns.length;
    const rowH = 9;
    const tableStartY = y;

    // Header row
    doc.setFillColor(...hdrBg);
    doc.rect(10, y, pageW - 20, rowH, "F");
    doc.setTextColor(...hdrText);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    tableColumns.forEach((col, i) => {
      const cx = 10 + i * colW + colW / 2;
      doc.text(col, cx, y + 6, { align: "center" });
    });
    y += rowH;

    // Data rows
    tableRows.forEach((row, ri) => {
      if (y + rowH > pageH - 10) { doc.addPage(); y = 15; }

      // alternating row background
      if (altRow && ri % 2 === 1) {
        doc.setFillColor(...altRow);
        doc.rect(10, y, pageW - 20, rowH, "F");
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(10, y, pageW - 20, rowH, "F");
      }

      // cell borders
      doc.setDrawColor(...border);
      doc.setLineWidth(0.2);
      tableColumns.forEach((_, i) => {
        doc.rect(10 + i * colW, y, colW, rowH);
      });

      // cell text
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      tableColumns.forEach((_, i) => {
        const cell = row[i] || "";
        const cx = 10 + i * colW + colW / 2;
        doc.text(cell, cx, y + 6, { align: "center" });
      });

      y += rowH;
    });

    // outer border around entire table
    doc.setDrawColor(...hdrBg);
    doc.setLineWidth(0.5);
    doc.rect(10, tableStartY, pageW - 20, y - tableStartY);
  }

  doc.save(`${(design?.titleText || documentType).replace(/\s+/g, "_")}_filled.pdf`);
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
  const [design, setDesign] = useState(null);

  const [values, setValues] = useState({});
  const [tableRows, setTableRows] = useState([[]]);

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

      const cols = data.tableColumns || [];
      const rowHeaders = data.tableRowHeaders || [];

      setDocumentType(data.documentType || "Document");
      setFields(data.fields || []);
      setHasTable(data.hasTable || false);
      setTableColumns(cols);
      setTableRowHeaders(rowHeaders);
      setDesign(data.design || null);
      setValues({});

      // Pre-fill rows: if row headers exist, seed a row per header with first cell set
      if (rowHeaders.length > 0 && cols.length > 0) {
        const seeded = rowHeaders.map((header) => {
          const row = new Array(cols.length).fill("");
          row[0] = header;
          return row;
        });
        setTableRows(seeded);
      } else {
        setTableRows([new Array(cols.length || 1).fill("")]);
      }

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
  const [generating, setGenerating] = useState(false);

  async function handleGenerate(format) {
    setGenerating(format);
    try {
      if (fileType === "word") {
        await generateWordDoc(fields, values, tableRows, tableColumns, documentType);
      } else if (fileType === "excel") {
        await generateExcelDoc(fields, values, tableRows, tableColumns, documentType);
      } else {
        // image upload — user picks format
        if (format === "pdf") {
          generateImagePdf(fields, values, tableRows, tableColumns, documentType, imagePreview, design);
        } else if (format === "word") {
          await generateStyledWordFromImage(fields, values, tableRows, tableColumns, documentType, design);
        } else if (format === "excel") {
          await generateExcelFromImage(fields, values, tableRows, tableColumns, documentType, design);
        }
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
    setTableRowHeaders([]);
    setDesign(null);
    setValues({});
    setTableRows([[]]);
  }

  const outputLabel = fileType === "excel" ? ".xlsx" : ".docx";

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
                  {fields.length > 0 && `${fields.length} field${fields.length !== 1 ? "s" : ""}`}
                  {fields.length > 0 && hasTable && " · "}
                  {hasTable && tableColumns.length > 0 && `${tableColumns.length}-column table${tableRowHeaders.length > 0 ? ` · ${tableRowHeaders.length} rows` : ""}`}
                  {fields.length === 0 && !hasTable && "Fill in your data below"}
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
                            <td key={ci} style={{ ...tdStyle, background: ci === 0 && tableRowHeaders.length > 0 ? "#f3f4f6" : "transparent" }}>
                              <input
                                style={{ width: "100%", border: "none", outline: "none", fontSize: 13, background: "transparent", padding: "2px 4px", fontWeight: ci === 0 && tableRowHeaders.length > 0 ? 600 : 400 }}
                                value={row[ci] || ""}
                                readOnly={ci === 0 && tableRowHeaders.length > 0}
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

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {fileType === "image" ? (
                <>
                  <button onClick={() => handleGenerate("pdf")} disabled={!!generating} style={primaryBtn}>
                    {generating === "pdf" ? "Generating…" : "Download PDF"}
                  </button>
                  <button onClick={() => handleGenerate("word")} disabled={!!generating} style={{ ...primaryBtn, background: "#2563eb" }}>
                    {generating === "word" ? "Generating…" : "Download Word (.docx)"}
                  </button>
                  <button onClick={() => handleGenerate("excel")} disabled={!!generating} style={{ ...primaryBtn, background: "#16a34a" }}>
                    {generating === "excel" ? "Generating…" : "Download Excel (.xlsx)"}
                  </button>
                </>
              ) : (
                <button onClick={() => handleGenerate(fileType)} disabled={!!generating} style={primaryBtn}>
                  {generating ? "Generating…" : `Download ${outputLabel}`}
                </button>
              )}
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

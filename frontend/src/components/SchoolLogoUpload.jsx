import { useRef } from "react";

export function useSchoolLogo(logo, setLogo) {
  const logoRef = useRef();

  const handleLogo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      setLogo(b64);
      localStorage.setItem("school_logo", b64);
    };
    reader.readAsDataURL(f);
  };

  const removeLogo = () => {
    setLogo(null);
    localStorage.removeItem("school_logo");
  };

  return { logoRef, handleLogo, removeLogo };
}

export default function SchoolLogoUpload({ logo, setLogo }) {
  const { logoRef, handleLogo, removeLogo } = useSchoolLogo(logo, setLogo);

  return (
    <div className="form-field">
      <label className="form-label">School Logo <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional — appears on PDF)</span></label>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          onClick={() => logoRef.current.click()}
          style={{
            width: 64, height: 64, borderRadius: 10,
            border: "2px dashed #cbd5e1", display: "flex",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", overflow: "hidden",
            background: "#f8fafc", flexShrink: 0,
          }}
        >
          {logo
            ? <img src={logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            : <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 11 }}>
                <div style={{ fontSize: 22 }}>🏫</div>
                <div>Upload</div>
              </div>
          }
        </div>
        <div>
          <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogo} />
          <button
            type="button"
            onClick={() => logoRef.current.click()}
            style={{
              background: "#eff6ff", color: "#2563eb", border: "1.5px solid #bfdbfe",
              borderRadius: 8, padding: "7px 16px", fontWeight: 700,
              fontSize: 13, cursor: "pointer", display: "block", marginBottom: 6,
            }}
          >
            {logo ? "Change Logo" : "Upload School Logo"}
          </button>
          {logo && (
            <button
              type="button"
              onClick={removeLogo}
              style={{ background: "none", border: "none", color: "#dc2626", fontSize: 12, cursor: "pointer", padding: 0 }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

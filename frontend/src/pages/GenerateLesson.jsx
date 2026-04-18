import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";

const SUBJECTS_BY_GRADE = {
  UKG: ["English (Phonics)", "Maths", "Environmental Science (EVS)", "Hindi (Varnamala)", "Drawing & Arts", "Music & Dance"],
  "1": ["English", "Mathematics", "Environmental Studies (EVS)", "Hindi", "General Knowledge", "Art & Craft", "Physical Education"],
  "2": ["English", "Mathematics", "Environmental Studies (EVS)", "Hindi", "General Knowledge", "Art & Craft", "Physical Education"],
  "3": ["English", "Mathematics", "Environmental Studies (EVS)", "Hindi", "Computer Science", "General Knowledge", "Art & Craft", "Physical Education"],
  "4": ["English", "Mathematics", "Environmental Studies (EVS)", "Hindi", "Computer Science", "General Knowledge", "Art & Craft", "Physical Education"],
  "5": ["English", "Mathematics", "Environmental Studies (EVS)", "Hindi", "Computer Science", "General Knowledge", "Art & Craft", "Physical Education"],
  "6": ["English", "Mathematics", "Science", "Social Studies (History)", "Social Studies (Geography)", "Social Studies (Civics)", "Hindi", "Computer Science", "Art & Music", "Physical Education"],
  "7": ["English", "Mathematics", "Science", "Social Studies (History)", "Social Studies (Geography)", "Social Studies (Civics)", "Hindi", "Computer Science", "Art & Music", "Physical Education"],
  "8": ["English", "Mathematics", "Science", "Social Studies (History)", "Social Studies (Geography)", "Social Studies (Civics)", "Hindi", "Computer Science", "Art & Music", "Physical Education"],
  "9": ["English", "Mathematics", "Physics", "Chemistry", "Biology", "Social Science (History)", "Social Science (Geography)", "Social Science (Civics)", "Social Science (Economics)", "Hindi", "Computer Applications", "Physical Education"],
  "10": ["English", "Mathematics", "Physics", "Chemistry", "Biology", "Social Science (History)", "Social Science (Geography)", "Social Science (Civics)", "Social Science (Economics)", "Hindi", "Computer Applications", "Physical Education"],
  "11_science": ["English", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "Informatics Practices"],
  "11_commerce": ["English", "Accountancy", "Business Studies", "Economics", "Mathematics", "Informatics Practices"],
  "11_arts": ["English", "History", "Political Science", "Geography", "Psychology", "Sociology", "Economics", "Fine Arts"],
  "12_science": ["English", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "Informatics Practices"],
  "12_commerce": ["English", "Accountancy", "Business Studies", "Economics", "Mathematics", "Informatics Practices"],
  "12_arts": ["English", "History", "Political Science", "Geography", "Psychology", "Sociology", "Economics", "Fine Arts"],
};

function getSubjectKey(grade, stream) {
  if (grade === "11" || grade === "12") return `${grade}_${stream || "science"}`;
  return grade;
}

export default function GenerateLesson() {
  const [syllabus, setSyllabus]   = useState("");
  const [subject, setSubject]     = useState("");
  const [grade, setGrade]         = useState("");
  const [stream, setStream]       = useState("science");
  const [topic, setTopic]         = useState("");
  const [duration, setDuration]   = useState(40);
  const [languages, setLanguages] = useState("");

  const subjectKey = getSubjectKey(grade, stream);
  const subjectOptions = SUBJECTS_BY_GRADE[subjectKey] || [];

  const [loading, setLoading] = useState(false);
  const [lesson, setLesson]   = useState("");
  const [error, setError]     = useState("");
  const [limitHit, setLimitHit] = useState(false);
  const [saved, setSaved]     = useState(false);

  const navigate = useNavigate();

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError("");
    setLesson("");
    setSaved(false);
    setLimitHit(false);
    setLoading(true);
    try {
      const response = await api.post("/api/lesson/generate", {
        syllabus, subject, grade, topic, duration
      });
      setLesson(response.data.content);
    } catch (err) {
      if (err.response?.status === 402)      setLimitHit(true);
      else if (err.response?.status === 401) setError("Session expired. Please login again.");
      else if (err.response?.status === 429) setError("AI usage limit exceeded. Try later.");
      else                                   setError("Failed to generate lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const savedLessons = JSON.parse(localStorage.getItem("lessons") || "[]");
    localStorage.setItem("lessons", JSON.stringify([
      ...savedLessons,
      { id: Date.now(), syllabus, subject, grade, topic, duration, languages, content: lesson, createdAt: new Date().toISOString() }
    ]));
    setSaved(true);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Generate Lesson Plan</h1>
        <p className="page-subtitle">Fill in the details below and let AI create a lesson plan for you.</p>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        <form onSubmit={handleGenerate}>
          <div className="form-grid">

            <div className="form-field">
              <label className="form-label">Board / Syllabus</label>
              <select className="form-select" value={syllabus} onChange={(e) => setSyllabus(e.target.value)} required>
                <option value="">Select board</option>
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="Bihar Board">Bihar Board</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Class / Grade</label>
              <select className="form-select" value={grade} onChange={(e) => { setGrade(e.target.value); setSubject(""); }} required>
                <option value="">Select class</option>
                <option value="UKG">UKG</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={String(i + 1)}>Class {i + 1}</option>
                ))}
              </select>
            </div>

            {(grade === "11" || grade === "12") && (
              <div className="form-field">
                <label className="form-label">Stream</label>
                <select className="form-select" value={stream} onChange={(e) => { setStream(e.target.value); setSubject(""); }}>
                  <option value="science">Science (PCM/PCB)</option>
                  <option value="commerce">Commerce</option>
                  <option value="arts">Humanities / Arts</option>
                </select>
              </div>
            )}

            <div className="form-field">
              <label className="form-label">Subject</label>
              <select className="form-select" value={subject} onChange={(e) => setSubject(e.target.value)} required disabled={!grade}>
                <option value="">{grade ? "Select subject" : "Select class first"}</option>
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Duration (minutes)</label>
              <input
                type="number"
                className="form-input"
                min="20"
                max="90"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>

            <div className="form-field form-field-full">
              <label className="form-label">Topic</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Fractions, Photosynthesis, The French Revolution"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>

            <div className="form-field form-field-full">
              <label className="form-label">Language(s)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. English / Hindi"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
              />
            </div>
          </div>

          {limitHit && (
            <div style={{
              marginTop: 16, padding: "16px 20px", borderRadius: 12,
              background: "#fffbeb", border: "1px solid #fcd34d",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"
            }}>
              <div>
                <div style={{ fontWeight: 700, color: "#92400e" }}>Daily limit reached</div>
                <div style={{ fontSize: 13, color: "#b45309" }}>FREE plan allows 3 lesson plans/day. Upgrade for unlimited access.</div>
              </div>
              <button className="btn-primary" onClick={() => navigate("/upgrade")} style={{ whiteSpace: "nowrap" }}>
                Upgrade to PRO
              </button>
            </div>
          )}

          {error && (
            <div className="alert-error" style={{ marginTop: 16 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? "Generating with AI…" : "✨ Generate Lesson Plan"}
            </button>
          </div>
        </form>
      </div>

      {lesson && (
        <div className="result-box">
          <div className="result-box-header">
            <span className="result-box-title">📘 Generated Lesson Plan</span>
            <div className="result-box-actions">
              <button className="btn-success" onClick={handleSave} disabled={saved}>
                {saved ? "✓ Saved" : "💾 Save Lesson"}
              </button>
            </div>
          </div>

          <pre className="result-text">{lesson}</pre>

          {saved && (
            <div className="alert-success">
              <span>✅</span> Lesson saved to history successfully.
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

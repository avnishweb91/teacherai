import { useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";

export default function LessonHistory() {
  const lessons = JSON.parse(localStorage.getItem("lessons") || "[]");
  const [expanded, setExpanded] = useState(null);

  const toggle = (id) => setExpanded(expanded === id ? null : id);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Lesson History</h1>
        <p className="page-subtitle">
          {lessons.length > 0
            ? `${lessons.length} lesson${lessons.length !== 1 ? "s" : ""} saved`
            : "No lessons saved yet"}
        </p>
      </div>

      {lessons.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <p style={{ fontWeight: 600, color: "#64748b" }}>No lessons saved yet</p>
          <p style={{ fontSize: 14, marginTop: 4 }}>Generate a lesson plan to see it here.</p>
        </div>
      ) : (
        <div className="history-list">
          {[...lessons].reverse().map((l) => (
            <div key={l.id} className="history-card">
              <div className="history-card-header" onClick={() => toggle(l.id)}>
                <div style={{ flex: 1 }}>
                  <div className="history-card-topic">{l.topic}</div>
                  <div className="history-card-meta">
                    <span className="history-meta-chip">📚 {l.subject}</span>
                    <span className="history-meta-chip">🏫 Class {l.grade}</span>
                    <span className="history-meta-chip">⏱ {l.duration} min</span>
                    {l.syllabus && <span className="history-meta-chip">{l.syllabus}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span className="history-card-date">
                    {new Date(l.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </span>
                  <span style={{ fontSize: 12, color: "#2563eb" }}>
                    {expanded === l.id ? "▲ Hide" : "▼ View"}
                  </span>
                </div>
              </div>

              {expanded === l.id && (
                <div className="history-card-body">
                  <pre className="result-text">{l.content}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

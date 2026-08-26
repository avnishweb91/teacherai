import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import api from "../services/api";
import "./learning-demo.css";

const SUBJECTS = {
  Mathematics: {
    color: "#6d5dfc",
    chapters: ["Numbers & Patterns", "Fractions Made Easy", "Algebra Basics", "Geometry Around Us", "Data Handling"],
  },
  Science: {
    color: "#0d9d88",
    chapters: ["The Living World", "Matter & Materials", "Force and Motion", "Light & Shadows", "Our Environment"],
  },
};

const QUESTIONS = [
  { q: "Which number completes the pattern: 2, 4, 8, 16, __?", answers: ["20", "24", "32", "64"], correct: 2 },
  { q: "A fraction shows a part of a ____.", answers: ["sentence", "whole", "number line", "triangle"], correct: 1 },
  { q: "What does the denominator tell us?", answers: ["Number of equal parts", "The total", "The colour", "The operation"], correct: 0 },
];

function VideoPlaceholder({ onUpload }) {
  const input = useRef(null);
  return <div className="video-placeholder">
    <div className="play-ring">▶</div>
    <div className="video-grid" />
    <div className="video-copy"><span className="eyebrow">SMARTBOARD LEARN</span><h2>Your sample lesson<br />will play here</h2><p>Upload an MP4, WebM or MOV video from the admin panel to make this live.</p></div>
    <button className="upload-video-cta" onClick={() => input.current?.click()}>Upload sample video</button>
    <input ref={input} type="file" accept="video/*" hidden onChange={onUpload} />
  </div>;
}

export default function LearningDemo() {
  const [studentLoggedIn, setStudentLoggedIn] = useState(false);
  const [studentAccount, setStudentAccount] = useState(null);
  const [activeSubject, setActiveSubject] = useState("Mathematics");
  const [activeChapter, setActiveChapter] = useState(0);
  const [page, setPage] = useState("learn");
  const [video, setVideo] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState("");
  const [student, setStudent] = useState("Aarav Sharma");
  const chapters = SUBJECTS[activeSubject].chapters;
  const score = useMemo(() => Object.entries(answers).reduce((n, [i, a]) => n + (QUESTIONS[i].correct === a ? 1 : 0), 0), [answers]);

  useEffect(() => () => video?.local && URL.revokeObjectURL(video.url), [video]);
  useEffect(() => {
    const chapter = SUBJECTS[activeSubject].chapters[activeChapter];
    api.get("/api/videos/chapter", { params: { grade: "Class 7", subject: activeSubject, chapter }, _skipAuthRedirect: true })
      .then(({ data }) => setVideo({ id: data.id, url: `${api.defaults.baseURL}/api/videos/${data.id}/stream`, name: data.title, persistent: true }))
      .catch(() => {
        api.get("/api/videos/sample", { _skipAuthRedirect: true }).then(({ data }) => {
          setVideo(data ? { url: `${api.defaults.baseURL}/api/videos/sample/stream?key=${encodeURIComponent(data.key)}`, name: data.title, persistent: true } : null);
        }).catch(() => setVideo(null));
      });
  }, [activeSubject, activeChapter]);
  const upload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (video?.local) URL.revokeObjectURL(video.url);
    setVideo({ url: URL.createObjectURL(file), name: file.name, size: file.size, file, local: true });
    setToast("Video selected — publish it to save permanently");
  };
  const publishVideo = async () => {
    if (!video?.file) return showToast("Choose a video file first");
    const data = new FormData();
    data.append("file", video.file); data.append("title", video.name.replace(/\.[^.]+$/, "")); data.append("grade", "Class 7"); data.append("subject", activeSubject); data.append("chapter", chapters[activeChapter]);
    try {
      const result = await api.post("/api/admin/videos/upload", data);
      if (video.local) URL.revokeObjectURL(video.url);
      setVideo({ id: result.data.id, url: `${api.defaults.baseURL}/api/videos/${result.data.id}/stream`, name: result.data.title, persistent: true });
      showToast("Published — this video is now saved in Railway Bucket");
    } catch (error) { showToast(error.response?.data?.message || "Upload failed. Sign in with an admin account first."); }
  };
  const pickSubject = (name) => { setActiveSubject(name); setActiveChapter(0); setSubmitted(false); setAnswers({}); };
  const showToast = (message) => { setToast(message); window.setTimeout(() => setToast(""), 2800); };

  if (!studentLoggedIn) return <StudentLogin onLogin={(account) => { setStudentAccount(account); setStudentLoggedIn(true); }} />;

  return <div className="learn-app">
    <header className="learn-header">
      <Link to="/" className="brand"><span>✦</span> smartboard<span className="brand-dot">.</span></Link>
      <div className="header-center"><span className="demo-pill">DEMO CAMPUS</span><span>Classes 5–10</span></div>
      <div className="student-chip"><span className="avatar">{studentAccount?.name?.split(" ").map(x => x[0]).join("").slice(0, 2) || "AS"}</span><div><b>{studentAccount?.name || student}</b><small>{studentAccount?.boardPreference || "Class 7"} · Student</small></div><span className="chev">⌄</span></div>
    </header>

    <aside className="learn-sidebar">
      <div className="sidebar-label">LEARNING SPACE</div>
      <button className={page === "learn" ? "nav-item active" : "nav-item"} onClick={() => setPage("learn")}><span>▣</span> My learning</button>
      <button className={page === "progress" ? "nav-item active" : "nav-item"} onClick={() => setPage("progress")}><span>◔</span> My progress</button>
      <div className="sidebar-label subject-label">SUBJECTS</div>
      {Object.entries(SUBJECTS).map(([name, data]) => <button className={activeSubject === name ? "subject-item chosen" : "subject-item"} key={name} onClick={() => pickSubject(name)}><i style={{ background: data.color }} />{name}<span>{data.chapters.length}</span></button>)}
      <div className="sidebar-bottom"><button onClick={() => setPage("admin")}>⚙ Admin upload panel</button><button onClick={() => showToast("Signed out of demo")}>↪ Sign out</button></div>
    </aside>

    <main className="learn-main">
      {page === "learn" && <>
        <div className="welcome-row"><div><p className="kicker">GOOD AFTERNOON, AARAV</p><h1>Ready to learn something new?</h1><p className="muted">Pick up where you left off and keep your streak going.</p></div><div className="streak">🔥 <b>8</b><span>day streak</span></div></div>
        <section className="continue-card"><div className="continue-art"><span>∑</span></div><div className="continue-info"><p className="eyebrow">CONTINUE LEARNING · {activeSubject.toUpperCase()}</p><h2>{chapters[activeChapter]}</h2><p>Class 7 · Chapter {activeChapter + 1} · 12 min lesson</p><div className="progress-line"><i style={{ width: "62%" }} /></div><small>62% complete</small></div><button className="primary" onClick={() => document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth" })}>Continue <span>→</span></button></section>
        <section className="content-heading"><div><p className="kicker">EXPLORE</p><h2>Choose a chapter</h2></div><div className="subject-toggle">{Object.keys(SUBJECTS).map(name => <button key={name} className={activeSubject === name ? "selected" : ""} onClick={() => pickSubject(name)}>{name}</button>)}</div></section>
        <div className="chapter-grid">{chapters.map((chapter, index) => <button className={index === activeChapter ? "chapter-card current" : "chapter-card"} key={chapter} onClick={() => { setActiveChapter(index); document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth" }); }}><div className="chapter-top"><span className="chapter-number">{String(index + 1).padStart(2, "0")}</span>{index < 2 && <span className="done">✓</span>}</div><div className="chapter-icon" style={{ background: index % 2 ? "#effdf9" : "#f1f0ff", color: SUBJECTS[activeSubject].color }}>{["◒", "◈", "△", "◌", "▥"][index]}</div><h3>{chapter}</h3><p>{index === activeChapter ? "In progress" : index < activeChapter ? "Completed" : "Start lesson"} · 12 min</p></button>)}</div>
        <section id="lesson" className="lesson-section"><div className="lesson-title"><div><p className="kicker">VIDEO LESSON</p><h2>{chapters[activeChapter]}</h2></div><span className="duration">◷ 12:08</span></div>{video ? <video className="lesson-video" controls src={video.url} /> : <VideoPlaceholder onUpload={upload} />}<div className="lesson-notes"><div><b>What you’ll learn</b><span>Understand the key concept through real-life examples and a short guided practice.</span></div><button onClick={() => showToast("Lesson saved to your library")}>♡ Save lesson</button></div></section>
        <section className="quiz-section"><div className="quiz-heading"><div><p className="kicker">KNOWLEDGE CHECK</p><h2>Quick practice</h2><p>Answer these 3 questions to complete the lesson.</p></div><span className="points">+30 XP</span></div>{QUESTIONS.map((item, index) => <div className="question" key={item.q}><b><span>{index + 1}</span>{item.q}</b><div className="answers">{item.answers.map((answer, answerIndex) => <button key={answer} disabled={submitted} className={answers[index] === answerIndex ? (submitted ? (answerIndex === item.correct ? "answer correct" : "answer wrong") : "answer selected") : submitted && answerIndex === item.correct ? "answer correct" : "answer"} onClick={() => setAnswers({ ...answers, [index]: answerIndex })}>{String.fromCharCode(65 + answerIndex)}<em>{answer}</em></button>)}</div></div>)}<div className="quiz-footer">{submitted ? <div className="result">{score === 3 ? "Excellent work! " : "Nice effort! "}<b>{score}/3 correct</b> · Your progress has been updated.</div> : <span>{Object.keys(answers).length}/3 answered</span>}<button className="primary" disabled={Object.keys(answers).length !== 3 || submitted} onClick={() => setSubmitted(true)}>{submitted ? "Completed ✓" : "Check answers"}</button></div></section>
      </>}
      {page === "progress" && <ProgressView />}
      {page === "admin" && <AdminView video={video} upload={upload} publish={publishVideo} notify={showToast} student={student} setStudent={setStudent} />}
    </main>
    {toast && <div className="toast">✓ {toast}</div>}
  </div>;
}

function StudentLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("Class 7");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [newId, setNewId] = useState("");
  const submit = async () => {
    setError("");
    try {
      const endpoint = mode === "create" ? "/api/student/register" : "/api/student/login";
      const data = mode === "create" ? { name, email, password, grade } : { studentId: email, password };
      const result = await api.post(endpoint, data, { _skipAuthRedirect: true });
      localStorage.setItem("student_token", result.data.token);
      if (mode === "create") { setNewId(result.data.user.mobile); setMode("created"); return; }
      onLogin(result.data.user);
    } catch (err) { setError(err.response?.data?.message || err.message || "Could not sign in. Please try again."); }
  };
  const google = async (response) => {
    try { const result = await api.post("/api/student/google", { idToken: response.credential }, { _skipAuthRedirect: true }); localStorage.setItem("student_token", result.data.token); onLogin(result.data.user); }
    catch (err) { setError(err.response?.data?.message || "Google sign-in failed. Please try again."); }
  };
  if (mode === "created") return <div className="student-login"><Link to="/" className="brand"><span>✦</span> smartboard<span className="brand-dot">.</span></Link><div className="id-created"><span>✓</span><p className="kicker">STUDENT ACCOUNT CREATED</p><h1>Welcome, {name}!</h1><p>Your permanent Student ID is</p><b>{newId}</b><small>Save this ID. You’ll use it with your password to sign in.</small><button className="primary" onClick={() => onLogin({ name, mobile: newId, boardPreference: grade })}>Start learning →</button></div></div>;
  return <div className="student-login"><Link to="/" className="brand"><span>✦</span> smartboard<span className="brand-dot">.</span></Link><div className="login-card"><div className="login-art">✦<span>Learn. Practice.<br />Grow.</span></div><div className="login-form"><p className="kicker">STUDENT PORTAL</p><h1>{mode === "create" ? "Create your Student ID" : "Welcome back!"}</h1><p>{mode === "create" ? "Your ID is created instantly and works across SmartBoard Learn." : "Sign in with your Student ID to continue learning."}</p>{error && <div className="student-error">{error}</div>}{mode === "create" && <><label>Full name<input value={name} onChange={e => setName(e.target.value)} placeholder="Aarav Sharma" /></label><label>Class<select value={grade} onChange={e => setGrade(e.target.value)}>{[5,6,7,8,9,10].map(n => <option key={n}>Class {n}</option>)}</select></label><label>Email<input value={email} onChange={e => setEmail(e.target.value)} placeholder="aarav@school.edu" /></label></>}<label>{mode === "create" ? "Create password" : "Student ID"}<input value={mode === "create" ? password : email} onChange={e => mode === "create" ? setPassword(e.target.value) : setEmail(e.target.value)} type={mode === "create" ? "password" : "text"} placeholder={mode === "create" ? "Minimum 6 characters" : "SB-XXXXXXXX"} /></label>{mode === "login" && <label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" /></label>}<button className="primary" onClick={submit}>{mode === "create" ? "Create Student ID →" : "Sign in to learn →"}</button><div className="login-or"><span />or continue with<span /></div><div className="student-google"><GoogleLogin onSuccess={google} onError={() => setError("Google sign-in was cancelled.")} width="300" text="continue_with" /></div><button className="demo-login" onClick={() => onLogin({ name: "Aarav Sharma", boardPreference: "Class 7" })}>Use demo student account</button><small>{mode === "login" ? <>New student? <button onClick={() => { setMode("create"); setError(""); }}>Create your Student ID</button></> : <>Already have a Student ID? <button onClick={() => { setMode("login"); setError(""); }}>Sign in</button></>}<br />For teachers &amp; admins: <Link to="/login">sign in here</Link></small></div></div></div>
}

function ProgressView() { return <div className="simple-page"><p className="kicker">MY PROGRESS</p><h1>You’re building a great habit.</h1><div className="metric-cards"><Metric value="8" label="Day streak" icon="🔥" /><Metric value="14" label="Lessons completed" icon="▶" /><Metric value="82%" label="Average quiz score" icon="✦" /></div><div className="progress-panel"><h2>Subject progress</h2><div><span>Mathematics</span><b>62%</b><i><em style={{ width: "62%" }} /></i></div><div><span>Science</span><b>38%</b><i><em style={{ width: "38%" }} /></i></div></div></div> }
function Metric({ value, label, icon }) { return <div className="metric"><span>{icon}</span><b>{value}</b><p>{label}</p></div> }
function AdminView({ video, upload, publish, notify, student, setStudent }) { return <div className="simple-page admin-page"><p className="kicker">DEMO CAMPUS · ADMIN</p><h1>Content &amp; learning analytics</h1><p className="muted">Manage lesson videos and see how students are learning.</p><div className="metric-cards"><Metric value="126" label="Active students" icon="◉" /><Metric value="74%" label="Lesson completion" icon="↗" /><Metric value="8.4m" label="Avg. watch time" icon="◷" /></div><div className="admin-grid"><section className="upload-panel"><p className="eyebrow">VIDEO LIBRARY</p><h2>Upload a sample lesson</h2><p>Choose the video, then publish it permanently to your Railway Bucket.</p><label className="dropzone"><input type="file" accept="video/*" onChange={upload} /><span>↑</span><b>{video ? video.name : "Choose a video file"}</b><small>{video?.file ? `${Math.round(video.size / 1024 / 1024 * 10) / 10} MB · ready to publish` : "MP4, WebM or MOV · up to 2 GB"}</small></label><button className="secondary" onClick={publish}>Publish to demo</button></section><section className="analytics-panel"><p className="eyebrow">CHAPTER PERFORMANCE</p><h2>Where learners need support</h2>{[["Fractions Made Easy", "86%", "#6d5dfc"], ["Numbers & Patterns", "74%", "#0d9d88"], ["Algebra Basics", "58%", "#f59e0b"]].map(([name, value, color]) => <div className="performance" key={name}><div><span>{name}</span><b>{value} completion</b></div><i><em style={{ width: value, background: color }} /></i></div>)}<button className="text-button" onClick={() => setStudent(student === "Aarav Sharma" ? "Meera Patel" : "Aarav Sharma")}>Preview as another student →</button></section></div></div> }

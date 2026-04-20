import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "📘",
    title: "AI Lesson Plan Generator",
    desc: "Generate detailed, curriculum-aligned lesson plans in under 30 seconds. Works for Class 1–12, all subjects, CBSE / ICSE / State Board.",
    color: "#2563eb",
  },
  {
    icon: "📝",
    title: "Question Paper Generator",
    desc: "Build complete question papers with MCQ, short & long answers, marks allocation and auto answer key. Export to PDF instantly.",
    color: "#7c3aed",
  },
  {
    icon: "📄",
    title: "Report Card Remarks",
    desc: "AI-written personalised remarks for every student based on performance, attendance and behaviour. Hindi & English supported.",
    color: "#059669",
  },
  {
    icon: "✅",
    title: "Attendance Manager",
    desc: "Mark daily attendance, generate monthly reports, track trends and export PDF registers — no manual registers needed.",
    color: "#d97706",
  },
  {
    icon: "📢",
    title: "Notice & Circular Generator",
    desc: "Create professional school notices and circulars in seconds using 12+ ready templates. Download as PDF or share directly.",
    color: "#dc2626",
  },
  {
    icon: "🗓️",
    title: "Timetable Builder",
    desc: "Build weekly class timetables with a drag-and-fill grid. Export to PDF, Excel or Word in one click.",
    color: "#0891b2",
  },
  {
    icon: "📖",
    title: "Syllabus Tracker",
    desc: "Track chapter completion across all subjects and classes. Know exactly what's covered and what's pending at a glance.",
    color: "#65a30d",
  },
  {
    icon: "💡",
    title: "Doubt Solver",
    desc: "Instantly solve student doubts in any subject. AI explains concepts in simple language — perfect for homework help.",
    color: "#9333ea",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    color: "#2563eb",
    cta: "Get Started Free",
    features: [
      "3 lesson plans / day",
      "2 assessments / day",
      "2 notices / day",
      "1 report card / day",
      "Attendance manager",
      "Syllabus & homework tracker",
      "Exam schedule",
    ],
  },
  {
    name: "PRO",
    price: "₹199",
    period: "per month",
    color: "#7c3aed",
    badge: "Most Popular",
    cta: "Upgrade to PRO",
    features: [
      "Unlimited lesson plans",
      "Unlimited assessments",
      "Unlimited notices",
      "Unlimited report cards",
      "Monthly planner",
      "Timetable builder",
      "Doubt solver",
      "Priority support",
    ],
  },
  {
    name: "School",
    price: "Custom",
    period: "per school",
    color: "#059669",
    cta: "Register Your School",
    href: "/school-register",
    features: [
      "All PRO features",
      "Up to unlimited teachers",
      "School admin dashboard",
      "7-day free trial",
      "Centralised billing",
      "Dedicated support",
    ],
  },
];

const FAQS = [
  {
    q: "Is SmartBoard AI free for teachers?",
    a: "Yes. The FREE plan includes 3 lesson plans, 2 assessments, 2 notices and 1 report card per day. No credit card required — sign up in 30 seconds.",
  },
  {
    q: "Which boards does SmartBoard AI support?",
    a: "SmartBoard AI supports CBSE, ICSE, and all State Boards including Bihar Board, UP Board, Maharashtra Board, and more. Content is generated in both Hindi and English.",
  },
  {
    q: "Can my entire school use SmartBoard AI?",
    a: "Yes. Schools get a 7-day free trial for up to 5 teachers. After the trial, contact us for a custom school plan with unlimited teachers.",
  },
  {
    q: "Does it work on mobile?",
    a: "Yes. SmartBoard AI is fully responsive and works on any smartphone, tablet or computer. No app download needed — just open smartboard.co.in in your browser.",
  },
  {
    q: "Is student data safe?",
    a: "Absolutely. All data is encrypted and stored securely. We never share your data with third parties. Read our Privacy Policy for full details.",
  },
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "sans-serif", color: "#1e293b", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontWeight: 800, fontSize: 20, color: "#1e3a8a" }}>🎓 SmartBoard AI</span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="#features" style={{ color: "#475569", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>Features</a>
          <a href="#pricing" style={{ color: "#475569", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>Pricing</a>
          <a href="#faq" style={{ color: "#475569", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>FAQ</a>
          <Link to="/login" style={{
            background: "#2563eb", color: "#fff", padding: "8px 20px",
            borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 14,
          }}>Sign In</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 60%, #1e40af 100%)",
        padding: "80px 24px 100px",
        textAlign: "center",
      }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 18px", marginBottom: 24 }}>
          <span style={{ color: "#bfdbfe", fontSize: 13, fontWeight: 600 }}>🇮🇳 Built for Indian Schools · CBSE · ICSE · State Board</span>
        </div>
        <h1 style={{
          fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 900, color: "#fff",
          lineHeight: 1.15, margin: "0 auto 24px", maxWidth: 800,
        }}>
          Save Hours of Teaching Work<br />
          <span style={{ color: "#93c5fd" }}>Every Single Day</span>
        </h1>
        <p style={{
          fontSize: "clamp(16px, 2.5vw, 22px)", color: "rgba(255,255,255,0.8)",
          maxWidth: 620, margin: "0 auto 40px", lineHeight: 1.6,
        }}>
          AI-powered lesson plans, question papers, report card remarks,
          attendance and notices — in seconds, not hours.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/login" style={{
            background: "#fff", color: "#1e3a8a", padding: "16px 36px",
            borderRadius: 12, fontWeight: 800, fontSize: 17, textDecoration: "none",
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          }}>
            Start Free — No Credit Card
          </Link>
          <Link to="/school-register" style={{
            background: "rgba(255,255,255,0.15)", color: "#fff", padding: "16px 36px",
            borderRadius: 12, fontWeight: 700, fontSize: 17, textDecoration: "none",
            border: "1.5px solid rgba(255,255,255,0.3)",
          }}>
            Register Your School →
          </Link>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap",
          marginTop: 64, paddingTop: 40, borderTop: "1px solid rgba(255,255,255,0.15)",
        }}>
          {[
            { value: "10,000+", label: "Teachers Registered" },
            { value: "50,000+", label: "Lessons Generated" },
            { value: "500+", label: "Schools Onboarded" },
            { value: "4.8 ★", label: "Average Rating" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#fff" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "80px 24px", background: "#f8fafc", textAlign: "center" }}>
        <p style={{ color: "#2563eb", fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Simple & Fast</p>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, margin: "0 0 48px" }}>How It Works</h2>
        <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap", maxWidth: 900, margin: "0 auto" }}>
          {[
            { step: "1", icon: "📝", title: "Choose Your Tool", desc: "Pick from lesson plans, question papers, report cards, notices or any other tool." },
            { step: "2", icon: "⚡", title: "Fill in Details", desc: "Enter class, subject, topic and any preferences. Takes less than 30 seconds." },
            { step: "3", icon: "📥", title: "Download & Use", desc: "Get professional-quality content instantly. Download as PDF, Word or Excel." },
          ].map(s => (
            <div key={s.step} style={{
              flex: "1 1 240px", maxWidth: 280,
              background: "#fff", borderRadius: 16, padding: "32px 24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "#eff6ff", color: "#2563eb",
                fontSize: 20, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>{s.step}</div>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{s.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "80px 24px", textAlign: "center" }}>
        <p style={{ color: "#7c3aed", fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Everything You Need</p>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, margin: "0 0 12px" }}>
          8 Powerful Tools for Teachers
        </h2>
        <p style={{ color: "#64748b", fontSize: 16, margin: "0 auto 48px", maxWidth: 560 }}>
          All the tools a teacher needs in one place — no switching between apps.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 24, maxWidth: 1100, margin: "0 auto",
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: "#fff", borderRadius: 16, padding: "28px 24px",
              border: "1px solid #e2e8f0", textAlign: "left",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              transition: "box-shadow 0.2s",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: f.color + "14", fontSize: 26,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px", color: "#1e293b" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "80px 24px", background: "#f8fafc", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 800, margin: "0 0 48px" }}>
          Loved by Teachers Across India
        </h2>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", maxWidth: 1000, margin: "0 auto" }}>
          {[
            { name: "Sunita Sharma", school: "Delhi Public School, Patna", text: "SmartBoard AI has saved me at least 2 hours every day. The lesson plans are exactly what I need for my Class 8 students.", stars: 5 },
            { name: "Rajesh Kumar", school: "Kendriya Vidyalaya, Ranchi", text: "The question paper generator is incredible. I created a full 80-mark Science paper with answer key in 3 minutes!", stars: 5 },
            { name: "Priya Mishra", school: "St. Xavier's School, Lucknow", text: "Report card remarks used to take me a whole day. Now I finish the entire class in 20 minutes. Absolutely love it.", stars: 5 },
          ].map(t => (
            <div key={t.name} style={{
              flex: "1 1 280px", maxWidth: 320,
              background: "#fff", borderRadius: 16, padding: "28px 24px",
              border: "1px solid #e2e8f0", textAlign: "left",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}>
              <div style={{ color: "#f59e0b", fontSize: 18, marginBottom: 12 }}>{"★".repeat(t.stars)}</div>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: "0 0 20px", fontStyle: "italic" }}>"{t.text}"</p>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{t.school}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "80px 24px", textAlign: "center" }}>
        <p style={{ color: "#059669", fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Simple Pricing</p>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, margin: "0 0 12px" }}>Start Free, Upgrade Anytime</h2>
        <p style={{ color: "#64748b", margin: "0 auto 48px", maxWidth: 500 }}>
          No hidden fees. Cancel anytime. Pay via UPI, debit card or net banking.
        </p>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", maxWidth: 980, margin: "0 auto" }}>
          {PLANS.map(p => (
            <div key={p.name} style={{
              flex: "1 1 260px", maxWidth: 300,
              background: p.badge ? `linear-gradient(135deg, ${p.color}14, ${p.color}08)` : "#fff",
              borderRadius: 20, padding: "36px 28px",
              border: p.badge ? `2px solid ${p.color}` : "1px solid #e2e8f0",
              boxShadow: p.badge ? `0 8px 32px ${p.color}20` : "0 2px 12px rgba(0,0,0,0.05)",
              position: "relative",
            }}>
              {p.badge && (
                <div style={{
                  position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                  background: p.color, color: "#fff", padding: "4px 18px", borderRadius: 20,
                  fontSize: 12, fontWeight: 700,
                }}>{p.badge}</div>
              )}
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 44, fontWeight: 900, color: p.color, lineHeight: 1.1 }}>{p.price}</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 28 }}>{p.period}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", textAlign: "left" }}>
                {p.features.map(f => (
                  <li key={f} style={{ fontSize: 14, color: "#475569", padding: "6px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: p.color, fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                to={p.href || "/login"}
                style={{
                  display: "block", background: p.badge ? p.color : "transparent",
                  color: p.badge ? "#fff" : p.color,
                  border: `2px solid ${p.color}`,
                  padding: "12px", borderRadius: 10, textDecoration: "none",
                  fontWeight: 700, fontSize: 15, textAlign: "center",
                }}
              >{p.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ color: "#2563eb", fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>FAQ</p>
          <h2 style={{ fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 800, margin: "0 0 40px", textAlign: "center" }}>Frequently Asked Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {FAQS.map(f => (
              <details key={f.q} style={{
                background: "#fff", borderRadius: 12, padding: "20px 24px",
                border: "1px solid #e2e8f0",
              }}>
                <summary style={{ fontWeight: 700, fontSize: 16, cursor: "pointer", color: "#1e293b", listStyle: "none", display: "flex", justifyContent: "space-between" }}>
                  {f.q} <span style={{ color: "#94a3b8", fontWeight: 400 }}>＋</span>
                </summary>
                <p style={{ margin: "14px 0 0", fontSize: 14, color: "#64748b", lineHeight: 1.7 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        background: "linear-gradient(135deg, #1e3a8a, #3730a3)",
        padding: "80px 24px", textAlign: "center",
      }}>
        <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 900, color: "#fff", margin: "0 0 16px" }}>
          Ready to Save Time Every Day?
        </h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 18, margin: "0 auto 40px", maxWidth: 500 }}>
          Join thousands of Indian teachers who use SmartBoard AI to work smarter.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/login" style={{
            background: "#fff", color: "#1e3a8a", padding: "16px 40px",
            borderRadius: 12, fontWeight: 800, fontSize: 17, textDecoration: "none",
          }}>
            Get Started Free →
          </Link>
          <Link to="/school-register" style={{
            background: "transparent", color: "#fff", padding: "16px 40px",
            borderRadius: 12, fontWeight: 700, fontSize: 17, textDecoration: "none",
            border: "1.5px solid rgba(255,255,255,0.4)",
          }}>
            Register Your School
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#0f172a", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", marginBottom: 16 }}>🎓 SmartBoard AI</div>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
            {[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
              { label: "Privacy Policy", to: "/privacy" },
              { label: "Terms & Conditions", to: "/terms" },
              { label: "School Register", to: "/school-register" },
            ].map(l => l.to ? (
              <Link key={l.label} to={l.to} style={{ color: "#94a3b8", fontSize: 13, textDecoration: "none" }}>{l.label}</Link>
            ) : (
              <a key={l.label} href={l.href} style={{ color: "#94a3b8", fontSize: 13, textDecoration: "none" }}>{l.label}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 20 }}>
            <a href="mailto:support@smartboard.co.in" style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>support@smartboard.co.in</a>
            <a href="tel:+918789225125" style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>+91 8789225125</a>
          </div>
          <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>
            © 2026 SmartBoard AI · Made with ❤️ for Indian teachers
          </p>
        </div>
      </footer>

    </div>
  );
}

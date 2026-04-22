import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate
} from "react-router-dom";
import { useEffect } from "react";

import Dashboard from "./pages/Dashboard";
import GenerateLesson from "./pages/GenerateLesson";
import LessonHistory from "./pages/LessonHistory";
import Profile from "./pages/Profile";
import AssessmentGenerator from "./pages/AssessmentGenerator";
import MonthlyPlanner from "./pages/MonthlyPlanner";
import AttendanceManager from "./pages/AttendanceManager";
import ReportCard from "./pages/ReportCard";
import NoticeGenerator from "./pages/NoticeGenerator";
import TimetableBuilder from "./pages/TimetableBuilder";
import UpgradePlan from "./pages/UpgradePlan";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import DoubtSolver from "./pages/DoubtSolver";
import SchoolRegister from "./pages/SchoolRegister";
import SchoolAdminDashboard from "./pages/SchoolAdminDashboard";
import SyllabusTracker from "./pages/SyllabusTracker";
import ExamSchedule from "./pages/ExamSchedule";
import HomeworkTracker from "./pages/HomeworkTracker";
import ParentPortal from "./pages/ParentPortal";
import ResetPassword from "./pages/ResetPassword";
import LandingPage from "./pages/LandingPage";
import FormatFiller from "./pages/FormatFiller";

function getRoleFromToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).role;
  } catch { return null; }
}

function AppRoutes() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");
  const role = getRoleFromToken();

  useEffect(() => {
    const handle = () => navigate("/login", { replace: true });
    window.addEventListener("auth:logout", handle);
    return () => window.removeEventListener("auth:logout", handle);
  }, [navigate]);

  return (
    <Routes>

        {/* LOGIN / REGISTER */}
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to={role === "SCHOOL_ADMIN" ? "/school-admin" : "/dashboard"} replace />
            ) : (
              <AuthPage />
            )
          }
        />

        {/* SCHOOL REGISTER */}
        <Route path="/school-register" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <SchoolRegister />} />

        {/* SCHOOL ADMIN DASHBOARD */}
        <Route path="/school-admin" element={<ProtectedRoute><SchoolAdminDashboard /></ProtectedRoute>} />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* LESSON */}
        <Route
          path="/lesson"
          element={
            <ProtectedRoute>
              <GenerateLesson />
            </ProtectedRoute>
          }
        />

        {/* HISTORY */}
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <LessonHistory />
            </ProtectedRoute>
          }
        />

        {/* ASSESSMENT */}
        <Route
          path="/assessment"
          element={
            <ProtectedRoute>
              <AssessmentGenerator />
            </ProtectedRoute>
          }
        />

        {/* ATTENDANCE */}
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <AttendanceManager />
            </ProtectedRoute>
          }
        />

        {/* MONTHLY PLANNER */}
        <Route
          path="/planner"
          element={
            <ProtectedRoute>
              <MonthlyPlanner />
            </ProtectedRoute>
          }
        />

        {/* REPORT CARD */}
        <Route
          path="/report-card"
          element={
            <ProtectedRoute>
              <ReportCard />
            </ProtectedRoute>
          }
        />

        {/* NOTICE GENERATOR */}
        <Route
          path="/notice"
          element={
            <ProtectedRoute>
              <NoticeGenerator />
            </ProtectedRoute>
          }
        />

        {/* TIMETABLE */}
        <Route
          path="/timetable"
          element={
            <ProtectedRoute>
              <TimetableBuilder />
            </ProtectedRoute>
          }
        />

        {/* PROFILE */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* UPGRADE PLAN */}
        <Route
          path="/upgrade"
          element={
            <ProtectedRoute>
              <UpgradePlan />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* SYLLABUS TRACKER */}
        <Route path="/syllabus" element={<ProtectedRoute><SyllabusTracker /></ProtectedRoute>} />

        {/* EXAM SCHEDULE */}
        <Route path="/exam" element={<ProtectedRoute><ExamSchedule /></ProtectedRoute>} />

        {/* HOMEWORK TRACKER */}
        <Route path="/homework" element={<ProtectedRoute><HomeworkTracker /></ProtectedRoute>} />

        {/* PARENT PORTAL */}
        <Route path="/parents" element={<ProtectedRoute><ParentPortal /></ProtectedRoute>} />

        {/* DOUBT SOLVER */}
        <Route path="/doubt" element={<ProtectedRoute><DoubtSolver /></ProtectedRoute>} />

        {/* FORMAT FILLER */}
        <Route path="/format-filler" element={<ProtectedRoute><FormatFiller /></ProtectedRoute>} />

        {/* RESET PASSWORD */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* PUBLIC LEGAL PAGES */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* ROOT + FALLBACK */}
        <Route
          path="/"
          element={
            isLoggedIn
              ? <Navigate to={role === "SCHOOL_ADMIN" ? "/school-admin" : "/dashboard"} replace />
              : <LandingPage />
          }
        />
        <Route
          path="*"
          element={
            <Navigate to={isLoggedIn ? (role === "SCHOOL_ADMIN" ? "/school-admin" : "/dashboard") : "/login"} replace />
          }
        />

      </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

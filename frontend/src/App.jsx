import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

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
import WorksheetGenerator from "./pages/WorksheetGenerator";
import DoubtSolver from "./pages/DoubtSolver";

export default function App() {
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN / REGISTER */}
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthPage />
            )
          }
        />

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

        {/* WORKSHEET */}
        <Route path="/worksheet" element={<ProtectedRoute><WorksheetGenerator /></ProtectedRoute>} />

        {/* DOUBT SOLVER */}
        <Route path="/doubt" element={<ProtectedRoute><DoubtSolver /></ProtectedRoute>} />

        {/* PUBLIC LEGAL PAGES */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* FALLBACK */}
        <Route
          path="*"
          element={
            <Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

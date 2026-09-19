import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import CitizenPortal from "./pages/CitizenPortal";
import CommandCenter from "./pages/CommandCenter";
import ComplaintsAnalysisPage from "./pages/ComplaintsAnalysisPage";
import PipelineTracePage from "./pages/PipelineTracePage";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { FloatingCornerThemeToggle } from "./components/ThemeToggle";

const RECENT_KEY = "civicpulse_recent_submissions";

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === "/";

  const onSubmitted = (submissionId: string) => {
    const recent: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    localStorage.setItem(RECENT_KEY, JSON.stringify([submissionId, ...recent].slice(0, 10)));
    navigate("/pipeline");
  };

  return (
    <div
      className={
        isLanding
          ? "min-h-screen bg-black text-white selection:bg-blue-500/30"
          : "min-h-screen bg-transparent flex flex-col text-slate-900 dark:text-white selection:bg-blue-500/20 relative"
      }
    >
      {!isLanding && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />

          {/* Citizen Portal (Protected for Citizens) */}
          <Route
            path="/citizen"
            element={
              <ProtectedRoute allowedRole="citizen">
                <CitizenPortal onSubmitted={onSubmitted} />
              </ProtectedRoute>
            }
          />

          {/* Govt Authority Portal (Protected for Govt Authorities) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="authority">
                <CommandCenter />
              </ProtectedRoute>
            }
          />

          {/* Govt Authority Complaints Analysis & Status Management */}
          <Route
            path="/admin/analysis"
            element={
              <ProtectedRoute allowedRole="authority">
                <ComplaintsAnalysisPage />
              </ProtectedRoute>
            }
          />

          {/* Live AI Trace (Accessible to both roles, role-aware) */}
          <Route path="/pipeline" element={<PipelineTracePage />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Theme Changing Floating Button At Corner (hidden on landing page) */}
      {!isLanding && <FloatingCornerThemeToggle />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

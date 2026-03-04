import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import Login from "./pages/Login";
import SelectRole from "./pages/SelectRole";
import DoctorDashboard from "./pages/DoctorDashboard";
import AddPatient from "./pages/AddPatient";
import PatientDetail from "./pages/PatientDetail";
import PatientHome from "./pages/PatientHome";
import ResetPassword from "./pages/ResetPassword";
import Compare from "./pages/Compare";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: string }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/select-role" replace />;
  if (allowedRole && role !== allowedRole) {
    const home = role === "patient" ? "/patient/home" : "/doctor-dashboard";
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/select-role" element={<SelectRole />} />
              <Route path="/doctor-dashboard" element={<ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
              <Route path="/add-patient" element={<ProtectedRoute allowedRole="doctor"><AddPatient /></ProtectedRoute>} />
              <Route path="/patient/:id" element={<ProtectedRoute allowedRole="doctor"><PatientDetail /></ProtectedRoute>} />
              <Route path="/patient/home" element={<ProtectedRoute allowedRole="patient"><PatientHome /></ProtectedRoute>} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
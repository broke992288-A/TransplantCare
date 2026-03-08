import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useRealtimeInvalidation } from "@/hooks/useRealtimeInvalidation";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ErrorBoundary } from "@/components/features/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/features/RouteErrorBoundary";
import { handleError } from "@/utils/errorHandler";
import Login from "./pages/Login";
import SelectRole from "./pages/SelectRole";
import DoctorDashboard from "./pages/DoctorDashboard";
import AddPatient from "./pages/AddPatient";
import PatientDetail from "./pages/PatientDetail";
import PatientHome from "./pages/PatientHome";
import PatientProfile from "./pages/PatientProfile";
import ResetPassword from "./pages/ResetPassword";
import Compare from "./pages/Compare";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import Medications from "./pages/Medications";
import PatientMedications from "./pages/PatientMedications";
import Patients from "./pages/Patients";
import DemoSetup from "./pages/DemoSetup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.skipGlobalError) return;
      handleError(error, `Query [${query.queryKey[0]}]`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      handleError(error, "Mutation");
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

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

function DoctorOrAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/select-role" replace />;
  if (!["doctor", "admin", "support"].includes(role)) return <Navigate to="/patient/home" replace />;
  return <>{children}</>;
}

function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeInvalidation();
  useSessionTimeout();
  return <>{children}</>;
}

/** Wrap each route content in a route-level error boundary */
function RouteWrap({ children }: { children: React.ReactNode }) {
  return <RouteErrorBoundary>{children}</RouteErrorBoundary>;
}

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RealtimeProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/select-role" element={<SelectRole />} />
              <Route path="/doctor-dashboard" element={<DoctorOrAdminRoute><RouteWrap><DoctorDashboard /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/add-patient" element={<DoctorOrAdminRoute><RouteWrap><AddPatient /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/patient/:id" element={<DoctorOrAdminRoute><RouteWrap><PatientDetail /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/patients" element={<DoctorOrAdminRoute><RouteWrap><Patients /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/analytics" element={<DoctorOrAdminRoute><RouteWrap><Analytics /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/reports" element={<DoctorOrAdminRoute><RouteWrap><Reports /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/alerts" element={<DoctorOrAdminRoute><RouteWrap><Alerts /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/medications" element={<DoctorOrAdminRoute><RouteWrap><Medications /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/patient/:id/medications" element={<DoctorOrAdminRoute><RouteWrap><PatientMedications /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/demo-setup" element={<DoctorOrAdminRoute><RouteWrap><DemoSetup /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/patient/home" element={<ProtectedRoute allowedRole="patient"><RouteWrap><PatientProfile /></RouteWrap></ProtectedRoute>} />
              <Route path="/compare" element={<DoctorOrAdminRoute><RouteWrap><Compare /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </RealtimeProvider>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

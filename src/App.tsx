import { Suspense, lazy } from "react";
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

// Lazy-loaded pages for code splitting
const Login = lazy(() => import("./pages/Login"));
const SelectRole = lazy(() => import("./pages/SelectRole"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));
const AddPatient = lazy(() => import("./pages/AddPatient"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const PatientProfile = lazy(() => import("./pages/PatientProfile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Compare = lazy(() => import("./pages/Compare"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Medications = lazy(() => import("./pages/Medications"));
const PatientMedications = lazy(() => import("./pages/PatientMedications"));
const Patients = lazy(() => import("./pages/Patients"));
const DemoSetup = lazy(() => import("./pages/DemoSetup"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Install = lazy(() => import("./pages/Install"));
const DocumentationPDF = lazy(() => import("./pages/DocumentationPDF"));

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

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: string }) {
  const { user, role, loading } = useAuth();
  if (loading) return <PageLoader />;
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
  if (loading) return <PageLoader />;
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
            <Suspense fallback={<PageLoader />}>
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
              {/* Legacy alias — redirect to canonical /patient/home */}
              <Route path="/patient/profile" element={<Navigate to="/patient/home" replace />} />
              <Route path="/compare" element={<DoctorOrAdminRoute><RouteWrap><Compare /></RouteWrap></DoctorOrAdminRoute>} />
              <Route path="/documentation" element={<DocumentationPDF />} />
              <Route path="/install" element={<Install />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </RealtimeProvider>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

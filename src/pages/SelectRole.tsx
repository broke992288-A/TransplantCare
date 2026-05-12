import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User } from "lucide-react";
import organsImg from "@/assets/organs.png";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { registerPatientSelf } from "@/services/authService";

export default function SelectRole() {
  const { user, role, refreshRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [registering, setRegistering] = useState(false);

  const getRoleRedirect = (r: string) => {
    switch (r) {
      case "doctor": return "/doctor-dashboard";
      case "patient": return "/patient/home";
      case "support": return "/doctor-dashboard";
      case "admin": return "/doctor-dashboard";
      default: return "/login";
    }
  };

  // If user already has a role assigned, send them straight to their dashboard.
  // Roles are strictly one-per-account — no role switching.
  useEffect(() => {
    if (!authLoading && user && role) {
      navigate(getRoleRedirect(role), { replace: true });
    }
  }, [authLoading, user, role, navigate]);

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  if (authLoading || role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const handlePatientRegister = async () => {
    setRegistering(true);
    try {
      const meta = user.user_metadata || {};
      await registerPatientSelf({
        fullName: meta.full_name || user.email || "",
        phone: meta.phone || null,
      });
      await refreshRole();
      navigate("/patient/home", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
      setRegistering(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <img src={organsImg} alt="Logo" className="h-20 w-40 rounded-2xl object-contain" />
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to TransplantCare</h1>
            <p className="mt-1 text-muted-foreground">Continue as a patient</p>
          </div>
        </div>

        <Card
          className="group cursor-pointer border-2 border-transparent transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
          onClick={() => !registering && handlePatientRegister()}
        >
          <CardHeader className="items-center text-center pb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {registering ? <Loader2 className="h-7 w-7 animate-spin" /> : <User className="h-7 w-7" />}
            </div>
            <CardTitle className="text-base mt-3">Patient Portal</CardTitle>
          </CardHeader>
          <CardContent className="text-center px-3">
            <CardDescription className="text-xs">
              View your health status, lab results, and care timeline
            </CardDescription>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          {t("role.contactAdmin") || "Shifokor, support yoki admin roli kerak bo'lsa, administrator bilan bog'laning. Har bir hisob faqat bitta rolga ega bo'la oladi."}
        </p>
      </div>
    </div>
  );
}

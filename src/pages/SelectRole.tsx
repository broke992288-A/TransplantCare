import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import type { AppRole } from "@/types/roles";
import { registerPatientSelf } from "@/services/authService";

export default function SelectRole() {
  const { user, role, setUserRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [selecting, setSelecting] = useState(false);

  const getRoleRedirect = (r: AppRole) => {
    switch (r) { case "doctor": return "/doctor-dashboard"; case "patient": return "/patient/home"; case "support": return "/doctor-dashboard"; case "admin": return "/doctor-dashboard"; }
  };

  useEffect(() => { if (!authLoading && role) navigate(getRoleRedirect(role), { replace: true }); }, [role, authLoading, navigate]);
  if (!user) { navigate("/login", { replace: true }); return null; }

  const handleSelect = async () => {
    setSelecting(true);
    try {
      await setUserRole("patient");
      const meta = user.user_metadata || {};
      await registerPatientSelf({
        fullName: meta.full_name || user.email || "",
        phone: meta.phone || null,
      });
      navigate(getRoleRedirect("patient"), { replace: true });
    }
    catch (err: any) { toast({ title: t("common.error"), description: err.message, variant: "destructive" }); setSelecting(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25"><Heart className="h-7 w-7 text-primary-foreground" /></div>
          <div className="text-center"><h1 className="text-3xl font-bold tracking-tight">{t("role.welcome")}</h1><p className="mt-1 text-muted-foreground">{t("role.patientDesc")}</p></div>
        </div>
        <Card className="group cursor-pointer border-2 border-transparent transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10" onClick={() => !selecting && handleSelect()}>
          <CardHeader className="items-center text-center pb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {selecting ? <Loader2 className="h-8 w-8 animate-spin" /> : <User className="h-8 w-8" />}
            </div>
            <CardTitle className="text-lg mt-3">{t("role.patient")}</CardTitle>
          </CardHeader>
          <CardContent className="text-center"><CardDescription>{t("role.patientDesc")}</CardDescription></CardContent>
        </Card>
        <p className="text-xs text-center text-muted-foreground">
          {t("role.contactAdmin") || "Shifokor yoki admin roli kerak bo'lsa, administrator bilan bog'laning."}
        </p>
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Stethoscope, HeadsetIcon, ShieldCheck } from "lucide-react";
import organsImg from "@/assets/organs.png";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { registerPatientSelf } from "@/services/authService";
import type { AppRole } from "@/types/roles";

const ROLE_META: Record<AppRole, { icon: typeof User; title: string; desc: string; redirect: string }> = {
  doctor:  { icon: Stethoscope, title: "Doctor / Healthcare Provider", desc: "Manage patients, review risks, and oversee transplant care", redirect: "/doctor-dashboard" },
  patient: { icon: User,        title: "Patient Portal", desc: "View your health status, lab results, and care timeline", redirect: "/patient/home" },
  support: { icon: HeadsetIcon, title: "Support",       desc: "Help users with issues and manage support requests", redirect: "/doctor-dashboard" },
  admin:   { icon: ShieldCheck, title: "Administrator", desc: "Full system management, users and settings", redirect: "/doctor-dashboard" },
};

export default function SelectRole() {
  const { user, role, refreshRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const confirmRole = (r: AppRole) => {
    sessionStorage.setItem("roleConfirmed", r);
    navigate(ROLE_META[r].redirect, { replace: true });
  };

  const handlePatientRegister = async () => {
    setBusy(true);
    try {
      const meta = user.user_metadata || {};
      await registerPatientSelf({
        fullName: meta.full_name || user.email || "",
        phone: meta.phone || null,
      });
      await refreshRole();
      confirmRole("patient");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
      setBusy(false);
    }
  };

  // User already has an assigned role → require manual confirmation
  if (role) {
    const meta = ROLE_META[role];
    const Icon = meta.icon;
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-3">
            <img src={organsImg} alt="Logo" className="h-20 w-40 rounded-2xl object-contain" />
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">Welcome to TransplantCare</h1>
              <p className="mt-1 text-muted-foreground">Confirm your role to continue</p>
            </div>
          </div>

          <Card
            className="group cursor-pointer border-2 border-transparent transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
            onClick={() => confirmRole(role)}
          >
            <CardHeader className="items-center text-center pb-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-7 w-7" />
              </div>
              <CardTitle className="text-base mt-3">{meta.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center px-3">
              <CardDescription className="text-xs">{meta.desc}</CardDescription>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            Har bir hisob faqat bitta rolga ega. Davom etish uchun rolingizni tasdiqlang.
          </p>
        </div>
      </div>
    );
  }

  // No role yet → only Patient self-registration is allowed
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
          onClick={() => !busy && handlePatientRegister()}
        >
          <CardHeader className="items-center text-center pb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <User className="h-7 w-7" />}
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
          {t("role.contactAdmin") || "Shifokor, support yoki admin roli kerak bo'lsa, administrator bilan bog'laning."}
        </p>
      </div>
    </div>
  );
}

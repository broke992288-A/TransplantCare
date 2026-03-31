import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Stethoscope, HeadsetIcon, ShieldCheck } from "lucide-react";
import organsImg from "@/assets/organs.png";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import type { AppRole } from "@/types/roles";
import { registerPatientSelf } from "@/services/authService";

const ROLES: { role: AppRole; icon: typeof User; title: string; desc: string; restricted?: boolean }[] = [
  {
    role: "doctor",
    icon: Stethoscope,
    title: "Doctor / Healthcare Provider",
    desc: "Manage patients, review risks, and oversee transplant care",
    restricted: true,
  },
  {
    role: "patient",
    icon: User,
    title: "Patient Portal",
    desc: "View your health status, lab results, and care timeline",
  },
  {
    role: "support",
    icon: HeadsetIcon,
    title: "Support",
    desc: "Help users with issues and manage support requests",
    restricted: true,
  },
  {
    role: "admin",
    icon: ShieldCheck,
    title: "Administrator",
    desc: "Full system management, users and settings",
    restricted: true,
  },
];

export default function SelectRole() {
  const { user, role, setUserRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [selecting, setSelecting] = useState<AppRole | null>(null);

  const getRoleRedirect = (r: AppRole) => {
    switch (r) {
      case "doctor": return "/doctor-dashboard";
      case "patient": return "/patient/home";
      case "support": return "/doctor-dashboard";
      case "admin": return "/doctor-dashboard";
    }
  };

  useEffect(() => {
    if (!authLoading && role) navigate(getRoleRedirect(role), { replace: true });
  }, [role, authLoading, navigate]);

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleSelect = async (selectedRole: AppRole) => {
    setSelecting(selectedRole);
    try {
      await setUserRole(selectedRole);
      if (selectedRole === "patient") {
        const meta = user.user_metadata || {};
        await registerPatientSelf({
          fullName: meta.full_name || user.email || "",
          phone: meta.phone || null,
        });
      }
      navigate(getRoleRedirect(selectedRole), { replace: true });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
      setSelecting(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} alt="Logo" className="h-14 w-14 rounded-2xl object-cover shadow-lg shadow-primary/25" />
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to TransplantCare</h1>
            <p className="mt-1 text-muted-foreground">Select your role to continue</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ROLES.map(({ role: r, icon: Icon, title, desc }) => (
            <Card
              key={r}
              className="group cursor-pointer border-2 border-transparent transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
              onClick={() => !selecting && handleSelect(r)}
            >
              <CardHeader className="items-center text-center pb-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {selecting === r ? <Loader2 className="h-7 w-7 animate-spin" /> : <Icon className="h-7 w-7" />}
                </div>
                <CardTitle className="text-base mt-3">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center px-3">
                <CardDescription className="text-xs">{desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          {t("role.contactAdmin") || "Shifokor yoki admin roli kerak bo'lsa, administrator bilan bog'laning."}
        </p>
      </div>
    </div>
  );
}

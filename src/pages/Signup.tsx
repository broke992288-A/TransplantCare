import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Phone } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageSelector from "@/components/features/LanguageSelector";
import { signUpWithEmail, signUpWithPhone, registerPatientSelf, signInWithPassword } from "@/services/authService";

type Mode = "email" | "phone";

export default function Signup() {
  const [mode, setMode] = useState<Mode>("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.length === 9) return `998${digits}`;
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: t("common.error"), description: t("signup.passwordMin"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const normalizedPhone = mode === "phone" ? normalizePhone(phone) : "";

      if (mode === "email") {
        await signUpWithEmail(email.trim(), password, fullName.trim());
      } else {
        await signUpWithPhone(normalizedPhone, password, fullName.trim());
      }

      // Auto sign-in so we can call register_patient_self under the new user
      const identifier = mode === "email" ? email.trim() : normalizedPhone;
      try {
        await signInWithPassword(identifier, password);
        await registerPatientSelf({
          fullName: fullName.trim(),
          phone: mode === "phone" ? `+${normalizedPhone}` : null,
        });
      } catch (innerErr) {
        // Email confirm may be required — fall through to success message
        console.warn("[Signup] post-signup link skipped", innerErr);
      }

      toast({ title: t("signup.success"), description: t("signup.successDesc") });
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end"><LanguageSelector /></div>
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} alt="Logo" className="h-14 w-14 rounded-2xl object-cover shadow-lg shadow-primary/25" />
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">{t("login.title")}</h1>
          </div>
        </div>
        <Card className="border-0 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">{t("signup.title")}</CardTitle>
            <CardDescription>{t("signup.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="h-4 w-4" />
                  {t("login.tabEmail")}
                </TabsTrigger>
                <TabsTrigger value="phone" className="gap-2">
                  <Phone className="h-4 w-4" />
                  {t("login.tabPhone")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("signup.fullName")}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Ism Familiya"
                />
              </div>

              {mode === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="email">{t("login.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="bemor@transplantcare.uz"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("login.phoneNumber")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder={t("login.phonePlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">{t("login.phoneHint")}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {t("signup.submit")}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {t("signup.haveAccount")}{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                {t("signup.signIn")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

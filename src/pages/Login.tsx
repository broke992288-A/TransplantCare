import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Mail, Phone } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageSelector from "@/components/features/LanguageSelector";
import { resetPasswordForEmail } from "@/services/authService";
import { logAudit } from "@/services/auditService";

type Mode = "email" | "phone";

export default function Login() {
  const [mode, setMode] = useState<Mode>("email");
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/[^0-9]/g, "");
    // If user entered 9-digit local number, prefix with 998
    if (digits.length === 9) return `998${digits}`;
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgot) {
        // Password reset only supported via email
        await resetPasswordForEmail(email);
        toast({ title: t("login.resetSent"), description: t("login.resetSentDesc") });
        setIsForgot(false);
      } else {
        const identifier = mode === "email" ? email.trim() : normalizePhone(phone);
        await signIn(identifier, password);
        try {
          logAudit({ action: "user_login", metadata: { mode, identifier } });
        } catch (auditErr) {
          console.warn("[Login] audit log failed (non-blocking)", auditErr);
        }
        navigate("/select-role", { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Login] sign-in failed", err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-end"><LanguageSelector /></div>
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} alt="Logo" className="h-14 w-14 rounded-2xl object-cover shadow-lg shadow-primary/25" />
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">{t("login.title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("login.subtitle")}</p>
          </div>
        </div>
        <Card className="border-0 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">
              {isForgot ? t("login.resetPassword") : t("login.signIn")}
            </CardTitle>
            <CardDescription>
              {isForgot ? t("login.resetDesc") : t("login.signInDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isForgot && (
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
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {(isForgot || mode === "email") && (
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
              )}

              {!isForgot && mode === "phone" && (
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

              {!isForgot && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("login.password")}</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setIsForgot(true)}
                    >
                      {t("login.forgotPassword")}
                    </button>
                  </div>
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
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {isForgot ? t("login.sendResetLink") : t("login.signIn")}
              </Button>
            </form>
            {isForgot && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => setIsForgot(false)}
                >
                  {t("login.backToLogin")}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

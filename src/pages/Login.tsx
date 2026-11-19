import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Phone, Eye, EyeOff } from "lucide-react";
import logoImg from "@/assets/logo.png";
import watermark from "@/assets/login-watermark.png.asset.json";
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = oauthReturnPath(params.get("next"));
  const { toast } = useToast();
  const { t, setLang } = useLanguage();

  useEffect(() => {
    if (!localStorage.getItem("app-lang")) setLang("uz");
  }, [setLang]);

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
        // Clear role-confirmation flag so user must re-select role on every login
        sessionStorage.removeItem("roleConfirmed");
        await signIn(identifier, password);
        try {
          logAudit({ action: "user_login", metadata: { mode, identifier } });
        } catch (auditErr) {
          console.warn("[Login] audit log failed (non-blocking)", auditErr);
        }
        navigate(next === "/" ? "/select-role" : next, { replace: true });
      }
    } catch (err: unknown) {
      const anyErr = err as { message?: unknown; error_description?: unknown; msg?: unknown };
      const raw = anyErr?.message ?? anyErr?.error_description ?? anyErr?.msg ?? err;
      const message = typeof raw === "string" ? raw : JSON.stringify(raw);
      console.error("[Login] sign-in failed", err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-scene relative isolate flex min-h-screen items-center justify-center px-4 py-20 sm:py-16">
      <img src={watermark.url} alt="" aria-hidden="true" className="login-watermark pointer-events-none absolute select-none" />
      <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-6"><LanguageSelector /></div>
      <div className="relative z-10 w-full max-w-[520px] space-y-7">
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} alt="TransplantCare" className="h-16 w-16 rounded-2xl object-cover shadow-lg shadow-primary/25" />
          <div className="text-center">
            <h1 className="text-3xl font-bold">{t("login.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t("login.subtitle")}</p>
          </div>
        </div>
        <Card className="login-glass rounded-[24px] border-0">
          <CardHeader className="space-y-2 px-6 pt-7 pb-5 sm:px-8">
            <CardTitle className="text-2xl">
              {isForgot ? t("login.resetPassword") : t("login.signIn")}
            </CardTitle>
            <CardDescription>
              {isForgot ? t("login.resetDesc") : t("login.signInDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-7 sm:px-8">
            {!isForgot && (
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-4">
                <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl p-1">
                  <TabsTrigger value="email" className="h-10 gap-2 rounded-lg">
                    <Mail className="h-4 w-4" />
                    {t("login.tabEmail")}
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="h-10 gap-2 rounded-lg">
                    <Phone className="h-4 w-4" />
                    {t("login.tabPhone")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="login-input h-12 rounded-xl"
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
                    className="login-input h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">{t("login.phoneHint")}</p>
                </div>
              )}

              {!isForgot && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="password">{t("login.password")}</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => setIsForgot(true)}
                    >
                      {t("login.forgotPassword")}
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="login-input h-12 rounded-xl pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {isForgot ? t("login.sendResetLink") : t("login.signIn")}
              </Button>
            </form>
            {isForgot ? (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <Button
                  variant="link"
                  className="h-auto p-0 font-medium text-primary"
                  onClick={() => setIsForgot(false)}
                >
                  {t("login.backToLogin")}
                </Button>
              </div>
            ) : (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {t("login.dontHave")}{" "}
                <Link to={next === "/" ? "/signup" : "/signup?next=" + encodeURIComponent(next)} className="font-medium text-primary hover:underline">
                  {t("login.signUp")}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageSelector from "@/components/features/LanguageSelector";
import { resetPasswordForEmail } from "@/services/authService";
import { logAudit } from "@/services/auditService";

export default function Login() {
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgot) {
        await resetPasswordForEmail(email);
        toast({ title: t("login.resetSent"), description: t("login.resetSentDesc") });
        setIsForgot(false);
      } else {
        await signIn(email, password);
        logAudit({ action: "user_login", metadata: { email } });
        navigate("/select-role");
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
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
              {isForgot ? t("login.resetDesc") : "Email ва парол орқали тизимга киринг"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("login.email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="bemor@transplant.uz" />
              </div>

              {!isForgot && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("login.password")}</Label>
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => setIsForgot(true)}>
                      {t("login.forgotPassword")}
                    </button>
                  </div>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {isForgot ? t("login.sendResetLink") : t("login.signIn")}
              </Button>
            </form>
            {isForgot && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <button className="font-medium text-primary hover:underline" onClick={() => setIsForgot(false)}>{t("login.backToLogin")}</button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

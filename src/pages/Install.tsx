import { useState, useEffect, useMemo } from "react";
import { Download, Smartphone, Check, Share, Bell, BellOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iosStandalone = (window.navigator as any).standalone === true;
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  return iosStandalone || displayStandalone;
}

export default function Install() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const standalone = useMemo(isStandalonePWA, []);
  const { permission, isSubscribed, loading, support, subscribe, unsubscribe } = usePushNotifications();

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    if (standalone) setInstalled(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [standalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  const showPushSection = installed || standalone;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <img src="/pwa-icon-192.png" alt="TransplantCare" className="h-20 w-20 rounded-2xl mb-4" />
          <CardTitle className="text-2xl">{t("install.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {installed ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Check className="h-8 w-8" />
              </div>
              <p className="text-lg font-medium">{t("install.installed")}</p>
              <p className="text-sm text-muted-foreground">{t("install.installedDesc")}</p>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">{t("install.iosHowTo")}</p>
              <div className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">1</div>
                  <div className="flex items-center gap-2">
                    <Share className="h-4 w-4" />
                    <span className="text-sm">{t("install.iosStep1").replace("{share}", "Share")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">2</div>
                  <span className="text-sm">{t("install.iosStep2").replace("{add}", "Add to Home Screen")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">3</div>
                  <span className="text-sm">{t("install.iosStep3").replace("{addBtn}", "Add")}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">{t("install.iosFooter")}</p>
            </div>
          ) : deferredPrompt ? (
            <div className="flex flex-col items-center gap-4">
              <Smartphone className="h-12 w-12 text-primary" />
              <p className="text-sm text-muted-foreground text-center">{t("install.installPrompt")}</p>
              <Button onClick={handleInstall} size="lg" className="w-full gap-2">
                <Download className="h-5 w-5" />
                {t("install.installBtn")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <Smartphone className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("install.openInChrome")}</p>
              <p className="text-xs text-muted-foreground">{t("install.addToHomeAlt")}</p>
            </div>
          )}

          {showPushSection && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">{t("install.pushTitle")}</p>
                </div>
                <Badge variant={isSubscribed ? "default" : "secondary"}>
                  {permission === "granted"
                    ? isSubscribed
                      ? t("install.statusEnabled")
                      : t("install.statusGranted")
                    : permission === "denied"
                      ? t("install.statusDenied")
                      : t("install.statusNotAsked")}
                </Badge>
              </div>

              {!user ? (
                <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">{t("install.loginRequired")}</p>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/login")}>
                    {t("install.loginBtn")}
                  </Button>
                </div>
              ) : support !== "ok" ? (
                <p className="text-xs text-muted-foreground">{t("install.unsupported")}</p>
              ) : permission === "denied" ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                  <p className="text-xs text-destructive font-medium">{t("install.deniedTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("install.deniedHint")}</p>
                  <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-0.5">
                    <li>{t("install.deniedStep1")}</li>
                    <li>{t("install.deniedStep2")}</li>
                    <li>{t("install.deniedStep3")}</li>
                  </ol>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => window.location.reload()}>
                    {t("install.reloadPage")}
                  </Button>
                </div>
              ) : isSubscribed ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 p-2.5 text-green-700 dark:text-green-400 text-xs">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    <span>{t("install.activeMsg")}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={unsubscribe} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                    {t("install.disableBtn")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t("install.willSend")}</p>
                  <Button size="sm" onClick={subscribe} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                    {t("install.enableBtn")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

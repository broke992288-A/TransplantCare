import { useState, useEffect, useMemo } from "react";
import { Download, Smartphone, Check, Share, Bell, BellOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

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
          <CardTitle className="text-2xl">TransplantCare ўрнатиш</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Install */}
          {installed ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Check className="h-8 w-8" />
              </div>
              <p className="text-lg font-medium">Илова ўрнатилди!</p>
              <p className="text-sm text-muted-foreground">
                Энди телефонингиз бош экранидан очишингиз мумкин.
              </p>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                iPhone/iPad да ўрнатиш учун:
              </p>
              <div className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">1</div>
                  <div className="flex items-center gap-2">
                    <Share className="h-4 w-4" />
                    <span className="text-sm">Safari да <strong>Share</strong> тугмасини босинг</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">2</div>
                  <span className="text-sm"><strong>Add to Home Screen</strong> ни танланг</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">3</div>
                  <span className="text-sm"><strong>Add</strong> тугмасини босинг</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Ўрнатилгач, иловани очинг ва қуйидаги <strong>Push Bildirishnomalar</strong> бўлимидан ёқинг.
              </p>
            </div>
          ) : deferredPrompt ? (
            <div className="flex flex-col items-center gap-4">
              <Smartphone className="h-12 w-12 text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                Иловани телефонингизга ўрнатинг — интернетсиз ҳам ишлайди!
              </p>
              <Button onClick={handleInstall} size="lg" className="w-full gap-2">
                <Download className="h-5 w-5" />
                Ўрнатиш
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <Smartphone className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Иловани ўрнатиш учун бу саҳифани телефонингиздаги <strong>Chrome</strong> браузерида очинг.
              </p>
              <p className="text-xs text-muted-foreground">
                Ёки браузер менюсидан "Add to Home Screen" ни танланг.
              </p>
            </div>
          )}

          {/* Step 2: Push notifications — only meaningful after install (or when running standalone) */}
          {showPushSection && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Push Bildirishnomалар</p>
                </div>
                <Badge variant={isSubscribed ? "default" : "secondary"}>
                  {permission === "granted"
                    ? isSubscribed
                      ? "Ёқилган"
                      : "Рухсат бор"
                    : permission === "denied"
                      ? "Рад этилган"
                      : "Сўралмаган"}
                </Badge>
              </div>

              {!user ? (
                <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Push билдиришномаларни ёқиш учун аввал тизимга киринг.
                  </p>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/login")}>
                    Кириш
                  </Button>
                </div>
              ) : support !== "ok" ? (
                <p className="text-xs text-muted-foreground">
                  Бу қурилма push билдиришномаларни қўллаб-қувватламайди.
                </p>
              ) : permission === "denied" ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                  <p className="text-xs text-destructive font-medium">
                    Билдиришнома рад этилган
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PWA кўринишида ҳам рухсат рад этилган бўлса:
                  </p>
                  <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-0.5">
                    <li>Қурилма Sozlamalar → Илова → TransplantCare ни очинг</li>
                    <li>"Билдиришномалар" бўлимини ёқинг</li>
                    <li>Бу саҳифага қайтиб, тугмани қайта босинг</li>
                  </ol>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => window.location.reload()}>
                    Саҳифани янгилаш
                  </Button>
                </div>
              ) : isSubscribed ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 p-2.5 text-green-700 dark:text-green-400 text-xs">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    <span>Билдиришномалар фаол. Кризис огоҳлантиришлари юборилади.</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={unsubscribe} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                    Билдиришномаларни ўчириш
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Қуйидаги билдиришномалар юборилади: кризис огоҳлантиришлари, дори ва тахлил эслатмалари.
                  </p>
                  <Button size="sm" onClick={subscribe} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                    Push билдиришномаларни ёқиш
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

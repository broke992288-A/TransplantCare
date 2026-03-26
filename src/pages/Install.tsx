import { useState, useEffect } from "react";
import { Download, Smartphone, Check, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <img src="/pwa-icon-192.png" alt="TransplantCare" className="h-20 w-20 rounded-2xl mb-4" />
          <CardTitle className="text-2xl">TransplantCare ўрнатиш</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}

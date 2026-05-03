import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Globe, Lock, ExternalLink, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

type Browser = "chrome" | "edge" | "firefox" | "safari" | "samsung" | "opera" | "unknown";

function detectBrowser(): Browser {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("samsungbrowser")) return "samsung";
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "opera";
  if (ua.includes("firefox") || ua.includes("fxios")) return "firefox";
  if (ua.includes("chrome") || ua.includes("crios")) return "chrome";
  if (ua.includes("safari")) return "safari";
  return "unknown";
}

function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  // iOS
  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
  const iosStandalone = iosNavigator.standalone === true;
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  return iosStandalone || displayStandalone;
}

function isEmbeddedPreview(): boolean {
  if (typeof window === "undefined") return false;
  return window.self !== window.top;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function FixNotificationDialog({ open, onOpenChange }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const browser = useMemo(detectBrowser, []);
  const standalone = useMemo(isStandalonePWA, []);
  const embeddedPreview = useMemo(isEmbeddedPreview, []);
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const [tab, setTab] = useState<"pwa" | "browser">(standalone ? "browser" : "pwa");

  const browserSteps: Record<Browser, string[]> = {
    chrome: [
      t("fixNotif.chrome.s1"),
      t("fixNotif.chrome.s2"),
      t("fixNotif.chrome.s3"),
      t("fixNotif.chrome.s4"),
    ],
    edge: [
      t("fixNotif.edge.s1"),
      t("fixNotif.edge.s2"),
      t("fixNotif.edge.s3"),
      t("fixNotif.edge.s4"),
    ],
    firefox: [
      t("fixNotif.firefox.s1"),
      t("fixNotif.firefox.s2"),
      t("fixNotif.firefox.s3"),
      t("fixNotif.firefox.s4"),
    ],
    safari: [
      t("fixNotif.safari.s1"),
      t("fixNotif.safari.s2"),
      t("fixNotif.safari.s3"),
      t("fixNotif.safari.s4"),
    ],
    samsung: [
      t("fixNotif.samsung.s1"),
      t("fixNotif.samsung.s2"),
      t("fixNotif.samsung.s3"),
      t("fixNotif.samsung.s4"),
    ],
    opera: [
      t("fixNotif.chrome.s1"),
      t("fixNotif.chrome.s2"),
      t("fixNotif.chrome.s3"),
      t("fixNotif.chrome.s4"),
    ],
    unknown: [
      t("fixNotif.generic.s1"),
      t("fixNotif.generic.s2"),
      t("fixNotif.generic.s3"),
    ],
  };

  const browserLabel: Record<Browser, string> = {
    chrome: "Google Chrome",
    edge: "Microsoft Edge",
    firefox: "Mozilla Firefox",
    safari: "Safari",
    samsung: "Samsung Internet",
    opera: "Opera",
    unknown: t("fixNotif.yourBrowser"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {t("fixNotif.title")}
          </DialogTitle>
          <DialogDescription>{embeddedPreview ? t("fixNotif.frameSubtitle") : t("fixNotif.subtitle")}</DialogDescription>
        </DialogHeader>

        {embeddedPreview && (
          <div className="rounded-lg border bg-warning/5 p-3 space-y-2 text-sm">
            <p className="font-medium">{t("fixNotif.frameTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("fixNotif.frameDesc")}</p>
            <p className="text-xs text-muted-foreground break-all">
              {t("fixNotif.frameOrigin")}: <span className="font-mono">{currentOrigin}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
            >
              {t("fixNotif.openDirectPreview")}
              <ExternalLink className="h-3 w-3 ml-1.5" />
            </Button>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as "pwa" | "browser")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pwa" disabled={standalone}>
              <Smartphone className="h-4 w-4 mr-1" />
              {t("fixNotif.tabPwa")}
            </TabsTrigger>
            <TabsTrigger value="browser">
              <Globe className="h-4 w-4 mr-1" />
              {t("fixNotif.tabBrowser")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pwa" className="space-y-3 mt-4">
            <div className="rounded-lg border bg-primary/5 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("fixNotif.pwaTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("fixNotif.pwaDesc")}</p>
                </div>
              </div>
            </div>
            <ul className="text-sm space-y-1.5 list-disc pl-5 text-muted-foreground">
              <li>{t("fixNotif.pwaBenefit1")}</li>
              <li>{t("fixNotif.pwaBenefit2")}</li>
              <li>{t("fixNotif.pwaBenefit3")}</li>
            </ul>
            <Button
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                navigate("/install");
              }}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {t("fixNotif.openInstall")}
              <ExternalLink className="h-3 w-3 ml-1.5" />
            </Button>
          </TabsContent>

          <TabsContent value="browser" className="space-y-3 mt-4">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">{t("fixNotif.detected")}</p>
              <p className="text-sm font-semibold">{browserLabel[browser]}</p>
            </div>
            <ol className="text-sm space-y-2 list-decimal pl-5">
              {browserSteps[browser].map((step, i) => (
                <li key={i} className="leading-relaxed">{step}</li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground border-t pt-2">
              {t("fixNotif.afterReload")}
            </p>
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              {t("fixNotif.reload")}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.close") || "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

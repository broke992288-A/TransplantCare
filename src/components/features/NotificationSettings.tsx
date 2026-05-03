import { useState } from "react";
import { Bell, BellOff, Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/hooks/useLanguage";
import FixNotificationDialog from "@/components/features/FixNotificationDialog";
import TestPushButton from "@/components/features/TestPushButton";
import ResubscribePushButton from "@/components/features/ResubscribePushButton";

export default function NotificationSettings() {
  const { t } = useLanguage();
  const { permission, isSubscribed, loading, subscribe, unsubscribe, refresh } = usePushNotifications();
  const [fixOpen, setFixOpen] = useState(false);

  const notSupported = typeof Notification === "undefined" || !("serviceWorker" in navigator);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {t("notif.title") || "Bildirishnomalar"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notSupported ? (
          <p className="text-sm text-muted-foreground">
            {t("notif.notSupported") || "Brauzeringiz bildirishnomalarni qo'llab-quvvatlamaydi"}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {t("notif.pushStatus") || "Push bildirishnomalar"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSubscribed
                    ? t("notif.enabled") || "Yoqilgan ✅"
                    : t("notif.disabled") || "O'chirilgan"}
                </p>
              </div>
              <Badge variant={permission === "granted" && isSubscribed ? "default" : "secondary"}>
                {permission === "granted" ? t("notif.permGranted") : permission === "denied" ? t("notif.permDenied") : t("notif.permNotAsked")}
              </Badge>
            </div>

            {permission === "granted" && !isSubscribed && (
              <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning-foreground space-y-2">
                <p>
                  {t("notif.permissionButNoSubscription")}
                </p>
                <Button size="sm" variant="outline" onClick={refresh} className="w-full">
                  {t("notif.recheckStatus")}
                </Button>
              </div>
            )}

            {permission === "denied" ? (
              <div className="space-y-2">
                <p className="text-xs text-destructive">
                  {t("notif.denied") || "Bildirishnoma ruxsati brauzer sozlamalarida rad etilgan. Iltimos, brauzer sozlamalarini tekshiring."}
                </p>
                <Button size="sm" variant="default" onClick={() => setFixOpen(true)} className="w-full">
                  <Wrench className="h-4 w-4 mr-2" />
                  {t("notif.fixIt") || "How to fix this →"}
                </Button>
              </div>
            ) : isSubscribed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={unsubscribe}
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                {t("notif.disable") || "Bildirishnomalarni o'chirish"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={subscribe}
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                {t("notif.enable") || "Bildirishnomalarni yoqish"}
              </Button>
            )}

            {isSubscribed && permission === "granted" && (
              <>
                <TestPushButton />
                <ResubscribePushButton onResubscribed={refresh} />
              </>
            )}

            <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
              <p className="font-medium">{t("notif.whatYouGet") || "Quyidagi bildirishnomalar yuboriladi:"}</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>{t("notif.criticalAlert") || "Kritik risk ogohlantirishlari"}</li>
                <li>{t("notif.labReminder") || "Tahlil topshirish eslatmalari"}</li>
                <li>{t("notif.medReminder") || "Dori qabul qilish eslatmalari"}</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
      <FixNotificationDialog open={fixOpen} onOpenChange={setFixOpen} />
    </Card>
  );
}

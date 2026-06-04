import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, CheckCheck, Check, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { usePatientAlerts, useInvalidatePatientAlerts } from "@/hooks/usePatientAlerts";
import {
  acknowledgeAlert,
  resolveAlert,
  markAllAlertsRead,
  type PatientAlert,
} from "@/services/patientAlertService";
import { useToast } from "@/hooks/use-toast";
import TranslatedText from "@/components/features/TranslatedText";

interface PatientAlertsCardProps {
  patientId: string;
}

const severityClass: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-primary text-primary-foreground",
};

const statusClass: Record<string, string> = {
  new: "bg-destructive/15 text-destructive",
  acknowledged: "bg-primary/15 text-primary",
  reviewed: "bg-primary/15 text-primary",
  resolved: "bg-success/15 text-success",
  dismissed: "bg-muted text-muted-foreground",
};

export default function PatientAlertsCard({ patientId }: PatientAlertsCardProps) {
  const { t } = useLanguage();
  const [showResolved, setShowResolved] = useState(false);
  const { data: alerts = [], isLoading } = usePatientAlerts(patientId, 20, showResolved);
  const invalidate = useInvalidatePatientAlerts();
  const { toast } = useToast();

  const [resolveTarget, setResolveTarget] = useState<PatientAlert | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const activeCount = alerts.filter(
    (a) => a.status !== "resolved" && a.status !== "dismissed",
  ).length;
  const newCount = alerts.filter((a) => a.status === "new").length;

  const handleMarkAll = async () => {
    try {
      await markAllAlertsRead(patientId);
      invalidate(patientId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      invalidate(patientId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    }
  };

  const handleResolveConfirm = async () => {
    if (!resolveTarget) return;
    try {
      await resolveAlert(resolveTarget.id, resolveNote.trim() || undefined);
      invalidate(patientId);
      setResolveTarget(null);
      setResolveNote("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    }
  };

  if (isLoading) return null;
  if (alerts.length === 0 && !showResolved) return null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive shrink-0" />
            {t("patientAlerts.title")}
            {newCount > 0 && (
              <Badge variant="destructive" className="ml-1">{newCount}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id={`show-resolved-${patientId}`}
                checked={showResolved}
                onCheckedChange={setShowResolved}
              />
              <Label
                htmlFor={`show-resolved-${patientId}`}
                className="text-xs text-muted-foreground cursor-pointer"
              >
                {t("patientAlerts.showResolved") || "Show resolved"}
              </Label>
            </div>
            {newCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAll}>
                <CheckCheck className="h-4 w-4 mr-1" /> {t("patientAlerts.markAllRead")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("patientAlerts.noActive") || "No active alerts"}
            </p>
          )}
          {alerts.slice(0, 20).map((alert) => {
            const isClosed = alert.status === "resolved" || alert.status === "dismissed";
            return (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 transition-colors ${
                  isClosed
                    ? "opacity-60"
                    : alert.status === "new"
                    ? "border-destructive/30 bg-destructive/5"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <span className="text-sm font-medium">{alert.title}</span>
                  <div className="flex items-center gap-1">
                    <Badge className={statusClass[alert.status] ?? statusClass.new} variant="outline">
                      {t(`patientAlerts.status.${alert.status}`) || alert.status}
                    </Badge>
                    <Badge className={severityClass[alert.severity] ?? severityClass.info}>
                      {alert.severity === "critical"
                        ? t("alerts.critical")
                        : alert.severity === "warning"
                        ? t("alerts.warning")
                        : t("alerts.info")}
                    </Badge>
                  </div>
                </div>
                {alert.message && (
                  <p className="text-xs text-muted-foreground">
                    <TranslatedText text={alert.message} />
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
                {alert.resolution_note && (
                  <p className="text-xs italic text-muted-foreground mt-1">
                    “{alert.resolution_note}”
                  </p>
                )}
                {!isClosed && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {alert.status === "new" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {t("patientAlerts.acknowledge") || "Acknowledge"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7"
                      onClick={() => {
                        setResolveTarget(alert);
                        setResolveNote("");
                      }}
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                      {t("patientAlerts.resolve") || "Resolve"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {activeCount === 0 && showResolved && alerts.length > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              {t("patientAlerts.allResolved") || "All alerts resolved"}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!resolveTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResolveTarget(null);
            setResolveNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("patientAlerts.resolveTitle") || "Resolve alert"}
            </DialogTitle>
          </DialogHeader>
          {resolveTarget && (
            <p className="text-sm text-muted-foreground">{resolveTarget.title}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="resolution-note" className="text-xs">
              {t("patientAlerts.resolutionNote") || "Resolution note (optional)"}
            </Label>
            <Textarea
              id="resolution-note"
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleResolveConfirm}>
              <ShieldCheck className="h-4 w-4 mr-1" />
              {t("patientAlerts.resolve") || "Resolve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { AlertTriangle, AlertCircle, Info, CheckCircle, Clock, Bell } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { useAlerts, AlertWithPatient } from "@/hooks/useAlerts";
import { markAlertRead, markAllAlertsRead } from "@/services/patientAlertService";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";


function severityToType(severity: string): string {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  if (severity === "info") return "info";
  return "warning";
}

function timeAgo(dateStr: string, t: (key: string) => string): string {
  try {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("time.justNow");
    if (minutes < 60) return `${minutes} ${t("time.minutesAgo")}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${t("time.hoursAgo")}`;
    const days = Math.floor(hours / 24);
    return `${days} ${t("time.daysAgo")}`;
  } catch {
    return dateStr;
  }
}

export default function Alerts() {
  const { t } = useLanguage();
  const { data: alerts = [], isLoading } = useAlerts();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const unreadCount = alerts.filter((a) => !a.is_read).length;
  const readCount = alerts.filter((a) => a.is_read).length;

  const alertStats = [
    { label: t("alerts.critical"), value: String(criticalCount), color: "text-destructive", icon: AlertTriangle },
    { label: t("alerts.warnings"), value: String(warningCount), color: "text-warning", icon: AlertCircle },
    { label: t("alerts.unread"), value: String(unreadCount), color: "text-primary", icon: Bell },
    { label: t("alerts.resolved"), value: String(readCount), color: "text-success", icon: CheckCircle },
  ];

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "warning": return <AlertCircle className="w-5 h-5 text-warning" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getAlertBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive">{t("alerts.critical")}</Badge>;
      case "warning": return <Badge className="bg-warning text-warning-foreground">{t("alerts.warning")}</Badge>;
      default: return <Badge variant="secondary">{t("alerts.info")}</Badge>;
    }
  };

  const filterAlerts = (type: string): AlertWithPatient[] => {
    if (type === "all") return alerts;
    return alerts.filter((a) => severityToType(a.severity) === type);
  };

  const handleMarkRead = async (alertId: string) => {
    try {
      await markAlertRead(alertId);
      queryClient.invalidateQueries({ queryKey: ["all-alerts"] });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {alertStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
                <div><p className="text-2xl font-bold text-foreground">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">{t("alerts.alertCenter")}</CardTitle>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={async () => {
                try {
                  await markAllAlertsRead();
                  queryClient.invalidateQueries({ queryKey: ["all-alerts"] });
                  queryClient.invalidateQueries({ queryKey: ["unread-alert-count"] });
                  toast({ title: t("alerts.allMarkedRead") });
                } catch (err: any) {
                  toast({ title: t("common.error"), description: err.message, variant: "destructive" });
                }
              }}>
                <CheckCheck className="h-4 w-4 mr-1" /> {t("alerts.markAllRead")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">{t("common.loading")}</p>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
              <p className="text-muted-foreground">{t("alerts.noAlerts")}</p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">{t("alerts.all")} ({alerts.length})</TabsTrigger>
                <TabsTrigger value="critical">{t("alerts.critical")} ({filterAlerts("critical").length})</TabsTrigger>
                <TabsTrigger value="warning">{t("alerts.warning")} ({filterAlerts("warning").length})</TabsTrigger>
              </TabsList>
              {["all", "critical", "warning"].map((tabType) => (
                <TabsContent key={tabType} value={tabType} className="space-y-3">
                  {filterAlerts(tabType).length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">{t("alerts.noAlerts")}</p>
                  ) : (
                    filterAlerts(tabType).map((alert) => (
                      <div key={alert.id} className={`p-4 rounded-lg border transition-colors ${alert.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getAlertIcon(alert.severity)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="font-medium text-foreground">{alert.title}</h4>
                              {getAlertBadge(alert.severity)}
                              {!alert.is_read && <span className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            {alert.message && <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {alert.patient_name && (
                                <span
                                  className="font-medium text-foreground cursor-pointer hover:underline"
                                  onClick={() => navigate(`/patient/${alert.patient_id}`)}
                                >
                                  {alert.patient_name}
                                </span>
                              )}
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(alert.created_at, t)}</span>
                            </div>
                          </div>
                          {!alert.is_read && (
                            <Button variant="ghost" size="sm" onClick={() => handleMarkRead(alert.id)}>
                              {t("alerts.markRead")}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

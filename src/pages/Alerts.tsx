import { AlertTriangle, AlertCircle, Info, CheckCircle, Clock, Filter, Bell } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";

export default function Alerts() {
  const { t } = useLanguage();

  const alerts = [
    { id: 1, type: "critical", title: t("alerts.criticalLabResult"), patient: "Azimov Rustam", patientId: "P-2024-001", message: "Creatinine: 1.2 → 2.8 mg/dL", time: "10 min ago", read: false },
    { id: 2, type: "critical", title: t("alerts.medicationStockCritical"), patient: null, message: "Sirolimus (Rapamune) — 95 tablets", time: "25 min ago", read: false },
    { id: 3, type: "warning", title: t("alerts.missedCheckin"), patient: "Karimova Nilufar", patientId: "P-2024-015", message: "3 days without medication log", time: "1 hour ago", read: false },
    { id: 4, type: "warning", title: t("alerts.lowStock"), patient: null, message: "Cyclosporine: 180/300 capsules", time: "2 hours ago", read: true },
    { id: 5, type: "info", title: t("alerts.scheduledAppointment"), patient: "Toshmatov Bekzod", patientId: "P-2024-023", message: "09:00", time: "3 hours ago", read: true },
    { id: 6, type: "success", title: t("alerts.labNormal"), patient: "Yuldasheva Malika", patientId: "P-2024-008", message: "Tacrolimus: 8.2 ng/mL", time: "4 hours ago", read: true },
  ];

  const alertStats = [
    { label: t("alerts.critical"), value: "2", color: "text-destructive", icon: AlertTriangle },
    { label: t("alerts.warnings"), value: "3", color: "text-warning", icon: AlertCircle },
    { label: t("alerts.unread"), value: "3", color: "text-primary", icon: Bell },
    { label: t("alerts.resolved"), value: "12", color: "text-success", icon: CheckCircle },
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical": return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "warning": return <AlertCircle className="w-5 h-5 text-warning" />;
      case "success": return <CheckCircle className="w-5 h-5 text-success" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case "critical": return <Badge variant="destructive">{t("alerts.critical")}</Badge>;
      case "warning": return <Badge className="bg-warning text-warning-foreground">{t("alerts.warning")}</Badge>;
      case "success": return <Badge className="bg-success text-success-foreground">{t("alerts.resolved")}</Badge>;
      default: return <Badge variant="secondary">{t("alerts.info")}</Badge>;
    }
  };

  const filterAlerts = (type: string) => type === "all" ? alerts : alerts.filter((a) => a.type === type);

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
            <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />{t("alerts.filter")}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t("alerts.all")} ({alerts.length})</TabsTrigger>
              <TabsTrigger value="critical">{t("alerts.critical")} ({filterAlerts("critical").length})</TabsTrigger>
              <TabsTrigger value="warning">{t("alerts.warning")} ({filterAlerts("warning").length})</TabsTrigger>
              <TabsTrigger value="info">{t("alerts.info")} ({filterAlerts("info").length})</TabsTrigger>
            </TabsList>
            {["all", "critical", "warning", "info"].map((tabType) => (
              <TabsContent key={tabType} value={tabType} className="space-y-3">
                {filterAlerts(tabType).map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border transition-colors ${alert.read ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-medium text-foreground">{alert.title}</h4>
                          {getAlertBadge(alert.type)}
                          {!alert.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {alert.patient && <span className="font-medium text-foreground">{alert.patient}</span>}
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{alert.time}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">{t("alerts.view")}</Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

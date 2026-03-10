import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, HeartPulse, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import type { RiskSnapshot } from "@/services/riskSnapshotService";

interface PatientRiskCardProps {
  snapshot: RiskSnapshot | null;
  loading?: boolean;
}

export default function PatientRiskCard({ snapshot, loading }: PatientRiskCardProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">{t("risk.calculating")}</CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("patientRisk.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("risk.noLabData")}</p>
        </CardContent>
      </Card>
    );
  }

  const level = snapshot.risk_level;

  const config = {
    low: {
      icon: CheckCircle,
      iconColor: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
      emoji: "✅",
    },
    medium: {
      icon: Info,
      iconColor: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/30",
      emoji: "⚠️",
    },
    high: {
      icon: AlertTriangle,
      iconColor: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/30",
      emoji: "🔴",
    },
  }[level] ?? {
    icon: Info,
    iconColor: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-border",
    emoji: "ℹ️",
  };

  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {t("patientRisk.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator — simple, no score */}
        <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-5 text-center space-y-3`}>
          <StatusIcon className={`h-10 w-10 mx-auto ${config.iconColor}`} />
          <p className="text-xl font-bold">
            {t(`patientRisk.status.${level}`)}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(`patientRisk.desc.${level}`)}
          </p>
        </div>

        {/* Recommendation */}
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary" />
            {t("patientRisk.recommendation")}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(`patientRisk.rec.${level}`)}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          {t("patientRisk.lastCheck")}: {new Date(snapshot.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

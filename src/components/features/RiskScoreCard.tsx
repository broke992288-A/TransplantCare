import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { riskColorClass } from "@/utils/risk";
import type { RiskSnapshot } from "@/services/riskSnapshotService";
import type { RiskExplanation } from "@/services/riskSnapshotService";

interface RiskScoreCardProps {
  snapshot: RiskSnapshot | null;
  prevSnapshot?: RiskSnapshot | null;
  loading?: boolean;
}

// Map English risk flag prefixes to translation keys
const FLAG_MAP: Record<string, string> = {
  "Tacrolimus low": "flag.tacrolimus_low",
  "Tacrolimus high": "flag.tacrolimus_high",
  "ALT critical": "flag.alt_critical",
  "ALT elevated": "flag.alt_elevated",
  "AST critical": "flag.ast_critical",
  "AST elevated": "flag.ast_elevated",
  "Bilirubin critical": "flag.bilirubin_critical",
  "Bilirubin elevated": "flag.bilirubin_elevated",
  "Re-transplant patient": "flag.retransplant",
  "Creatinine critical": "flag.creatinine_critical",
  "Creatinine elevated": "flag.creatinine_elevated",
  "eGFR very low": "flag.egfr_very_low",
  "eGFR low": "flag.egfr_low",
  "Dialysis history": "flag.dialysis_history",
};

function translateFlag(flag: string, t: (key: string) => string): string {
  if (FLAG_MAP[flag]) return t(FLAG_MAP[flag]);
  for (const [prefix, key] of Object.entries(FLAG_MAP)) {
    if (flag.startsWith(prefix)) {
      const value = flag.slice(prefix.length);
      return t(key) + value;
    }
  }
  return flag;
}

function translateRiskLevel(level: string, t: (key: string) => string): string {
  const key = `risk.${level}`;
  const translated = t(key);
  return translated !== key ? translated : level.toUpperCase();
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />;
  if (severity === "warning") return <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />;
  return <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
}

export default function RiskScoreCard({ snapshot, prevSnapshot, loading }: RiskScoreCardProps) {
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
            <Activity className="h-5 w-5 text-primary" />
            {t("risk.score")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("risk.noLabData")}</p>
        </CardContent>
      </Card>
    );
  }

  const trend = prevSnapshot
    ? snapshot.score > prevSnapshot.score ? "up" : snapshot.score < prevSnapshot.score ? "down" : "same"
    : null;

  const details = (snapshot.details as { flags?: string[]; explanations?: RiskExplanation[] }) ?? {};
  const flags = details.flags ?? [];
  const explanations = details.explanations ?? [];

  // Score color based on level
  const scoreColor = snapshot.risk_level === "high"
    ? "text-destructive"
    : snapshot.risk_level === "medium"
      ? "text-warning"
      : "text-success";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          {t("risk.score")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-4xl font-bold ${scoreColor}`}>{snapshot.score}</span>
            <span className="text-muted-foreground text-sm">/ 100</span>
            {trend === "up" && <TrendingUp className="h-5 w-5 text-destructive" />}
            {trend === "down" && <TrendingDown className="h-5 w-5 text-success" />}
            {trend === "same" && <Minus className="h-5 w-5 text-muted-foreground" />}
            {prevSnapshot && trend === "up" && (
              <span className="text-xs text-destructive">+{snapshot.score - prevSnapshot.score}</span>
            )}
            {prevSnapshot && trend === "down" && (
              <span className="text-xs text-success">{snapshot.score - prevSnapshot.score}</span>
            )}
          </div>
          <Badge className={riskColorClass(snapshot.risk_level)}>
            {translateRiskLevel(snapshot.risk_level, t)}
          </Badge>
        </div>

        {/* Explainable risk section */}
        {explanations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("risk.explanation")}
            </p>
            <div className="space-y-2">
              {explanations.map((exp, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-sm ${
                    exp.severity === "critical"
                      ? "border-destructive/30 bg-destructive/5"
                      : exp.severity === "warning"
                        ? "border-warning/30 bg-warning/5"
                        : "border-border bg-muted/30"
                  }`}
                >
                  <SeverityIcon severity={exp.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="leading-snug">{exp.message}</p>
                    {exp.change_pct !== undefined && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {exp.change_pct > 0 ? "↑" : "↓"} {Math.abs(exp.change_pct).toFixed(0)}% {t("risk.sinceLastTest")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : flags.length > 0 ? (
          /* Fallback to simple flags for older snapshots */
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("risk.factors")}</p>
            <ul className="text-sm space-y-1">
              {flags.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive inline-block" />
                  {translateFlag(f, t)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {t("risk.lastEvaluation")}: {new Date(snapshot.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

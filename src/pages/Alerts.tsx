import { lazy, Suspense, useMemo, useState } from "react";
import { AlertTriangle, Activity, CheckCircle, Clock, Pill, ChevronDown, ChevronUp, FileText, Eye, Check, Stethoscope } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/hooks/useLanguage";
import { useGroupedAlerts, PatientAlertGroup } from "@/hooks/useGroupedAlerts";
import { markAlertRead, markAllAlertsRead } from "@/services/patientAlertService";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Sparkline = lazy(() =>
  import("@/components/features/Sparkline").then((m) => ({ default: m.Sparkline })),
);

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function postTxLabel(date: string | null, t: (k: string) => string): string {
  if (!date) return "";
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
  if (days < 60) return `${days} ${t("alerts.daysPostTx")}`;
  const months = Math.floor(days / 30);
  if (months < 18) return `${months} ${t("alerts.monthsPostTx")}`;
  const years = Math.floor(days / 365);
  return `${years} ${t("alerts.yearsPostTx")}`;
}

function lastLabLabel(daysSince: number | null, t: (k: string) => string): string {
  if (daysSince === null) return t("alerts.never");
  if (daysSince === 0) return `${t("alerts.lastLabs")}: ${t("time.justNow")}`;
  return `${t("alerts.lastLabs")}: ${daysSince} ${t("time.daysAgo")}`;
}

interface ClinicalSummary {
  primaryKey: string;
  reasoning: string;
  actionKey: string;
  metric: number[];
  metricLabel: string;
  worse: "up" | "down";
}

function buildSummary(g: PatientAlertGroup, t: (k: string) => string): ClinicalSummary {
  const labs = g.labs;
  const tacro = labs.map((l) => l.tacrolimus_level).filter((v): v is number => v != null);
  const overdue = g.organ_type === "liver"
    ? (g.daysSinceLastLab ?? 999) > 14
    : (g.daysSinceLastLab ?? 999) > 30;

  // Build organ-specific metric series
  let metric: number[] = [];
  let metricLabel = "";
  let worse: "up" | "down" = "up";
  let primaryKey = "alerts.primary.generalAbnormal";
  let actionKey = "alerts.action.continueMonitoring";

  if (g.organ_type === "liver") {
    const series = labs.map((l) => l.total_bilirubin ?? l.alt ?? l.ast).filter((v): v is number => v != null);
    metric = series;
    metricLabel = labs.some((l) => l.total_bilirubin != null) ? "Bilirubin" : "ALT/AST";
    worse = "up";
    if (series.length >= 2 && series[series.length - 1] > series[0] * 1.2) {
      primaryKey = "alerts.primary.liverDysfunction";
      actionKey = "alerts.action.repeatLabs";
    }
  } else {
    const series = labs.map((l) => l.creatinine).filter((v): v is number => v != null);
    metric = series;
    metricLabel = "Creatinine";
    worse = "up";
    if (series.length >= 2 && series[series.length - 1] > series[0] * 1.15) {
      primaryKey = "alerts.primary.kidneyWorsening";
      actionKey = "alerts.action.repeatLabs";
    }
  }

  // Tacrolimus override
  if (tacro.length >= 3) {
    const min = Math.min(...tacro);
    const max = Math.max(...tacro);
    if (min > 0 && (max - min) / min > 0.4) {
      primaryKey = "alerts.primary.tacrolimusUnstable";
      actionKey = "alerts.action.reviewTacrolimus";
      metric = tacro;
      metricLabel = "Tacrolimus";
      worse = "up";
    }
  }

  // Med adherence override
  if (g.alerts.some((a) => a.alert_type === "medication_adherence" || a.alert_type === "medication")) {
    primaryKey = "alerts.primary.medicationIssue";
    actionKey = "alerts.action.continueMonitoring";
  }

  // Overdue overrides everything except critical labs
  if (overdue && g.highestSeverity !== "critical") {
    primaryKey = "alerts.primary.missedFollowUp";
    actionKey = "alerts.action.scheduleLabs";
  }

  // Reasoning narrative from primary alert messages (deduplicated)
  const seen = new Set<string>();
  const fragments: string[] = [];
  for (const a of g.alerts.slice(0, 4)) {
    const msg = (a.message ?? a.title).split(";")[0].trim();
    if (msg && !seen.has(msg)) {
      seen.add(msg);
      fragments.push(msg);
    }
  }
  const reasoning = fragments.length
    ? fragments.slice(0, 2).join(". ")
    : t("alerts.acrossLastChecks");

  return { primaryKey, reasoning, actionKey, metric, metricLabel, worse };
}

const SEVERITY_STYLES: Record<string, { ring: string; dot: string; text: string }> = {
  critical: { ring: "ring-1 ring-warning/40 border-l-4 border-l-warning", dot: "bg-warning", text: "text-warning" },
  warning: { ring: "ring-1 ring-primary/30 border-l-4 border-l-primary", dot: "bg-primary", text: "text-primary" },
  info: { ring: "border-l-4 border-l-muted-foreground/20", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

interface CardProps {
  group: PatientAlertGroup;
  onResolve: (g: PatientAlertGroup) => void;
}

function AlertCard({ group, onResolve }: CardProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const summary = useMemo(() => buildSummary(group, t), [group, t]);
  const style = SEVERITY_STYLES[group.highestSeverity] ?? SEVERITY_STYLES.info;

  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-md", style.ring)}>
      <CardContent className="p-4 space-y-3">
        {/* Patient header */}
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(`/patient/${group.patient_id}`)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                {initials(group.patient_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{group.patient_name}</span>
                {group.unreadCount > 0 && <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} />}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="capitalize">{group.organ_type}</span>
                {group.transplant_date && <span>· {postTxLabel(group.transplant_date, t)}</span>}
                <span className="flex items-center gap-1">
                  · <Clock className="h-3 w-3" />{lastLabLabel(group.daysSinceLastLab, t)}
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Primary clinical change */}
        <div className="flex items-start gap-2">
          <Stethoscope className={cn("mt-0.5 h-4 w-4 shrink-0", style.text)} />
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {t(summary.primaryKey)}
          </h3>
        </div>

        {/* AI reasoning + sparkline */}
        <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("alerts.aiReasoning")}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground/90 line-clamp-3">
              {summary.reasoning}
            </p>
          </div>
          {summary.metric.length >= 2 && (
            <div className="flex shrink-0 flex-col items-end">
              <Suspense fallback={<div className="h-6 w-20" />}>
                <Sparkline values={summary.metric} worseDirection={summary.worse} />
              </Suspense>
              <span className="mt-0.5 text-[10px] text-muted-foreground">{summary.metricLabel}</span>
            </div>
          )}
        </div>

        {/* Suggested action */}
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("alerts.suggestedAction")}
            </div>
            <div className="text-sm font-medium text-foreground">{t(summary.actionKey)}</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1 min-w-[88px]"
            onClick={() => navigate(`/patient/${group.patient_id}/medications`)}
          >
            <Pill className="mr-1 h-3.5 w-3.5" />{t("alerts.quick.reviewMeds")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1 min-w-[88px]"
            onClick={() => navigate(`/patient/${group.patient_id}`)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />{t("alerts.quick.markMonitoring")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1 min-w-[88px]"
            onClick={() => navigate(`/patient/${group.patient_id}?notes=1`)}
          >
            <FileText className="mr-1 h-3.5 w-3.5" />{t("alerts.quick.addNote")}
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-9 flex-1 min-w-[88px]"
            disabled={group.unreadCount === 0}
            onClick={() => onResolve(group)}
          >
            <Check className="mr-1 h-3.5 w-3.5" />{t("alerts.quick.resolve")}
          </Button>
        </div>

        {/* Related findings (collapsible) */}
        {group.alerts.length > 1 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground"
          >
            <span>{t("alerts.relatedFindings")} ({group.alerts.length})</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        {expanded && (
          <ul className="space-y-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
            {group.alerts.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                  a.severity === "critical" ? "bg-warning" : a.severity === "warning" ? "bg-primary" : "bg-muted-foreground")} />
                <span className="line-clamp-2">{a.title}{a.message ? ` — ${a.message}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function Alerts() {
  const { t } = useLanguage();
  const { data: groups = [], isLoading } = useGroupedAlerts();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const summary = useMemo(() => {
    const critical = groups.filter((g) => g.highestSeverity === "critical").length;
    const monitoring = groups.filter((g) => g.highestSeverity === "warning").length;
    const stable = groups.filter((g) => g.highestSeverity === "info").length;
    const overdue = groups.filter((g) => {
      const limit = g.organ_type === "liver" ? 14 : 30;
      return (g.daysSinceLastLab ?? 9999) > limit;
    }).length;
    return { critical, monitoring, stable, overdue };
  }, [groups]);

  const handleResolve = async (g: PatientAlertGroup) => {
    try {
      await Promise.all(
        g.alerts.filter((a) => !a.is_read).map((a) => markAlertRead(a.id)),
      );
      queryClient.invalidateQueries({ queryKey: ["grouped-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["all-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["unread-alert-count"] });
      toast({ title: t("alerts.allMarkedRead") });
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const handleResolveAll = async () => {
    try {
      await markAllAlertsRead();
      queryClient.invalidateQueries({ queryKey: ["grouped-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["all-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["unread-alert-count"] });
      toast({ title: t("alerts.allMarkedRead") });
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const totalUnread = groups.reduce((s, g) => s + g.unreadCount, 0);

  return (
    <DashboardLayout>
      {/* Top summary bar — compact horizontal timeline indicators */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <SummaryPill icon={AlertTriangle} value={summary.critical} label={t("alerts.summary.critical")} tone="warning" />
        <SummaryPill icon={Activity} value={summary.monitoring} label={t("alerts.summary.monitoring")} tone="primary" />
        <SummaryPill icon={CheckCircle} value={summary.stable} label={t("alerts.summary.stable")} tone="success" />
        <SummaryPill icon={Clock} value={summary.overdue} label={t("alerts.summary.overdueLabs")} tone="muted" />
      </div>

      {totalUnread > 0 && (
        <div className="mb-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleResolveAll}>
            <Check className="mr-1 h-4 w-4" />{t("alerts.markAllRead")}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 rounded-lg border border-border/40 bg-card animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-success" />
            <p className="text-muted-foreground">{t("alerts.allClear")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <AlertCard key={g.patient_id} group={g} onResolve={handleResolve} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

interface SummaryPillProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  tone: "warning" | "primary" | "success" | "muted";
}

function SummaryPill({ icon: Icon, value, label, tone }: SummaryPillProps) {
  const toneClass = {
    warning: "text-warning bg-warning/10",
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    muted: "text-muted-foreground bg-muted",
  }[tone];
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2.5">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", toneClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold leading-none text-foreground">{value}</div>
        <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

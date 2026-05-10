import { lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, AlertTriangle, Activity, Plus, ShieldAlert, UserPlus, Clock, BrainCircuit } from "lucide-react";
import { LazyMount } from "@/components/features/LazyMount";
import { useLanguage } from "@/hooks/useLanguage";

const RiskDistributionPie = lazy(() => import("@/components/features/RiskDistributionPie"));
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDoctorPatientsWithLabs } from "@/hooks/usePatients";
import { useSmartPriorityQueue } from "@/hooks/useSmartPriorityQueue";
import { riskColorClass, daysSince } from "@/utils/risk";
import { SkeletonCard, SkeletonTable, SkeletonChart } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import PredictionPanel from "@/components/features/PredictionPanel";
import PatientPriorityPanel from "@/components/features/PatientPriorityPanel";
import OverdueLabsPanel from "@/components/features/OverdueLabsPanel";
import type { UrgencyTier } from "@/utils/smartPriority";

function timeAgo(dateStr: string | null, t: (k: string) => string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} ${t("time.minAgo")}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t("time.hourAgo")}`;
  return `${Math.floor(hours / 24)} ${t("time.dayAgo")}`;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, isLoading: loading } = useDoctorPatientsWithLabs();

  const patients = data?.patients ?? [];
  const labs = data?.labs ?? {};

  // Sort high-risk by risk_score descending
  const highRisk = patients
    .filter((p) => p.risk_level === "high")
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  const mediumRisk = patients.filter((p) => p.risk_level === "medium");
  const pieData = [
    { name: t("dashboard.highRisk"), value: highRisk.length, color: "hsl(var(--destructive))" },
    { name: t("dashboard.mediumRisk"), value: mediumRisk.length, color: "hsl(var(--warning))" },
    { name: t("patients.lowRisk"), value: patients.length - highRisk.length - mediumRisk.length, color: "hsl(var(--success))" },
  ].filter((d) => d.value > 0);

  const riskBadge = (level: string) => <Badge className={riskColorClass(level)}>{t(`risk.${level}`)}</Badge>;

  const summaryCards = [
    { label: t("dashboard.totalPatients"), value: patients.length, icon: Users, color: "text-primary" },
    { label: t("dashboard.highRisk"), value: highRisk.length, icon: AlertTriangle, color: "text-destructive" },
    { label: t("dashboard.mediumRisk"), value: mediumRisk.length, icon: ShieldAlert, color: "text-warning" },
    { label: t("dashboard.activeAlerts"), value: highRisk.length + mediumRisk.length, icon: Activity, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">{t("dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground sm:text-base">{t("dashboard.subtitle")}</p>
          </div>
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to="/add-patient"><Plus className="mr-1 h-4 w-4" /> {t("nav.addPatient")}</Link>
          </Button>
        </div>

        {/* Patient Priority System */}
        {!loading && patients.length > 0 && (
          <PatientPriorityPanel patients={patients} labs={labs} />
        )}

        {/* Overdue Labs Panel */}
        {!loading && patients.length > 0 && <OverdueLabsPanel />}

        {/* Summary cards */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : summaryCards.map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold sm:text-3xl">{value}</div></CardContent>
                </Card>
              ))
          }
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Risk Distribution — modern donut */}
          <Card className="lg:col-span-1 overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-card/40 hover:shadow-xl transition-all duration-500 group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  {t("dashboard.riskDistribution")}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider border-primary/30 text-primary bg-primary/5">
                  {t("trend.live")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <SkeletonChart />
              ) : patients.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t("dashboard.noPatients")}
                  description={t("dashboard.addFirstPatient")}
                  actionLabel={t("nav.addPatient")}
                  onAction={() => navigate("/add-patient")}
                />
              ) : (
                <div className="flex flex-col items-center">
                  <div className="relative w-full" style={{ height: 220 }}>
                    <LazyMount minHeight={220} rootMargin="100px">
                      <Suspense fallback={<SkeletonChart />}>
                        <RiskDistributionPie pieData={pieData} total={patients.length} />
                      </Suspense>
                    </LazyMount>
                    {/* Center stat overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold tabular-nums leading-none bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {patients.length}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-medium">
                        {t("dashboard.totalPatients")}
                      </span>
                    </div>
                  </div>

                  {/* Custom legend with stats */}
                  <div className="grid grid-cols-3 gap-2 w-full mt-2">
                    {[
                      { label: t("dashboard.highRisk"), value: highRisk.length, color: "hsl(var(--destructive))", bg: "bg-destructive/5", text: "text-destructive", border: "border-destructive/20" },
                      { label: t("dashboard.mediumRisk"), value: mediumRisk.length, color: "hsl(var(--warning))", bg: "bg-warning/5", text: "text-warning", border: "border-warning/20" },
                      { label: t("patients.lowRisk"), value: patients.length - highRisk.length - mediumRisk.length, color: "hsl(var(--success))", bg: "bg-success/5", text: "text-success", border: "border-success/20" },
                    ].map((item) => {
                      const pct = patients.length > 0 ? Math.round((item.value / patients.length) * 100) : 0;
                      return (
                        <div
                          key={item.label}
                          className={`relative rounded-lg border ${item.border} ${item.bg} p-2 flex flex-col items-center gap-0.5 transition-all hover:scale-105 hover:shadow-md`}
                        >
                          <span
                            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
                          />
                          <span className={`text-lg font-bold tabular-nums ${item.text}`}>{item.value}</span>
                          <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium leading-tight text-center">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/80">
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* High risk table with score + last evaluation */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-lg">{t("dashboard.highRiskPatients")}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonTable rows={4} cols={6} />
              ) : highRisk.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title={t("dashboard.noHighRisk")}
                  description={t("dashboard.noHighRiskDesc")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboard.patient")}</TableHead>
                      <TableHead>{t("dashboard.organ")}</TableHead>
                      <TableHead>{t("patients.riskScore")}</TableHead>
                      <TableHead>{t("dashboard.keyLab")}</TableHead>
                      <TableHead>{t("dashboard.risk")}</TableHead>
                      <TableHead><Clock className="h-4 w-4" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {highRisk.map((p) => {
                      const lab = labs[p.id];
                      const keyLab = p.organ_type === "liver" ? `Tac: ${lab?.tacrolimus_level ?? "—"}` : `Cr: ${lab?.creatinine ?? "—"}`;
                      const lastEval = p.last_risk_evaluation;
                      return (
                        <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/patient/${p.id}`)}>
                          <TableCell className="font-medium">{p.full_name}</TableCell>
                          <TableCell>{t(`organ.${p.organ_type}`)}</TableCell>
                          <TableCell>
                            <span className="font-bold text-destructive">{p.risk_score ?? "—"}</span>
                            <span className="text-muted-foreground text-xs">/100</span>
                          </TableCell>
                          <TableCell>{keyLab}</TableCell>
                          <TableCell>{riskBadge(p.risk_level)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{timeAgo(lastEval, t)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Prediction Panels for high/medium risk patients */}
        {!loading && (highRisk.length > 0 || mediumRisk.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t("dashboard.predictions")}</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {[...highRisk, ...mediumRisk].slice(0, 4).map((p) => (
                <PredictionPanel
                  key={p.id}
                  patientId={p.id}
                  patientName={p.full_name}
                  organType={p.organ_type}
                  currentRisk={p.risk_level}
                />
              ))}
            </div>
          </div>
        )}

        {/* Smart Priority Patient Queue */}
        <SmartPatientQueue />
      </div>
    </DashboardLayout>
  );
}

const TIER_EMOJI: Record<UrgencyTier, string> = { critical: "🔴", warning: "🟠", stable: "🟢" };
const TIER_BADGE_CLASS: Record<UrgencyTier, string> = {
  critical: "bg-destructive text-destructive-foreground",
  warning: "bg-warning text-warning-foreground",
  stable: "bg-success text-success-foreground",
};
const TIER_LABEL: Record<UrgencyTier, string> = { critical: "Critical", warning: "Warning", stable: "Stable" };

function SmartPatientQueue() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: smartPatients, isLoading } = useSmartPriorityQueue();

  const riskBadge = (level: string) => <Badge className={riskColorClass(level)}>{t(`risk.${level}`)}</Badge>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">{t("dashboard.allPatients")}</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : !smartPatients || smartPatients.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={t("dashboard.noPatients")}
            description={t("dashboard.addFirstPatient")}
            actionLabel={t("nav.addPatient")}
            onAction={() => navigate("/add-patient")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{t("dashboard.patient")}</TableHead>
                <TableHead>{t("dashboard.organ")}</TableHead>
                <TableHead>{t("dashboard.daysPostTx")}</TableHead>
                <TableHead>{t("dashboard.risk")}</TableHead>
                <TableHead>{t("dashboard.status")}</TableHead>
                <TableHead>{t("dashboard.reasons")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smartPatients.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/patient/${p.id}`)}>
                  <TableCell className="text-center text-lg">{TIER_EMOJI[p.priority.tier]}</TableCell>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>{t(`organ.${p.organ_type}`)}</TableCell>
                  <TableCell>{p.transplant_date ? daysSince(p.transplant_date) : "—"}</TableCell>
                  <TableCell>{riskBadge(p.risk_level)}</TableCell>
                  <TableCell>
                    <Badge className={TIER_BADGE_CLASS[p.priority.tier]}>
                      {TIER_LABEL[p.priority.tier]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] text-xs text-muted-foreground truncate">
                    {p.priority.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

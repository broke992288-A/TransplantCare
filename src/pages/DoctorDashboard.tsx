import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, AlertTriangle, Activity, Plus, ShieldAlert, UserPlus, Clock, BrainCircuit } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDoctorPatientsWithLabs } from "@/hooks/usePatients";
import { riskColorClass, daysSince } from "@/utils/risk";
import { SkeletonCard, SkeletonTable, SkeletonChart } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import PredictionPanel from "@/components/features/PredictionPanel";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
    .sort((a, b) => ((b as any).risk_score ?? 0) - ((a as any).risk_score ?? 0));
  const mediumRisk = patients.filter((p) => p.risk_level === "medium");
  const pieData = [
    { name: t("dashboard.highRisk"), value: highRisk.length, color: "hsl(0, 72%, 51%)" },
    { name: t("dashboard.mediumRisk"), value: mediumRisk.length, color: "hsl(38, 92%, 50%)" },
    { name: t("patients.lowRisk"), value: patients.length - highRisk.length - mediumRisk.length, color: "hsl(142, 71%, 35%)" },
  ].filter((d) => d.value > 0);

  const riskBadge = (level: string) => <Badge className={riskColorClass(level)}>{t(`risk.${level}`)}</Badge>;

  const summaryCards = [
    { label: t("dashboard.totalPatients"), value: patients.length, icon: Users, color: "text-primary" },
    { label: t("dashboard.highRisk"), value: highRisk.length, icon: AlertTriangle, color: "text-destructive" },
    { label: t("dashboard.mediumRisk"), value: mediumRisk.length, icon: ShieldAlert, color: "text-warning" },
    { label: t("dashboard.activeAlerts"), value: highRisk.length, icon: Activity, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">{t("dashboard.title")}</h1><p className="text-muted-foreground">{t("dashboard.subtitle")}</p></div>
          <Button asChild><Link to="/add-patient"><Plus className="mr-1 h-4 w-4" /> {t("nav.addPatient")}</Link></Button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : summaryCards.map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </CardHeader>
                  <CardContent><div className="text-3xl font-bold">{value}</div></CardContent>
                </Card>
              ))
          }
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pie Chart */}
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-lg">{t("dashboard.riskDistribution")}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              {loading ? (
                <SkeletonChart />
              ) : patients.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t("dashboard.noPatients")}
                  description={t("dashboard.addFirstPatient") || "Add your first patient"}
                  actionLabel={t("nav.addPatient")}
                  onAction={() => navigate("/add-patient")}
                />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
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
                  description={t("dashboard.noHighRiskDesc") || "No high-risk patients currently"}
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
                      const lastEval = (p as any).last_risk_evaluation;
                      return (
                        <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/patient/${p.id}`)}>
                          <TableCell className="font-medium">{p.full_name}</TableCell>
                          <TableCell>{t(`organ.${p.organ_type}`)}</TableCell>
                          <TableCell>
                            <span className="font-bold text-destructive">{(p as any).risk_score ?? "—"}</span>
                            <span className="text-muted-foreground text-xs">/100</span>
                          </TableCell>
                          <TableCell>{keyLab}</TableCell>
                          <TableCell>{riskBadge(p.risk_level)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{timeAgo(lastEval)}</TableCell>
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

        {/* All patients table */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("dashboard.totalPatients")}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonTable rows={6} cols={4} />
            ) : patients.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title={t("dashboard.noPatients")}
                description={t("dashboard.addFirstPatient") || "Add your first patient"}
                actionLabel={t("nav.addPatient")}
                onAction={() => navigate("/add-patient")}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.patient")}</TableHead>
                    <TableHead>{t("dashboard.organ")}</TableHead>
                    <TableHead>{t("dashboard.daysPostTx")}</TableHead>
                    <TableHead>{t("dashboard.risk")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/patient/${p.id}`)}>
                      <TableCell className="font-medium">{p.full_name}</TableCell>
                      <TableCell>{t(`organ.${p.organ_type}`)}</TableCell>
                      <TableCell>{daysSince(p.created_at)}</TableCell>
                      <TableCell>{riskBadge(p.risk_level)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

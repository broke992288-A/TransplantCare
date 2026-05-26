import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDoctorPatientsWithLabs } from "@/hooks/usePatients";
import { useOverdueLabSchedules } from "@/hooks/useLabSchedule";
import { riskColorClass } from "@/utils/risk";
import { SkeletonTable } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

/** Lightweight relative time for dashboard */
function relativeLabText(recordedAt: string | undefined | null, t: (k: string) => string): string {
  if (!recordedAt) return t("dashboard.noRecentLabs");
  const days = Math.floor((Date.now() - new Date(recordedAt).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

/** Compact transplant age: 3d, 27d, 4mo, 2y */
function txAgeText(transplantDate: string | undefined | null): string {
  if (!transplantDate) return "Unknown";
  const days = Math.floor((Date.now() - new Date(transplantDate).getTime()) / 86400000);
  if (days < 0) return "Unknown";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, isLoading: loading } = useDoctorPatientsWithLabs();
  const { data: overdue } = useOverdueLabSchedules();

  const patients = data?.patients ?? [];
  const labs = data?.labs ?? {};

  const highRiskCount = patients.filter((p) => p.risk_level === "high").length;
  const overdueCount = Array.isArray(overdue) ? overdue.length : 0;

  const sorted = useMemo(() => {
    const rank = (lvl: string) => (lvl === "high" ? 0 : lvl === "medium" ? 1 : 2);
    return [...patients].sort((a, b) => {
      const r = rank(a.risk_level) - rank(b.risk_level);
      if (r !== 0) return r;
      return (b.risk_score ?? 0) - (a.risk_score ?? 0);
    });
  }, [patients]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* TOP: compact alert row */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t("dashboard.highRisk")}: {highRiskCount}
          </Badge>
          {overdueCount > 0 && (
            <Badge variant="outline" className="gap-1 border-orange-400 text-orange-600 bg-orange-50">
              <Clock className="h-3 w-3" />
              {t("dashboard.overdueLabs")}: {overdueCount}
            </Badge>
          )}
          <Badge variant="outline">
            {t("dashboard.totalPatients")}: {patients.length}
          </Badge>
        </div>

        {/* CENTER: patient table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4"><SkeletonTable rows={8} cols={6} /></div>
            ) : sorted.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Users}
                  title={t("dashboard.noPatients")}
                  description={t("dashboard.addFirstPatient")}
                  actionLabel={t("nav.addPatient")}
                  onAction={() => navigate("/add-patient")}
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.patient")}</TableHead>
                    <TableHead>{t("dashboard.organ")}</TableHead>
                    <TableHead>{t("dashboard.risk")}</TableHead>
                    <TableHead>{t("dashboard.lastLab")}</TableHead>
                    <TableHead>{t("dashboard.txAge")}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((p) => {
                    const lab = labs[p.id];
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/patient/${p.id}`)}
                      >
                        <TableCell className="font-medium py-2">{p.full_name}</TableCell>
                        <TableCell className="py-2">{t(`organ.${p.organ_type}`)}</TableCell>
                        <TableCell className="py-2">
                          <Badge className={riskColorClass(p.risk_level)}>{t(`risk.${p.risk_level}`)}</Badge>
                        </TableCell>
                        <TableCell className="py-2 text-sm text-muted-foreground">{relativeLabText(lab?.recorded_at, t)}</TableCell>
                        <TableCell className="py-2 text-sm text-muted-foreground">{txAgeText(p.transplant_date)}</TableCell>
                        <TableCell className="py-2 text-muted-foreground"><ChevronRight className="h-4 w-4" /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* BOTTOM: add patient */}
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link to="/add-patient"><Plus className="mr-1 h-4 w-4" /> {t("nav.addPatient")}</Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

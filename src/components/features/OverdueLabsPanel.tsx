import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, AlertTriangle, Info } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useOverdueLabSchedules } from "@/hooks/useLabSchedule";
import { SkeletonTable } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";

function statusBadge(status: string) {
  switch (status) {
    case "overdue":
      return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Overdue</Badge>;
    case "due_soon":
      return <Badge className="bg-warning/10 text-warning border-warning/30">Due soon</Badge>;
    default:
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">On schedule</Badge>;
  }
}

export default function OverdueLabsPanel() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: schedules, isLoading } = useOverdueLabSchedules();

  // Filter to only overdue and due_soon
  const actionable = (schedules ?? []).filter((s) => s.status === "overdue" || s.status === "due_soon");
  // Deduplicate: show only the most urgent per patient
  const byPatient = new Map<string, typeof actionable[0]>();
  actionable.forEach((s) => {
    const existing = byPatient.get(s.patient_id);
    if (!existing || s.status === "overdue") {
      byPatient.set(s.patient_id, s);
    }
  });
  const items = Array.from(byPatient.values()).sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue") return -1;
    if (b.status === "overdue" && a.status !== "overdue") return 1;
    return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
  });

  if (!isLoading && items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg">{t("schedule.overdueTitle")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonTable rows={3} cols={5} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard.patient")}</TableHead>
                  <TableHead>{t("schedule.lastLabDate")}</TableHead>
                  <TableHead>{t("schedule.expectedDate")}</TableHead>
                  <TableHead>{t("schedule.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/patient/${item.patient_id}`)}
                  >
                    <TableCell className="font-medium">{item.patient_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.last_lab_date ? new Date(item.last_lab_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(item.scheduled_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{statusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{t("schedule.medicalNote")}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

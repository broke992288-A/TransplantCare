import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarClock, Info, Trash2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useOverdueLabSchedules, useInvalidateLabSchedules } from "@/hooks/useLabSchedule";
import { SkeletonTable } from "@/components/ui/skeleton-card";
import { deleteLabSchedule } from "@/services/labScheduleService";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/errorHandler";

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  switch (status) {
    case "overdue":
      return <Badge className="bg-destructive/10 text-destructive border-destructive/30">{t("schedule.overdue")}</Badge>;
    case "due_soon":
      return <Badge className="bg-warning/10 text-warning border-warning/30">{t("schedule.dueSoon")}</Badge>;
    default:
      return <Badge className="bg-success/10 text-success border-success/30">{t("schedule.onSchedule")}</Badge>;
  }
}

export default function OverdueLabsPanel() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: schedules, isLoading } = useOverdueLabSchedules();
  const invalidate = useInvalidateLabSchedules();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const actionable = (schedules ?? []).filter((s) => s.status === "overdue" || s.status === "due_soon");
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

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteLabSchedule(pendingDelete.id);
      invalidate();
      toast({ title: t("common.delete"), description: pendingDelete.name });
    } catch (err) {
      toast({ title: t("common.error"), description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

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
                  <TableHead className="w-12"></TableHead>
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
                    <TableCell><StatusBadge status={item.status} t={t} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete({ id: item.id, name: item.patient_name });
                        }}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.delete")}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} — {pendingDelete && new Date(items.find(i => i.id === pendingDelete.id)?.scheduled_date ?? "").toLocaleDateString()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

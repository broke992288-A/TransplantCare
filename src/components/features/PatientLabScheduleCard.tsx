import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle2, AlertTriangle, Clock, Info } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useLabSchedules } from "@/hooks/useLabSchedule";

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "overdue":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "due_soon":
      return <Clock className="h-4 w-4 text-warning" />;
    default:
      return <CalendarClock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string, t: (k: string) => string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">{t("schedule.completed")}</Badge>;
    case "overdue":
      return <Badge className="bg-destructive/10 text-destructive border-destructive/30">{t("schedule.overdue")}</Badge>;
    case "due_soon":
      return <Badge className="bg-warning/10 text-warning border-warning/30">{t("schedule.dueSoon")}</Badge>;
    default:
      return <Badge variant="outline">{t("schedule.upcoming")}</Badge>;
  }
}

function computeStatus(scheduledDate: string, currentStatus: string): string {
  if (currentStatus === "completed") return "completed";
  const diff = Math.floor((new Date(scheduledDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "due_soon";
  return "upcoming";
}

interface Props {
  patientId: string;
  isPatientView?: boolean;
}

export default function PatientLabScheduleCard({ patientId, isPatientView = false }: Props) {
  const { t } = useLanguage();
  const { data: schedules = [], isLoading } = useLabSchedules(patientId);

  if (isLoading) return null;

  // Compute real status and sort
  const processed = schedules.map((s) => ({
    ...s,
    computedStatus: computeStatus(s.scheduled_date, s.status),
  }));

  // Show upcoming/due_soon/overdue (not completed unless recent)
  const now = Date.now();
  const twoWeeksAgo = now - 14 * 86400000;
  const visible = processed.filter((s) => {
    if (s.computedStatus === "completed") {
      return new Date(s.scheduled_date).getTime() > twoWeeksAgo;
    }
    return true;
  }).slice(0, 8);

  if (visible.length === 0) return null;

  // Patient-specific reminder messages
  const overdueCount = visible.filter((s) => s.computedStatus === "overdue").length;
  const dueSoonCount = visible.filter((s) => s.computedStatus === "due_soon").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("schedule.title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Patient reminders */}
        {isPatientView && overdueCount > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <span>{t("schedule.overdueReminder")}</span>
          </div>
        )}
        {isPatientView && dueSoonCount > 0 && overdueCount === 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <span>{t("schedule.dueSoonReminder")}</span>
          </div>
        )}

        <div className="space-y-2">
          {visible.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                s.computedStatus === "overdue"
                  ? "border-destructive/30 bg-destructive/5"
                  : s.computedStatus === "due_soon"
                  ? "border-warning/30 bg-warning/5"
                  : s.computedStatus === "completed"
                  ? "border-green-500/20 bg-green-500/5"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(s.computedStatus)}
                <div>
                  <p className="text-sm font-medium">
                    {new Date(s.scheduled_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("schedule.scheduledLab")}</p>
                </div>
              </div>
              {getStatusBadge(s.computedStatus, t)}
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{t("schedule.medicalNote")}</span>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Pill, FlaskConical, CalendarClock, FileText, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLinkedPatient } from "@/hooks/usePatients";
import { usePatientHomeLabs } from "@/hooks/usePatientDetail";
import { usePatientMedications } from "@/hooks/useMedications";
import { useLabSchedules } from "@/hooks/useLabSchedule";
import { useDoctorNotes } from "@/hooks/useDoctorNotes";

// --- Simple lab status helpers ---
interface LabCheck {
  label: string;
  value: number | null;
  status: "normal" | "high" | "critical";
}

function kidneyChecks(lab: any, t: (k: string) => string): LabCheck[] {
  return [
    {
      label: t("add.creatinine"),
      value: lab.creatinine,
      status: lab.creatinine == null ? "normal" : lab.creatinine > 2.5 ? "critical" : lab.creatinine > 1.5 ? "high" : "normal",
    },
    {
      label: t("add.egfr"),
      value: lab.egfr,
      // eGFR is inverted — lower is worse
      status: lab.egfr == null ? "normal" : lab.egfr < 30 ? "critical" : lab.egfr < 60 ? "high" : "normal",
    },
    {
      label: t("add.tacrolimus"),
      value: lab.tacrolimus_level,
      status: lab.tacrolimus_level == null ? "normal" : (lab.tacrolimus_level < 4 || lab.tacrolimus_level > 12) ? "critical" : (lab.tacrolimus_level < 6 || lab.tacrolimus_level > 10) ? "high" : "normal",
    },
  ];
}

function liverChecks(lab: any, t: (k: string) => string): LabCheck[] {
  return [
    {
      label: t("add.alt"),
      value: lab.alt,
      status: lab.alt == null ? "normal" : lab.alt > 500 ? "critical" : lab.alt > 60 ? "high" : "normal",
    },
    {
      label: t("add.totalBilirubin"),
      value: lab.total_bilirubin,
      status: lab.total_bilirubin == null ? "normal" : lab.total_bilirubin > 10 ? "critical" : lab.total_bilirubin > 1.5 ? "high" : "normal",
    },
    {
      label: t("add.tacrolimus"),
      value: lab.tacrolimus_level,
      status: lab.tacrolimus_level == null ? "normal" : (lab.tacrolimus_level < 4 || lab.tacrolimus_level > 12) ? "critical" : (lab.tacrolimus_level < 6 || lab.tacrolimus_level > 10) ? "high" : "normal",
    },
  ];
}

function statusIcon(status: "normal" | "high" | "critical") {
  switch (status) {
    case "normal": return <CheckCircle2 className="h-5 w-5 text-success" />;
    case "high": return <AlertTriangle className="h-5 w-5 text-warning" />;
    case "critical": return <XCircle className="h-5 w-5 text-destructive" />;
  }
}

function statusLabel(status: "normal" | "high" | "critical") {
  switch (status) {
    case "normal": return "Normal ✅";
    case "high": return "High ⚠️";
    case "critical": return "Critical 🔴";
  }
}

// --- Status banner config ---
const STATUS_CONFIG = {
  low: {
    emoji: "🟢",
    title: "Your condition is stable",
    subtitle: "Continue taking your medications as prescribed",
    bgClass: "bg-success/10 border-success/30",
    textClass: "text-success",
  },
  medium: {
    emoji: "🟠",
    title: "Attention required",
    subtitle: "Your doctor will review your latest results",
    bgClass: "bg-warning/10 border-warning/30",
    textClass: "text-warning",
  },
  high: {
    emoji: "🔴",
    title: "Please contact your doctor",
    subtitle: "Your doctor has been notified about your condition",
    bgClass: "bg-amber-500/10 border-amber-500/30",
    textClass: "text-amber-600",
  },
} as const;

export default function PatientHome() {
  const { t } = useLanguage();
  const { data: patient, isLoading: loadingPatient } = useLinkedPatient();
  const { data: allLabs = [] } = usePatientHomeLabs(patient?.id, 2);
  const { data: medications = [] } = usePatientMedications(patient?.id);
  const { data: schedules = [] } = useLabSchedules(patient?.id);
  const { data: notes = [] } = useDoctorNotes(patient?.id, 1);

  const loading = loadingPatient;
  const latestLab = allLabs[0] ?? null;

  // Next upcoming lab
  const today = new Date().toISOString().slice(0, 10);
  const nextSchedule = schedules.find((s: any) => s.status === "upcoming" || s.status === "due_soon" || (s.status === "overdue"));
  const overdueSchedule = schedules.find((s: any) => s.status === "overdue");

  // Active medications (first one as "today's action")
  const activeMeds = medications.filter((m: any) => m.is_active);

  // Latest doctor note
  const lastNote = notes[0] ?? null;

  const riskLevel = (patient?.risk_level ?? "low") as keyof typeof STATUS_CONFIG;
  const config = STATUS_CONFIG[riskLevel] ?? STATUS_CONFIG.low;

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-center py-12">{t("home.loading")}</p>
        ) : !patient ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">{t("home.noLinked")}</p></CardContent></Card>
        ) : (
          <>
            {/* TOP — Status Card */}
            <Card className={`border-2 ${config.bgClass}`}>
              <CardContent className="py-8 text-center space-y-2">
                <div className="text-5xl">{config.emoji}</div>
                <h1 className={`text-xl font-bold ${config.textClass}`}>{config.title}</h1>
                <p className="text-sm text-muted-foreground">{config.subtitle}</p>
                {riskLevel === "high" && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-sm text-amber-600">
                    <Stethoscope className="h-4 w-4" />
                    <span>{t("home.highRiskWarning")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MIDDLE — Today's Actions */}
            <Card>
              <CardContent className="py-5 space-y-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Today's Actions
                </h2>

                {/* Next medication */}
                {activeMeds.length > 0 ? (
                  <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                    <Pill className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{activeMeds[0].medication_name} {activeMeds[0].dosage}</p>
                      <p className="text-xs text-muted-foreground">
                        {activeMeds[0].frequency === "daily" ? "Take once daily" :
                         activeMeds[0].frequency === "twice_daily" ? "Take twice daily" :
                         activeMeds[0].frequency}
                      </p>
                      {activeMeds.length > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          + {activeMeds.length - 1} more medication{activeMeds.length > 2 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active medications</p>
                )}

                {/* Next lab date */}
                {nextSchedule ? (
                  <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                    <FlaskConical className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">
                        Lab test {overdueSchedule ? "overdue" : "due"}: {new Date(nextSchedule.scheduled_date).toLocaleDateString()}
                      </p>
                      {overdueSchedule && (
                        <Badge className="mt-1 bg-destructive/10 text-destructive border-destructive/30" variant="outline">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                    <FlaskConical className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">No upcoming lab tests</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BOTTOM — Latest Lab Summary (simple) */}
            {latestLab && (
              <Card>
                <CardContent className="py-5 space-y-4">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-primary" />
                    Latest Results
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(latestLab.recorded_at).toLocaleDateString()}
                  </p>
                  <div className="space-y-2">
                    {(patient.organ_type === "liver"
                      ? liverChecks(latestLab, t)
                      : kidneyChecks(latestLab, t)
                    ).map((check) => (
                      check.value != null && (
                        <div key={check.label} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            {statusIcon(check.status)}
                            <div>
                              <p className="text-sm font-medium">{check.label}</p>
                              <p className="text-lg font-bold tabular-nums">{check.value}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium">{statusLabel(check.status)}</span>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Doctor Instructions */}
            {lastNote?.plan && (
              <Card>
                <CardContent className="py-5 space-y-3">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Doctor's Instructions
                  </h2>
                  <div className="rounded-lg border p-3 bg-primary/5 border-primary/20">
                    <p className="text-sm leading-relaxed">{lastNote.plan}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(lastNote.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

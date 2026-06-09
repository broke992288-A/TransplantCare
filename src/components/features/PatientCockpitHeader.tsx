import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pill, Trash2, Stethoscope, CalendarClock, AlertTriangle, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EditPatientDialog from "@/components/features/EditPatientDialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { deletePatient } from "@/services/patientService";
import { riskColorClass } from "@/utils/risk";
import { useLabSchedules } from "@/hooks/useLabSchedule";

import type { RiskSnapshot } from "@/services/riskSnapshotService";
import { useClinicalLogic } from "@/hooks/useClinicalLogic";
import type { OrganType } from "@/types/patient";

interface Props {
  patient: Record<string, any>;
  latestRisk: RiskSnapshot | null;
  latestLab?: Record<string, any> | null;
  onUpdated: () => void;
}

export default function PatientCockpitHeader({ patient, latestRisk, latestLab, onUpdated }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: schedules = [] } = useLabSchedules(patient.id);

  const { tacrolimusTarget, criticalCount, evaluation } = useClinicalLogic({
    organType: patient.organ_type as OrganType,
    lab: latestLab,
    patient: {
      id: patient.id,
      transplant_date: patient.transplant_date,
      transplant_number: patient.transplant_number,
      dialysis_history: patient.dialysis_history,
      blood_type: patient.blood_type,
      donor_blood_type: patient.donor_blood_type,
      titer_therapy: patient.titer_therapy,
    },
  });

  const riskScore = latestRisk?.score ?? patient.risk_score ?? 0;
  const riskLevel = latestRisk?.risk_level ?? patient.risk_level ?? "low";

  const nextSchedule = schedules.find(s => s.status !== "completed" && new Date(s.scheduled_date) >= new Date(new Date().toDateString()));
  const overdueSchedule = schedules.find(s => s.status !== "completed" && new Date(s.scheduled_date) < new Date(new Date().toDateString()) && !s.completed_lab_id);
  const displaySchedule = overdueSchedule ?? nextSchedule;

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Top row: back + name + actions */}
          <div className="flex items-start gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 -ml-1" onClick={() => navigate("/patients")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl font-bold leading-tight break-words">{patient.full_name}</h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs sm:text-sm text-muted-foreground">
                <span>{t(`organ.${patient.organ_type}`)}</span>
                {patient.transplant_date && <span>• {new Date(patient.transplant_date).toLocaleDateString()}</span>}
                {patient.transplant_number && <span>• #{patient.transplant_number}</span>}
                {patient.blood_type && <span>• {patient.blood_type}</span>}
                {patient.country && <Badge variant="outline" className="text-[10px] sm:text-xs">{patient.country}</Badge>}
              </div>
            </div>

            {/* Risk score - compact on mobile */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black tabular-nums leading-none">{riskScore}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{t("risk.score")}</div>
                </div>
                <Badge className={`text-[10px] sm:text-sm px-1.5 sm:px-3 py-0.5 sm:py-1 ${riskColorClass(riskLevel)}`}>
                  {t(`risk.${riskLevel}`)}
                </Badge>
              </div>
              {displaySchedule && (
                <div className="flex items-center gap-1">
                  <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span className="text-[10px] sm:text-sm font-medium">{new Date(displaySchedule.scheduled_date).toLocaleDateString()}</span>
                  {overdueSchedule && <Badge variant="destructive" className="text-[9px] px-1 py-0">!</Badge>}
                </div>
              )}
            </div>
          </div>

          {/* Stale lab data banner — informational only */}
          {(() => {
            if (!latestLab?.recorded_at) return null;
            const hasMarker =
              latestLab.creatinine != null ||
              latestLab.tacrolimus_level != null ||
              latestLab.alt != null ||
              latestLab.ast != null;
            if (!hasMarker) return null;
            const ageDays = Math.floor((Date.now() - new Date(latestLab.recorded_at).getTime()) / 86400000);
            if (ageDays <= 5) return null;
            const elevated = ageDays > 10;
            return (
              <div className={`rounded-md border px-3 py-2 flex items-center gap-2 text-sm ${
                elevated ? "border-warning/40 bg-warning/10" : "border-border bg-muted/40"
              }`}>
                <Clock className={`h-4 w-4 flex-shrink-0 ${elevated ? "text-warning" : "text-muted-foreground"}`} />
                <span>
                  <span className="font-medium">
                    {elevated ? "Lab data is stale" : "Lab data may be outdated"}:
                  </span>{" "}
                  <span className="text-muted-foreground">
                    Latest creatinine/tacrolimus/ALT-AST is {ageDays} days old. Risk interpretation requires fresh laboratory data.
                  </span>
                </span>
              </div>
            );
          })()}

          {/* Tacrolimus target info */}

          {tacrolimusTarget && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 flex items-center gap-3 text-sm">
              <Info className="h-4 w-4 text-primary flex-shrink-0" />
              <span>
                <span className="font-medium">Tacrolimus C0 target:</span>{" "}
                <span className="text-primary font-bold">{tacrolimusTarget.target} ng/mL</span>
                <span className="text-muted-foreground"> • {tacrolimusTarget.stage} • {tacrolimusTarget.guideline}</span>
              </span>
            </div>
          )}

          {/* Clinical warnings from ClinicalLogic */}
          {criticalCount > 0 && evaluation?.warnings
            .filter((w) => w.severity === "critical")
            .slice(0, 2)
            .map((w, i) => (
              <div key={i} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <span className="font-medium">{w.title}: <span className="font-normal text-muted-foreground">{w.message}</span></span>
              </div>
            ))}

          {riskLevel === "high" && criticalCount === 0 && (
            <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 flex items-center gap-2 text-sm">
              <Stethoscope className="h-4 w-4 text-warning" />
              <span className="font-medium">{t("detail.underReview")}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/patient/${patient.id}/medications`}>
              <Button variant="outline" size="sm"><Pill className="h-4 w-4 mr-1" />{t("med.title")}</Button>
            </Link>
            <EditPatientDialog patient={patient} onUpdated={onUpdated} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" />{t("common.delete")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("detail.confirmDelete")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("detail.confirmDeleteDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                    try {
                      await deletePatient(patient.id);
                      toast({ title: t("detail.patientDeleted") });
                      navigate("/patients");
                    } catch (err: unknown) {
                      const message = err instanceof Error ? err.message : String(err);
                      toast({ title: t("common.error"), description: message, variant: "destructive" });
                    }
                  }}>{t("common.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

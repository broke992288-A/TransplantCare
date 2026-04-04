import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pill, Trash2, Stethoscope } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EditPatientDialog from "@/components/features/EditPatientDialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { deletePatient } from "@/services/patientService";
import { riskColorClass } from "@/utils/risk";
import patientPhotoAbdulhayot from "@/assets/patient-photo-edited.jpg";
import type { RiskSnapshot } from "@/services/riskSnapshotService";

interface Props {
  patient: Record<string, any>;
  latestRisk: RiskSnapshot | null;
  onUpdated: () => void;
}

export default function PatientCockpitHeader({ patient, latestRisk, onUpdated }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const riskScore = latestRisk?.score ?? patient.risk_score ?? 0;
  const riskLevel = latestRisk?.risk_level ?? patient.risk_level ?? "low";

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Top row: back + name + actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/patients")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {patient.full_name.includes("bdulhayot") && (
              <div className="h-14 w-14 rounded-lg overflow-hidden border-2 border-primary/20 shrink-0">
                <img src={patientPhotoAbdulhayot} alt={patient.full_name} className="h-full w-full object-cover object-[50%_0%] scale-125" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{patient.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>{t(`organ.${patient.organ_type}`)}</span>
                {patient.transplant_date && <span>• {new Date(patient.transplant_date).toLocaleDateString()}</span>}
                {patient.transplant_number && <span>• #{patient.transplant_number}</span>}
                {patient.blood_type && <span>• {patient.blood_type}</span>}
                {patient.country && <Badge variant="outline" className="text-xs">{patient.country}</Badge>}
              </div>
            </div>

            {/* Risk score */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center">
                <div className="text-3xl font-black tabular-nums">{riskScore}</div>
                <div className="text-xs text-muted-foreground">{t("risk.score")}</div>
              </div>
              <Badge className={`text-sm px-3 py-1 ${riskColorClass(riskLevel)}`}>
                {t(`risk.${riskLevel}`)}
              </Badge>
            </div>
          </div>

          {/* Under-review banner */}
          {patient.risk_level === "high" && (
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

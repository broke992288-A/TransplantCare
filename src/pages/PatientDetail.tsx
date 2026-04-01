import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, FlaskConical, Shield, Trash2, Pill, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AddLabDialog from "@/components/features/AddLabDialog";
import LabUploadDialog from "@/components/features/LabUploadDialog";
import LabHistoryTable from "@/components/features/LabHistoryTable";
import EditPatientDialog from "@/components/features/EditPatientDialog";
import RiskScoreCard from "@/components/features/RiskScoreCard";
import PredictionPanel from "@/components/features/PredictionPanel";
import PatientAlertsCard from "@/components/features/PatientAlertsCard";
import PatientLabScheduleCard from "@/components/features/PatientLabScheduleCard";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePatientDetail } from "@/hooks/usePatientDetail";
import { useRiskSnapshots } from "@/hooks/useRiskSnapshots";
import { updatePatient, deletePatient } from "@/services/patientService";
import { insertEvent } from "@/services/eventService";
import { riskColorClass } from "@/utils/risk";
import { logAudit } from "@/services/auditService";
import patientPhotoAbdulhayot from "@/assets/patient-photo-edited.jpg";
import { computeRiskScore } from "@/services/riskSnapshotService";
import type { RiskSnapshot } from "@/services/riskSnapshotService";
import { triggerRiskRecalculation } from "@/services/riskRecalculationService";
import { RefreshCw, Loader2 } from "lucide-react";

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const { patient, labs: allLabs, latestLab, events: timeline, loading, invalidateAll } = usePatientDetail(id);
  const { data: riskSnapshots = [] } = useRiskSnapshots(id, 20);
  
  // Find the snapshot matching the latest lab, or compute on-the-fly if missing
  const latestRisk: RiskSnapshot | null = (() => {
    if (riskSnapshots.length === 0 && !latestLab) return null;
    if (latestLab) {
      const matchingSnapshot = riskSnapshots.find(s => s.lab_result_id === latestLab.id);
      if (matchingSnapshot) return matchingSnapshot;
      // No snapshot for the latest lab — compute on-the-fly using a 5-test trend window
      const historicalLabs = allLabs.slice(1, 5);
      const computed = computeRiskScore(patient?.organ_type ?? "kidney", latestLab, {
        transplant_number: patient?.transplant_number,
        dialysis_history: patient?.dialysis_history,
        transplant_date: patient?.transplant_date,
      }, historicalLabs);
      return {
        id: "computed",
        patient_id: latestLab.patient_id,
        lab_result_id: latestLab.id,
        score: computed.score,
        risk_level: computed.level,
        creatinine: latestLab.creatinine,
        alt: latestLab.alt,
        ast: latestLab.ast,
        total_bilirubin: latestLab.total_bilirubin,
        tacrolimus_level: latestLab.tacrolimus_level,
        details: { flags: computed.flags, explanations: computed.explanations },
        trend_flags: computed.flags.filter((f: string) => f.includes("increase") || f.includes("drop") || f.includes("declined")),
        algorithm_version: "v2.0-kdigo2024",
        created_at: latestLab.recorded_at ?? latestLab.created_at,
      } as RiskSnapshot;
    }
    return riskSnapshots[0] ?? null;
  })();
  
  // Previous risk = snapshot for the second latest lab
  const prevRisk = (() => {
    if (allLabs.length < 2 || riskSnapshots.length < 1) return null;
    const secondLab = allLabs[1];
    const matchingPrev = riskSnapshots.find(s => s.lab_result_id === secondLab.id);
    return matchingPrev ?? riskSnapshots[0] ?? null;
  })();

  useEffect(() => {
    if (id) logAudit({ action: "doctor_view_patient", entityType: "patient", entityId: id });
  }, [id]);

  const [overrideLevel, setOverrideLevel] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    if (!id) return;
    setRecalculating(true);
    try {
      const res = await triggerRiskRecalculation(id);
      toast({ title: t("detail.riskRecalculated"), description: `${res.snapshots_created ?? 0} snapshot(s)` });
      invalidateAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  const handleOverride = async () => {
    if (!user || !id || !overrideLevel || !overrideReason.trim()) {
      toast({ title: t("detail.provideReason"), variant: "destructive" });
      return;
    }
    setOverriding(true);
    try {
      await updatePatient(id, { risk_level: overrideLevel });
      await insertEvent({ patient_id: id, event_type: "risk_override", description: `${t("event.riskOverridden")}: ${t(`risk.${overrideLevel}`)} — ${overrideReason}`, created_by: user.id });
      setOverrideLevel(""); setOverrideReason("");
      toast({ title: t("detail.riskOverridden") });
      invalidateAll();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setOverriding(false); }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">{t("common.loading")}</div></DashboardLayout>;
  if (!patient) return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">{t("detail.patientNotFound")}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4 overflow-hidden">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/patients")}><ArrowLeft className="h-5 w-5" /></Button>
            {patient.full_name.includes("bdulhayot") && (
              <div className="h-24 w-24 rounded-lg overflow-hidden border-2 border-primary/20 shrink-0">
                <img src={patientPhotoAbdulhayot} alt={patient.full_name} className="h-full w-full object-cover object-[50%_0%] scale-125" />
              </div>
            )}
            <span className="text-lg font-bold truncate">{patient.full_name}</span>
            <Badge className={`shrink-0 ${riskColorClass(patient.risk_level)}`}>{t(`risk.${patient.risk_level}`)}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/patient/${id}/medications`}>
              <Button variant="outline" size="sm"><Pill className="h-4 w-4 mr-1" />{t("med.title")}</Button>
            </Link>
            <EditPatientDialog patient={patient} onUpdated={invalidateAll} />
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
                  } catch (err: any) {
                    toast({ title: t("common.error"), description: err.message, variant: "destructive" });
                  }
                }}>{t("common.delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </div>

        {patient.risk_level === "high" && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-warning" />
            <span className="font-medium">{t("detail.underReview")}</span>
          </div>
        )}

        <div className="space-y-2">
          <RiskScoreCard snapshot={latestRisk} prevSnapshot={prevRisk} />
          <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating} className="w-full">
            {recalculating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            {t("detail.recalculateRisk")}
          </Button>
        </div>

        <PredictionPanel
          patientId={patient.id}
          patientName={patient.full_name}
          organType={patient.organ_type}
          currentRisk={latestRisk?.risk_level ?? patient.risk_level}
          patientData={{
            blood_type: patient.blood_type,
            donor_blood_type: patient.donor_blood_type,
            titer_therapy: patient.titer_therapy,
          }}
        />

        <PatientAlertsCard patientId={patient.id} />
        <PatientLabScheduleCard patientId={patient.id} />

        <Card>
          <CardHeader><CardTitle className="text-lg">{t("detail.patientInfo")}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow label={t("home.organ")} value={t(`organ.${patient.organ_type}`)} />
            <InfoRow label={t("add.gender")} value={patient.gender ? t(`gender.${patient.gender}`) : "—"} />
            <InfoRow label={t("detail.dob")} value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—"} />
            <InfoRow label={t("detail.added")} value={new Date(patient.created_at).toLocaleDateString()} />
            {patient.blood_type && <InfoRow label={t("add.bloodType")} value={patient.blood_type} />}
            {patient.donor_blood_type && <InfoRow label={t("add.donorBloodType")} value={patient.donor_blood_type} />}
            {patient.blood_type && patient.donor_blood_type && patient.blood_type !== patient.donor_blood_type && (
              <InfoRow label={t("add.titerTherapy")} value={patient.titer_therapy ? t("add.yes") : t("add.no")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary shrink-0" />
              <CardTitle className="text-lg">{t("detail.latestLabs")}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <AddLabDialog patientId={patient.id} organType={patient.organ_type} onLabAdded={invalidateAll} patientData={{ transplant_number: patient.transplant_number, dialysis_history: patient.dialysis_history, transplant_date: patient.transplant_date }} />
              <LabUploadDialog patientId={patient.id} organType={patient.organ_type} onLabAdded={invalidateAll} patientData={{ transplant_number: patient.transplant_number, dialysis_history: patient.dialysis_history }} />
            </div>
          </CardHeader>
          <CardContent>
            {latestLab ? (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                {patient.organ_type === "liver" ? (
                  <>
                    <LabItem label={t("add.tacrolimus")} value={latestLab.tacrolimus_level} />
                    <LabItem label={t("add.alt")} value={latestLab.alt} />
                    <LabItem label={t("add.ast")} value={latestLab.ast} />
                    <LabItem label={t("add.totalBilirubin")} value={latestLab.total_bilirubin} />
                    <LabItem label={t("add.directBilirubin")} value={latestLab.direct_bilirubin} />
                  </>
                ) : (
                  <>
                    <LabItem label={t("add.creatinine")} value={latestLab.creatinine} />
                    <LabItem label={t("add.egfr")} value={latestLab.egfr} />
                    <LabItem label={t("add.proteinuria")} value={latestLab.proteinuria} />
                    <LabItem label={t("add.potassium")} value={latestLab.potassium} />
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("detail.noEvents")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t("detail.aiAdvisory")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("detail.orOverride")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={overrideLevel} onValueChange={setOverrideLevel}>
                <SelectTrigger><SelectValue placeholder={t("detail.newRiskLevel")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">LOW</SelectItem>
                  <SelectItem value="medium">MEDIUM</SelectItem>
                  <SelectItem value="high">HIGH</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder={t("detail.overrideReason")} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="min-h-[60px]" />
            </div>
            <Button size="sm" variant="outline" onClick={handleOverride} disabled={overriding}>{t("detail.overrideRisk")}</Button>
          </CardContent>
        </Card>

        {allLabs.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t("detail.labHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <LabHistoryTable labs={allLabs} organType={patient.organ_type} editable onLabChanged={invalidateAll} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t("detail.timeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("detail.noEvents")}</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 border-l-2 border-primary/20 pl-4 py-1">
                    <div>
                      <p className="text-sm font-medium">{ev.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

function LabItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value ?? "—"}</p>
    </div>
  );
}

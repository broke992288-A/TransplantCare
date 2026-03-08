import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { insertLabResult, fetchLabsByPatientId } from "@/services/labService";
import { insertEvent } from "@/services/eventService";
import { computeRiskScore, insertRiskSnapshot } from "@/services/riskSnapshotService";
import { insertPatientAlert } from "@/services/patientAlertService";
import { ValidatedInput } from "@/components/ui/form-field";
import { liverLabSchema, kidneyLabSchema } from "@/lib/validations";

interface AddLabDialogProps {
  patientId: string;
  organType: string;
  onLabAdded: () => void;
  patientData?: { transplant_number?: number | null; dialysis_history?: boolean | null; transplant_date?: string | null };
}

export default function AddLabDialog({ patientId, organType, onLabAdded, patientData }: AddLabDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState<Record<string, string>>({
    tacrolimus_level: "", alt: "", ast: "", total_bilirubin: "", direct_bilirubin: "",
    creatinine: "", egfr: "", proteinuria: "", potassium: "",
  });

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const schema = organType === "liver" ? liverLabSchema : kidneyLabSchema;
    const fields = organType === "liver"
      ? { tacrolimus_level: form.tacrolimus_level, alt: form.alt, ast: form.ast, total_bilirubin: form.total_bilirubin, direct_bilirubin: form.direct_bilirubin }
      : { creatinine: form.creatinine, egfr: form.egfr, proteinuria: form.proteinuria, potassium: form.potassium };

    const result = schema.safeParse(fields);
    if (result.success) { setErrors({}); return true; }

    const newErrors: Record<string, string> = {};
    result.error.errors.forEach((e) => {
      const field = e.path[0]?.toString();
      if (field && !newErrors[field]) newErrors[field] = e.message;
    });
    setErrors(newErrors);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const labData: any = { patient_id: patientId };
      if (organType === "liver") {
        labData.tacrolimus_level = parseFloat(form.tacrolimus_level) || null;
        labData.alt = parseFloat(form.alt) || null;
        labData.ast = parseFloat(form.ast) || null;
        labData.total_bilirubin = parseFloat(form.total_bilirubin) || null;
        labData.direct_bilirubin = parseFloat(form.direct_bilirubin) || null;
      } else {
        labData.creatinine = parseFloat(form.creatinine) || null;
        labData.egfr = parseFloat(form.egfr) || null;
        labData.proteinuria = parseFloat(form.proteinuria) || null;
        labData.potassium = parseFloat(form.potassium) || null;
      }
      const savedLab = await insertLabResult(labData);

      // Fetch previous lab for trend analysis
      let prevLab = null;
      try {
        const prevLabs = await fetchLabsByPatientId(patientId, 2);
        // prevLabs[0] is the one we just inserted, prevLabs[1] is the previous
        prevLab = prevLabs.length > 1 ? prevLabs[1] : null;
      } catch { /* ignore */ }

      // Compute risk score with trend analysis
      try {
        const { score, level, flags, explanations } = computeRiskScore(
          organType, savedLab as any, patientData ?? {}, prevLab
        );
        const snapshot = await insertRiskSnapshot({
          patient_id: patientId,
          lab_result_id: savedLab.id,
          score,
          risk_level: level,
          creatinine: labData.creatinine ?? null,
          alt: labData.alt ?? null,
          ast: labData.ast ?? null,
          total_bilirubin: labData.total_bilirubin ?? null,
          tacrolimus_level: labData.tacrolimus_level ?? null,
          details: { flags, explanations },
        });

        // Create alert if risk is high or medium
        if (level === "high") {
          await insertPatientAlert({
            patient_id: patientId,
            risk_snapshot_id: snapshot?.id ?? null,
            severity: "critical",
            title: `${t("risk.highDetected")} (${score})`,
            message: flags.join("; "),
          });
        } else if (level === "medium") {
          await insertPatientAlert({
            patient_id: patientId,
            risk_snapshot_id: snapshot?.id ?? null,
            severity: "warning",
            title: `${t("risk.mediumDetected")} (${score})`,
            message: flags.join("; "),
          });
        }
      } catch (riskErr) {
        console.error("Risk calculation error:", riskErr);
      }

      await insertEvent({ patient_id: patientId, event_type: "lab_added", description: t("detail.labAddedEvent") });
      toast({ title: t("detail.labAdded") });
      setForm({ tacrolimus_level: "", alt: "", ast: "", total_bilirubin: "", direct_bilirubin: "", creatinine: "", egfr: "", proteinuria: "", potassium: "" });
      setErrors({});
      setOpen(false);
      onLabAdded();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> {t("detail.addLab")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("detail.addNewLab")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {organType === "liver" ? (
            <>
              <ValidatedInput label={t("add.tacrolimus")} required error={errors.tacrolimus_level} type="number" step="0.1" value={form.tacrolimus_level} onChange={(e) => set("tacrolimus_level", e.target.value)} />
              <ValidatedInput label={t("add.alt")} required error={errors.alt} type="number" value={form.alt} onChange={(e) => set("alt", e.target.value)} />
              <ValidatedInput label={t("add.ast")} required error={errors.ast} type="number" value={form.ast} onChange={(e) => set("ast", e.target.value)} />
              <ValidatedInput label={t("add.totalBilirubin")} required error={errors.total_bilirubin} type="number" step="0.1" value={form.total_bilirubin} onChange={(e) => set("total_bilirubin", e.target.value)} />
              <ValidatedInput label={t("add.directBilirubin")} required error={errors.direct_bilirubin} type="number" step="0.1" value={form.direct_bilirubin} onChange={(e) => set("direct_bilirubin", e.target.value)} />
            </>
          ) : (
            <>
              <ValidatedInput label={t("add.creatinine")} required error={errors.creatinine} type="number" step="0.1" value={form.creatinine} onChange={(e) => set("creatinine", e.target.value)} />
              <ValidatedInput label={t("add.egfr")} required error={errors.egfr} type="number" value={form.egfr} onChange={(e) => set("egfr", e.target.value)} />
              <ValidatedInput label={t("add.proteinuria")} required error={errors.proteinuria} type="number" step="0.1" value={form.proteinuria} onChange={(e) => set("proteinuria", e.target.value)} />
              <ValidatedInput label={t("add.potassium")} required error={errors.potassium} type="number" step="0.1" value={form.potassium} onChange={(e) => set("potassium", e.target.value)} />
            </>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="animate-spin mr-1" />}{t("detail.saveLab")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

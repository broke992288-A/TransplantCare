import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { insertLabResult, fetchLabsByPatientId } from "@/services/labService";
import { insertEvent } from "@/services/eventService";
import { computeRiskScoreAsync, insertRiskSnapshot } from "@/services/riskSnapshotService";
import { insertPatientAlert } from "@/services/patientAlertService";
import LabField from "@/components/features/LabField";
import { liverLabSchema, kidneyLabSchema } from "@/lib/validations";
import { STANDARD_UNITS } from "@/utils/unitConversion";
import { normalizeFields, type NormalizedField } from "@/utils/labNormalization";
import { autoCalculateEgfr } from "@/utils/egfrCalculator";
import { useLabReferenceProfiles, useLabCountries } from "@/hooks/useLabReferenceProfiles";

interface AddLabDialogProps {
  patientId: string;
  organType: string;
  onLabAdded: () => void;
  patientData?: { transplant_number?: number | null; dialysis_history?: boolean | null; transplant_date?: string | null; date_of_birth?: string | null; gender?: string | null };
  patientCountry?: string;
}

/** Country labels for display */
const COUNTRY_LABELS: Record<string, string> = {
  uzbekistan: "🇺🇿 O'zbekiston",
  india: "🇮🇳 India",
};

export default function AddLabDialog({ patientId, organType, onLabAdded, patientData, patientCountry }: AddLabDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [country, setCountry] = useState<string>(patientCountry || "uzbekistan");
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState<Record<string, string>>({
    tacrolimus_level: "", alt: "", ast: "", total_bilirubin: "", direct_bilirubin: "",
    creatinine: "", egfr: "", proteinuria: "", potassium: "",
  });

  const { data: countries } = useLabCountries();
  const { data: refProfiles } = useLabReferenceProfiles(country, organType);

  /** Map test_name → reference profile for quick lookup */
  const refMap = useMemo(() => {
    const map: Record<string, { min: number | null; max: number | null; unit: string }> = {};
    refProfiles?.forEach((p) => {
      map[p.test_name] = { min: p.min_value, max: p.max_value, unit: p.unit };
    });
    return map;
  }, [refProfiles]);

  /** Check if a value is outside reference range */
  const getFieldStatus = useCallback((key: string, value: string): "normal" | "warning" | "none" => {
    const ref = refMap[key];
    if (!ref || !value) return "none";
    const num = parseFloat(value);
    if (isNaN(num)) return "none";
    if ((ref.min !== null && num < ref.min) || (ref.max !== null && num > ref.max)) return "warning";
    return "normal";
  }, [refMap]);

  /** Get unit label for a field based on country profile */
  const getUnit = useCallback((key: string): string => {
    return refMap[key]?.unit ?? STANDARD_UNITS[key] ?? "";
  }, [refMap]);

  /** Get reference range text */
  const getRefRange = useCallback((key: string): string | null => {
    const ref = refMap[key];
    if (!ref) return null;
    const min = ref.min !== null ? ref.min : "—";
    const max = ref.max !== null ? ref.max : "—";
    return `${min}–${max} ${ref.unit}`;
  }, [refMap]);

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  /** Field list for the current organ type. */
  const fieldKeys = useMemo(
    () =>
      organType === "liver"
        ? ["tacrolimus_level", "alt", "ast", "total_bilirubin", "direct_bilirubin"]
        : ["creatinine", "egfr", "proteinuria", "potassium", "bk_virus_load", "cmv_load", "dsa_mfi"],
    [organType],
  );

  /**
   * Pipeline: raw form values (source units) → normalize to canonical units →
   * physiologic hard validation on canonical values → save.
   * Validating raw µmol/L values would wrongly reject e.g. creatinine 90 µmol/L.
   */
  const normalizeForm = useCallback(() => {
    const values: Record<string, string> = {};
    fieldKeys.forEach((k) => { values[k] = form[k] ?? ""; });
    return normalizeFields(values, (k) => refMap[k]?.unit ?? STANDARD_UNITS[k] ?? null);
  }, [fieldKeys, form, refMap]);

  const validateCanonical = (fields: Record<string, NormalizedField>): boolean => {
    const schema = organType === "liver" ? liverLabSchema : kidneyLabSchema;
    const required = organType === "liver"
      ? ["tacrolimus_level", "alt", "ast", "total_bilirubin", "direct_bilirubin"]
      : ["creatinine", "egfr", "proteinuria", "potassium"];

    const payload: Record<string, number | ""> = {};
    required.forEach((k) => {
      payload[k] = fields[k] ? fields[k].value : "";
    });

    const result = schema.safeParse(payload);
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

    setSaving(true);
    try {
      // 1. Normalize using explicitly known source units (no magnitude guessing)
      const { fields, ambiguous } = normalizeForm();

      if (ambiguous.length > 0) {
        toast({
          title: t("common.error"),
          description: `Birlik aniq emas: ${ambiguous.join(", ")}. Iltimos, mamlakat/birlikni tanlang.`,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // 2. Physiologic hard validation on canonical values
      if (!validateCanonical(fields)) { setSaving(false); return; }

      const labData: Record<string, string | number | null> = { patient_id: patientId };
      const conversionMessages: string[] = [];
      fieldKeys.forEach((key) => {
        const nf = fields[key];
        labData[key] = nf ? nf.value : null;
        if (nf?.converted) {
          conversionMessages.push(`${key}: ${nf.rawValue} ${nf.sourceUnit} → ${nf.value} ${nf.canonicalUnit}`);
        }
      });

      if (conversionMessages.length > 0) {
        toast({ title: "🔄 " + t("common.info"), description: conversionMessages.join(", ") });
      }

      // Auto-calculate eGFR if not provided (kidney)
      if (organType === "kidney" && !labData.egfr && labData.creatinine) {
        const autoEgfr = autoCalculateEgfr(labData.creatinine as number, patientData?.date_of_birth, patientData?.gender);
        if (autoEgfr !== null) {
          labData.egfr = autoEgfr;
          toast({ title: "eGFR", description: `Auto-calculated: ${autoEgfr} mL/min/1.73m² (CKD-EPI 2021)` });
        }
      }

      const savedLab = await insertLabResult(labData as Parameters<typeof insertLabResult>[0]);

      // Fetch recent labs for rolling 5-test trend analysis
      let historicalLabs: Awaited<ReturnType<typeof fetchLabsByPatientId>> = [];
      try {
        const recentLabs = await fetchLabsByPatientId(patientId, 5);
        historicalLabs = recentLabs.filter((lab) => lab.id !== savedLab.id).slice(0, 4);
      } catch { /* ignore */ }

      // Compute risk score using DB thresholds
      try {
        const { score, level, flags, explanations } = await computeRiskScoreAsync(
          organType, savedLab, patientData ?? {}, historicalLabs
        );
        const snapshot = await insertRiskSnapshot({
          patient_id: patientId,
          lab_result_id: savedLab.id,
          score,
          risk_level: level,
          creatinine: (labData.creatinine as number) ?? null,
          alt: (labData.alt as number) ?? null,
          ast: (labData.ast as number) ?? null,
          total_bilirubin: (labData.total_bilirubin as number) ?? null,
          tacrolimus_level: (labData.tacrolimus_level as number) ?? null,
          details: { flags, explanations },
        });

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  /**
   * Build props for the stable top-level LabField component. No component is
   * created here, so inputs are never remounted while typing.
   */
  const fieldProps = (
    fieldKey: string,
    label: string,
    opts: { required?: boolean; step?: string; placeholder?: string } = {},
  ) => ({
    fieldKey,
    label,
    value: form[fieldKey] ?? "",
    unit: getUnit(fieldKey),
    range: getRefRange(fieldKey),
    status: getFieldStatus(fieldKey, form[fieldKey] ?? ""),
    error: errors[fieldKey],
    onValueChange: set,
    ...opts,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> {t("detail.addLab")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("detail.addNewLab")}</DialogTitle></DialogHeader>

        {/* Country selector */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-8 text-sm border-0 bg-transparent shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(countries ?? ["uzbekistan", "india"]).map((c) => (
                <SelectItem key={c} value={c}>
                  {COUNTRY_LABELS[c] ?? c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {country && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {country === "uzbekistan" ? "µmol/L" : "mg/dL"}
            </Badge>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {organType === "liver" ? (
            <>
              <LabField {...fieldProps("tacrolimus_level", t("add.tacrolimus"))} />
              <LabField {...fieldProps("alt", t("add.alt"), { step: "1" })} />
              <LabField {...fieldProps("ast", t("add.ast"), { step: "1" })} />
              <LabField {...fieldProps("total_bilirubin", t("add.totalBilirubin"))} />
              <LabField {...fieldProps("direct_bilirubin", t("add.directBilirubin"))} />
            </>
          ) : (
            <>
              <LabField {...fieldProps("creatinine", t("add.creatinine"))} />
              <LabField {...fieldProps("egfr", `${t("add.egfr")} (auto)`, { required: false, placeholder: "Auto-calculated if empty" })} />
              <LabField {...fieldProps("proteinuria", t("add.proteinuria"))} />
              <LabField {...fieldProps("potassium", t("add.potassium"))} />
              <LabField {...fieldProps("bk_virus_load", "BK Virus (copies/ml)", { required: false, step: "1", placeholder: "PCR natija" })} />
              <LabField {...fieldProps("cmv_load", "CMV (copies/ml)", { required: false, step: "1", placeholder: "PCR natija" })} />
              <LabField {...fieldProps("dsa_mfi", "DSA MFI", { required: false, step: "1", placeholder: "Luminex natija" })} />
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

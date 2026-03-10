import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DateInputSeparate } from "@/components/features/DateInputSeparate";
import { ValidatedInput, FormField } from "@/components/ui/form-field";
import { insertPatient } from "@/services/patientService";
import { insertLabResult } from "@/services/labService";
import { insertEvents } from "@/services/eventService";
import { calculateRisk } from "@/utils/risk";
import { uzbekistanRegions } from "@/data/uzbekistanRegions";
import { patientSchema, liverLabSchema, kidneyLabSchema } from "@/lib/validations";
import type { OrganType } from "@/types/patient";

export default function AddPatient() {
  const [step, setStep] = useState<1 | 2>(1);
  const [organ, setOrgan] = useState<OrganType | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [form, setForm] = useState<Record<string, string>>({
    full_name: "", date_of_birth: "", gender: "male", transplant_number: "1", transplant_date: "",
    rejection_type: "", tacrolimus_level: "", alt: "", ast: "", total_bilirubin: "", direct_bilirubin: "",
    dialysis_history: "no", return_dialysis_date: "", creatinine: "", egfr: "", proteinuria: "",
    potassium: "", biopsy_result: "", region: "", district: "",
    blood_type: "", donor_blood_type: "", titer_therapy: "no",
  });

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };
  const selectOrgan = (o: OrganType) => { setOrgan(o); setStep(2); };

  const selectedRegionData = useMemo(
    () => uzbekistanRegions.find((r) => r.name === form.region),
    [form.region]
  );

  const handleRegionChange = (v: string) => {
    setForm((prev) => ({ ...prev, region: v, district: "" }));
    if (errors.region) setErrors((prev) => { const n = { ...prev }; delete n.region; return n; });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate patient fields
    const patientResult = patientSchema.safeParse({
      full_name: form.full_name,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      region: form.region,
      district: form.district,
      transplant_number: form.transplant_number,
      transplant_date: form.transplant_date,
      biopsy_result: form.biopsy_result || undefined,
    });

    if (!patientResult.success) {
      patientResult.error.errors.forEach((e) => {
        const field = e.path[0]?.toString();
        if (field && !newErrors[field]) newErrors[field] = e.message;
      });
    }

    // Validate lab fields
    if (organ === "liver") {
      const labResult = liverLabSchema.safeParse({
        tacrolimus_level: form.tacrolimus_level,
        alt: form.alt,
        ast: form.ast,
        total_bilirubin: form.total_bilirubin,
        direct_bilirubin: form.direct_bilirubin,
      });
      if (!labResult.success) {
        labResult.error.errors.forEach((e) => {
          const field = e.path[0]?.toString();
          if (field && !newErrors[field]) newErrors[field] = e.message;
        });
      }
    } else {
      const labResult = kidneyLabSchema.safeParse({
        creatinine: form.creatinine,
        egfr: form.egfr,
        proteinuria: form.proteinuria,
        potassium: form.potassium,
      });
      if (!labResult.success) {
        labResult.error.errors.forEach((e) => {
          const field = e.path[0]?.toString();
          if (field && !newErrors[field]) newErrors[field] = e.message;
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organ) return;
    if (!validateForm()) return;

    setSaving(true);
    try {
      const riskLevel = calculateRisk(organ, form);
      const patient = await insertPatient({
        full_name: form.full_name, date_of_birth: form.date_of_birth || null, gender: form.gender,
        organ_type: organ, risk_level: riskLevel, assigned_doctor_id: user.id,
        transplant_number: parseInt(form.transplant_number) || 1,
        transplant_date: form.transplant_date || null,
        rejection_type: organ === "liver" ? (form.rejection_type || null) : null,
        dialysis_history: organ === "kidney" ? form.dialysis_history === "yes" : false,
        return_dialysis_date: organ === "kidney" && form.dialysis_history === "yes" && form.return_dialysis_date ? form.return_dialysis_date : null,
        biopsy_result: form.biopsy_result || null,
        region: form.region || null,
        district: form.district || null,
      });

      const labData: any = { patient_id: patient.id };
      if (organ === "liver") {
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
      await insertLabResult(labData);

      const txLabel = organ === "liver" ? t("organ.liver") : t("organ.kidney");
      const events: { patient_id: string; event_type: string; description: string; created_by: string }[] = [
        { patient_id: patient.id, event_type: "transplant_added", description: `${txLabel} Tx #${form.transplant_number} — ${t("event.txAdded")}`, created_by: user.id },
      ];
      if (organ === "kidney" && form.dialysis_history === "yes") {
        events.push({ patient_id: patient.id, event_type: "dialysis_recorded", description: t("event.dialysisRecorded"), created_by: user.id });
      }
      await insertEvents(events);

      toast({ title: t("add.patientAdded"), description: `${form.full_name} — ${t("home.riskLevel")}: ${t(`risk.${riskLevel}`)}` });
      navigate("/doctor-dashboard");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (step === 1) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/doctor-dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold">{t("add.selectOrgan")}</h1>
              <p className="text-muted-foreground">{t("add.chooseType")}</p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {(["liver", "kidney"] as OrganType[]).map((o) => (
              <Card key={o} className="group cursor-pointer border-2 border-transparent transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10" onClick={() => selectOrgan(o)}>
                <CardHeader className="items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary text-3xl font-bold transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {o === "liver" ? "🫁" : "🫘"}
                  </div>
                  <CardTitle className="text-xl mt-4">{o === "liver" ? t("add.liverTransplant") : t("add.kidneyTransplant")}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription>{o === "liver" ? t("add.liverDesc") : t("add.kidneyDesc")}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setStep(1)}><ArrowLeft className="h-5 w-5" /></Button>
          <span className="text-lg font-bold">{organ === "liver" ? t("add.addLiver") : t("add.addKidney")}</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("add.patientInfo")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ValidatedInput label={t("add.fullName")} required error={errors.full_name} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} wrapperClassName="sm:col-span-2" />
              <FormField label={t("add.dob")} required error={errors.date_of_birth}>
                <DateInputSeparate value={form.date_of_birth} onChange={(v) => set("date_of_birth", v)} yearRange={[1940, new Date().getFullYear()]} />
              </FormField>
              <FormField label={t("add.gender")} required error={errors.gender}>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("add.male")}</SelectItem>
                    <SelectItem value="female">{t("add.female")}</SelectItem>
                    <SelectItem value="other">{t("add.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t("add.region")} required error={errors.region}>
                <Select value={form.region} onValueChange={handleRegionChange}>
                  <SelectTrigger><SelectValue placeholder={t("add.selectPlaceholder")} /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {uzbekistanRegions.map((r) => (
                      <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t("add.district")} required error={errors.district}>
                <Select value={form.district} onValueChange={(v) => set("district", v)} disabled={!form.region}>
                  <SelectTrigger><SelectValue placeholder={t("add.selectPlaceholder")} /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {selectedRegionData?.districts.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">{t("add.transplantDetails")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ValidatedInput label={t("add.transplantNumber")} required error={errors.transplant_number} type="number" min={1} value={form.transplant_number} onChange={(e) => set("transplant_number", e.target.value)} />
              <FormField label={t("add.transplantDate")} required error={errors.transplant_date}>
                <DateInputSeparate value={form.transplant_date} onChange={(v) => set("transplant_date", v)} yearRange={[1990, new Date().getFullYear()]} />
              </FormField>
              {organ === "liver" && (
                <FormField label={t("add.rejectionType")}>
                  <Select value={form.rejection_type} onValueChange={(v) => set("rejection_type", v)}>
                    <SelectTrigger><SelectValue placeholder={t("add.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent><SelectItem value="ACR">ACR</SelectItem><SelectItem value="AMR">AMR</SelectItem><SelectItem value="Chronic">Chronic</SelectItem><SelectItem value="Unknown">Unknown</SelectItem></SelectContent>
                  </Select>
                </FormField>
              )}
              {organ === "kidney" && (
                <>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t("add.dialysisHistory")} <span className="text-destructive">*</span></Label>
                    <RadioGroup value={form.dialysis_history} onValueChange={(v) => set("dialysis_history", v)} className="flex gap-4">
                      <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="dh-yes" /><Label htmlFor="dh-yes">{t("add.yes")}</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="no" id="dh-no" /><Label htmlFor="dh-no">{t("add.no")}</Label></div>
                    </RadioGroup>
                  </div>
                  {form.dialysis_history === "yes" && (
                    <FormField label={t("add.returnDialysisDate")}>
                      <DateInputSeparate value={form.return_dialysis_date} onChange={(v) => set("return_dialysis_date", v)} yearRange={[2000, new Date().getFullYear()]} />
                    </FormField>
                  )}
                </>
              )}
              <ValidatedInput label={t("add.biopsyResult")} error={errors.biopsy_result} value={form.biopsy_result} onChange={(e) => set("biopsy_result", e.target.value)} placeholder={t("common.optional")} wrapperClassName="sm:col-span-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">{t("add.labResults")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {organ === "liver" ? (
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
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin mr-1" />}
            {t("add.save")}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

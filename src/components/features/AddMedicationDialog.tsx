import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useAddMedication } from "@/hooks/useMedications";
import { ValidatedInput, FormField } from "@/components/ui/form-field";
import { medicationSchema } from "@/lib/validations";
import SourceLanguageSelect from "@/components/features/SourceLanguageSelect";
import { encodeSourceLang } from "@/utils/langPrefix";
import { MEDICATION_GROUPS, getMedicationDosages, GROUP_LABEL_KEYS } from "@/data/medicationCatalog";

interface Props {
  patientId: string;
}

const CUSTOM_VALUE = "__custom__";

export default function AddMedicationDialog({ patientId }: Props) {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const addMed = useAddMedication(patientId);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedMed, setSelectedMed] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedDosage, setSelectedDosage] = useState("");
  const [customDosage, setCustomDosage] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [notesLang, setNotesLang] = useState<string>(lang);

  const isCustomMed = selectedMed === CUSTOM_VALUE;
  const medName = isCustomMed ? customName : selectedMed;
  const dosageOptions = useMemo(() => getMedicationDosages(selectedMed), [selectedMed]);
  const isCustomDosage = selectedDosage === CUSTOM_VALUE || dosageOptions.length === 0;
  const dosage = isCustomDosage ? customDosage : selectedDosage;

  const clearField = (field: string) => {
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleMedChange = (v: string) => {
    setSelectedMed(v);
    setSelectedDosage("");
    setCustomDosage("");
    setCustomName("");
    clearField("medication_name");
  };

  const handleSave = async () => {
    const result = medicationSchema.safeParse({
      medication_name: medName,
      dosage,
      frequency,
      start_date: startDate,
      notes: notes || undefined,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0]?.toString();
        if (field && !newErrors[field]) newErrors[field] = e.message;
      });
      setErrors(newErrors);
      return;
    }

    try {
      await addMed.mutateAsync({
        patient_id: patientId,
        medication_name: medName.trim(),
        dosage: dosage.trim(),
        frequency,
        start_date: startDate,
        prescribed_by: user?.id ?? null,
        notes: notes.trim() ? encodeSourceLang(notes.trim(), notesLang) : null,
      });
      toast({ title: t("med.added") });
      setOpen(false);
      setSelectedMed(""); setCustomName(""); setSelectedDosage(""); setCustomDosage(""); setNotes(""); setErrors({});
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("med.addMedication")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("med.addMedication")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Medication select with groups */}
          <FormField label={t("med.medicationName")} required error={errors.medication_name}>
            <Select value={selectedMed} onValueChange={handleMedChange}>
              <SelectTrigger><SelectValue placeholder={t("med.selectMedication")} /></SelectTrigger>
              <SelectContent>
                {MEDICATION_GROUPS.map((group) => (
                  <SelectGroup key={group.groupKey}>
                    <SelectLabel className="text-xs font-bold text-primary">{t(GROUP_LABEL_KEYS[group.groupKey])}</SelectLabel>
                    {group.medications.map((med) => (
                      <SelectItem key={med.name} value={med.name}>
                        {med.name} <span className="text-muted-foreground text-xs ml-1">({med.genericName})</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectGroup>
                  <SelectItem value={CUSTOM_VALUE}>{t("med.customMedication")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormField>

          {isCustomMed && (
            <ValidatedInput
              label={t("med.medicationName")}
              required
              error={errors.medication_name}
              value={customName}
              onChange={(e) => { setCustomName(e.target.value); clearField("medication_name"); }}
              placeholder="Tacrolimus, Prednisone..."
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Dosage: preset or custom */}
            {dosageOptions.length > 0 && !isCustomMed ? (
              <FormField label={t("med.dosage")} required error={errors.dosage}>
                <Select value={selectedDosage} onValueChange={(v) => { setSelectedDosage(v); setCustomDosage(""); clearField("dosage"); }}>
                  <SelectTrigger><SelectValue placeholder={t("med.selectDosage")} /></SelectTrigger>
                  <SelectContent>
                    {dosageOptions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_VALUE}>{t("med.customDosage")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            ) : (
              <ValidatedInput
                label={t("med.dosage")}
                required
                error={errors.dosage}
                value={customDosage}
                onChange={(e) => { setCustomDosage(e.target.value); clearField("dosage"); }}
                placeholder="5 mg"
              />
            )}

            {isCustomDosage && dosageOptions.length > 0 && !isCustomMed && (
              <ValidatedInput
                label={t("med.customDosage")}
                required
                value={customDosage}
                onChange={(e) => { setCustomDosage(e.target.value); clearField("dosage"); }}
                placeholder="5 mg"
              />
            )}

            <FormField label={t("med.frequency")} error={errors.frequency}>
              <Select value={frequency} onValueChange={(v) => { setFrequency(v); clearField("frequency"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("med.daily")}</SelectItem>
                  <SelectItem value="twice_daily">{t("med.twiceDaily")}</SelectItem>
                  <SelectItem value="three_times">{t("med.threeTimesDaily")}</SelectItem>
                  <SelectItem value="weekly">{t("med.weekly")}</SelectItem>
                  <SelectItem value="as_needed">{t("med.asNeeded")}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <ValidatedInput
            label={t("med.startDate")}
            required
            error={errors.start_date}
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); clearField("start_date"); }}
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField label={`${t("med.notes")} (${t("common.optional")})`} error={errors.notes}>
                <Textarea value={notes} onChange={(e) => { setNotes(e.target.value); clearField("notes"); }} rows={2} />
              </FormField>
            </div>
            <SourceLanguageSelect value={notesLang} onChange={setNotesLang} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={addMed.isPending}>
              {addMed.isPending ? "..." : t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

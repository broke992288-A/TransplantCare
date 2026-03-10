import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useChangeDosage } from "@/hooks/useMedications";
import type { Medication } from "@/services/medicationService";
import SourceLanguageSelect from "@/components/features/SourceLanguageSelect";
import { encodeSourceLang } from "@/utils/langPrefix";

interface Props {
  medication: Medication;
}

export default function ChangeDosageDialog({ medication }: Props) {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const changeDosage = useChangeDosage(medication.patient_id);
  const [open, setOpen] = useState(false);

  const [newDosage, setNewDosage] = useState(medication.dosage);
  const [newFrequency, setNewFrequency] = useState(medication.frequency);
  const [reason, setReason] = useState("");
  const [reasonLang, setReasonLang] = useState<string>(lang);

  const handleSave = async () => {
    if (!newDosage.trim()) {
      toast({ title: t("med.fillRequired"), variant: "destructive" });
      return;
    }
    if (newDosage === medication.dosage && newFrequency === medication.frequency) {
      toast({ title: t("med.noChanges"), variant: "destructive" });
      return;
    }
    try {
      await changeDosage.mutateAsync({
        medicationId: medication.id,
        patientId: medication.patient_id,
        changedBy: user?.id ?? "",
        oldDosage: medication.dosage,
        newDosage: newDosage.trim(),
        oldFrequency: medication.frequency,
        newFrequency: newFrequency !== medication.frequency ? newFrequency : undefined,
        reason: reason.trim() ? encodeSourceLang(reason.trim(), reasonLang) : undefined,
      });
      toast({ title: t("med.dosageChanged") });
      setOpen(false);
      setReason("");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) { setNewDosage(medication.dosage); setNewFrequency(medication.frequency); setReason(""); }
      setOpen(v);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5 mr-1" />{t("med.changeDosage")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("med.changeDosageTitle")}: {medication.medication_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-xs text-muted-foreground">{t("med.currentDosage")}</p>
            <p className="font-medium">{medication.dosage} — {t(`med.${medication.frequency}`)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("med.newDosage")}</Label>
              <Input value={newDosage} onChange={(e) => setNewDosage(e.target.value)} />
            </div>
            <div>
              <Label>{t("med.frequency")}</Label>
              <Select value={newFrequency} onValueChange={setNewFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("med.daily")}</SelectItem>
                  <SelectItem value="twice_daily">{t("med.twiceDaily")}</SelectItem>
                  <SelectItem value="three_times">{t("med.threeTimesDaily")}</SelectItem>
                  <SelectItem value="weekly">{t("med.weekly")}</SelectItem>
                  <SelectItem value="as_needed">{t("med.asNeeded")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("med.reason")}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder={t("med.reasonPlaceholder")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={changeDosage.isPending}>
              {changeDosage.isPending ? "..." : t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

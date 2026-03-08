import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useAddMedication } from "@/hooks/useMedications";

interface Props {
  patientId: string;
}

export default function AddMedicationDialog({ patientId }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const addMed = useAddMedication(patientId);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim()) {
      toast({ title: t("med.fillRequired"), variant: "destructive" });
      return;
    }
    try {
      await addMed.mutateAsync({
        patient_id: patientId,
        medication_name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        start_date: startDate,
        prescribed_by: user?.id ?? null,
        notes: notes.trim() || null,
      });
      toast({ title: t("med.added") });
      setOpen(false);
      setName(""); setDosage(""); setNotes("");
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
          <div>
            <Label>{t("med.medicationName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tacrolimus, Prednisone..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("med.dosage")}</Label>
              <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="5 mg" />
            </div>
            <div>
              <Label>{t("med.frequency")}</Label>
              <Select value={frequency} onValueChange={setFrequency}>
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
            <Label>{t("med.startDate")}</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>{t("med.notes")} ({t("common.optional")})</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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

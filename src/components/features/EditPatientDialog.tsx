import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { DateInputSeparate } from "@/components/features/DateInputSeparate";
import { updatePatient } from "@/services/patientService";

interface EditPatientDialogProps {
  patient: any;
  onUpdated: () => void;
}

export default function EditPatientDialog({ patient, onUpdated }: EditPatientDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(patient.full_name);
  const [gender, setGender] = useState(patient.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(patient.date_of_birth || "");
  const [phone, setPhone] = useState(patient.phone || "");
  const [organType, setOrganType] = useState(patient.organ_type);
  const [transplantDate, setTransplantDate] = useState(patient.transplant_date || "");
  const [transplantNumber, setTransplantNumber] = useState(patient.transplant_number?.toString() || "1");
  const [dialysisHistory, setDialysisHistory] = useState(patient.dialysis_history || false);
  const [returnDialysisDate, setReturnDialysisDate] = useState(patient.return_dialysis_date || "");
  const [rejectionType, setRejectionType] = useState(patient.rejection_type || "");
  const [biopsyResult, setBiopsyResult] = useState(patient.biopsy_result || "");
  const [bloodType, setBloodType] = useState(patient.blood_type || "");
  const [donorBloodType, setDonorBloodType] = useState(patient.donor_blood_type || "");
  const [titerTherapy, setTiterTherapy] = useState(patient.titer_therapy || false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({ title: t("edit.enterName"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updatePatient(patient.id, {
        full_name: fullName.trim(),
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        phone: phone || null,
        organ_type: organType,
        transplant_date: transplantDate || null,
        transplant_number: transplantNumber ? parseInt(transplantNumber) : null,
        dialysis_history: dialysisHistory,
        return_dialysis_date: returnDialysisDate || null,
        rejection_type: rejectionType || null,
        biopsy_result: biopsyResult || null,
        blood_type: bloodType || null,
        donor_blood_type: donorBloodType || null,
        titer_therapy: titerTherapy,
      });
      toast({ title: t("edit.patientUpdated") });
      setOpen(false);
      onUpdated();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) {
        setFullName(patient.full_name);
        setGender(patient.gender || "");
        setDateOfBirth(patient.date_of_birth || "");
        setPhone(patient.phone || "");
        setOrganType(patient.organ_type);
        setTransplantDate(patient.transplant_date || "");
        setTransplantNumber(patient.transplant_number?.toString() || "1");
        setDialysisHistory(patient.dialysis_history || false);
        setReturnDialysisDate(patient.return_dialysis_date || "");
        setRejectionType(patient.rejection_type || "");
        setBiopsyResult(patient.biopsy_result || "");
        setBloodType(patient.blood_type || "");
        setDonorBloodType(patient.donor_blood_type || "");
        setTiterTherapy(patient.titer_therapy || false);
      }
      setOpen(v);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" />{t("common.edit")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>{t("add.fullName")}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("add.gender")}</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("add.male")}</SelectItem>
                  <SelectItem value="female">{t("add.female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("home.organ")}</Label>
              <Select value={organType} onValueChange={setOrganType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kidney">{t("analytics.kidney")}</SelectItem>
                  <SelectItem value="liver">{t("analytics.liver")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t("detail.dob")}</Label>
            <DateInputSeparate value={dateOfBirth} onChange={setDateOfBirth} />
          </div>

          <div>
            <Label>{t("common.phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." />
          </div>

          <div>
            <Label>{t("add.transplantDate")}</Label>
            <DateInputSeparate value={transplantDate} onChange={setTransplantDate} />
          </div>

          <div>
            <Label>{t("add.transplantNumber")}</Label>
            <Input type="number" min="1" value={transplantNumber} onChange={(e) => setTransplantNumber(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={dialysisHistory} onCheckedChange={setDialysisHistory} />
            <Label>{t("add.dialysisHistory")}</Label>
          </div>

          {dialysisHistory && (
            <div>
              <Label>{t("add.returnDialysisDate")}</Label>
              <DateInputSeparate value={returnDialysisDate} onChange={setReturnDialysisDate} />
            </div>
          )}

          <div>
            <Label>{t("add.rejectionType")}</Label>
            <Select value={rejectionType} onValueChange={setRejectionType}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("edit.none")}</SelectItem>
                <SelectItem value="acute">{t("edit.acute")}</SelectItem>
                <SelectItem value="chronic">{t("edit.chronic")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("add.biopsyResult")}</Label>
            <Input value={biopsyResult} onChange={(e) => setBiopsyResult(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "..." : t("common.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

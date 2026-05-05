import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAddDoctorNote } from "@/hooks/useDoctorNotes";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  patientId: string;
}

interface NoteTemplate {
  label: string;
  assessment?: string;
  plan?: string;
  color: string;
}

const TEMPLATES: NoteTemplate[] = [
  {
    label: "Acute rejection suspicion",
    assessment: "Possible rejection due to lab deterioration. Elevated creatinine/liver enzymes observed with rapid change from baseline.",
    plan: "Repeat creatinine and tacrolimus in 48 hours. Consider biopsy if trend continues. Monitor closely.",
    color: "bg-destructive/10 text-destructive border-destructive/30",
  },
  {
    label: "Stable graft function",
    assessment: "Graft function stable. Lab values within expected range. No signs of rejection or infection.",
    plan: "Continue current medications. Follow-up in 1 month. Routine labs at next visit.",
    color: "bg-success/10 text-success border-success/30",
  },
  {
    label: "Medication toxicity",
    assessment: "Possible tacrolimus toxicity. Elevated trough level with potential nephrotoxicity signs.",
    plan: "Reduce tacrolimus dose. Repeat trough level in 48 hours. Monitor renal function.",
    color: "bg-warning/10 text-warning border-warning/30",
  },
  {
    label: "Repeat labs 48h",
    plan: "Repeat full labs in 48 hours. Review results and adjust management accordingly.",
    color: "bg-primary/10 text-primary border-primary/30",
  },
  {
    label: "Follow-up 7 days",
    plan: "Follow-up visit in 7 days. Continue current management. Contact if symptoms worsen.",
    color: "bg-primary/10 text-primary border-primary/30",
  },
];

export default function AddDoctorNoteDialog({ patientId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const addNote = useAddDoctorNote(patientId);

  const [open, setOpen] = useState(false);
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const applyTemplate = (tpl: NoteTemplate) => {
    if (tpl.assessment) setAssessment(tpl.assessment);
    if (tpl.plan) setPlan(tpl.plan);
  };

  const handleSubmit = async () => {
    if (!user || (!assessment.trim() && !plan.trim())) {
      toast({ title: "Please fill assessment or plan", variant: "destructive" });
      return;
    }
    try {
      await addNote.mutateAsync({
        patient_id: patientId,
        doctor_id: user.id,
        assessment: assessment.trim() || undefined,
        plan: plan.trim() || undefined,
        follow_up_date: followUpDate || null,
      });

      // Notify patient (linked user) via push if available
      try {
        const { data: pat } = await supabase
          .from("patients")
          .select("linked_user_id, full_name")
          .eq("id", patientId)
          .maybeSingle();
        const linkedUserId = (pat as { linked_user_id?: string } | null)?.linked_user_id;
        if (linkedUserId) {
          const bodyText = (assessment.trim() || plan.trim()).slice(0, 140);
          await supabase.functions.invoke("send-push", {
            body: {
              user_ids: [linkedUserId],
              title: "👨‍⚕️ Shifokor yangi yozuv qo'shdi",
              body: bodyText || "Yangi klinik yozuv mavjud.",
              url: "/patient/home",
            },
          });
        }
      } catch (pushErr) {
        console.warn("[AddDoctorNote] push notify failed", pushErr);
      }

      toast({ title: "Note added" });
      setAssessment("");
      setPlan("");
      setFollowUpDate("");
      setOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Note
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Doctor Note
          </DialogTitle>
        </DialogHeader>

        {/* Quick templates */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Zap className="h-4 w-4" />
            Quick Templates
          </div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <Badge
                key={tpl.label}
                variant="outline"
                className={`cursor-pointer hover:opacity-80 transition-opacity ${tpl.color}`}
                onClick={() => applyTemplate(tpl)}
              >
                {tpl.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Assessment</Label>
            <Textarea
              placeholder="Clinical assessment..."
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <Textarea
              placeholder="Treatment plan..."
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Follow-up Date</Label>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={addNote.isPending} className="w-full">
            {addNote.isPending ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

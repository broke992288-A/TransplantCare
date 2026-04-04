import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pill, Plus, Minus, PauseCircle, PlayCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { usePatientMedications, useChangeDosage, useUpdateMedication } from "@/hooks/useMedications";
import { useToast } from "@/hooks/use-toast";
import { MEDICATION_GROUPS } from "@/data/medicationCatalog";

interface Props {
  patientId: string;
}

type QuickAction = "increase" | "decrease" | "hold" | "restart";

interface PendingAction {
  medId: string;
  medName: string;
  action: QuickAction;
  oldDosage: string;
  newDosage: string;
  description: string;
}

/** Parse numeric dose from string like "5 mg" → { value: 5, unit: "mg" } */
function parseDose(dosage: string): { value: number; unit: string } | null {
  const match = dosage.match(/^([\d.]+)\s*(.*)$/);
  if (!match) return null;
  return { value: parseFloat(match[1]), unit: match[2].trim() || "mg" };
}

/** Find the standard increment for a medication from the catalog */
function getStandardIncrement(medName: string, currentDose: number): number {
  for (const group of MEDICATION_GROUPS) {
    for (const med of group.medications) {
      if (med.name.toLowerCase() === medName.toLowerCase() ||
          med.genericName.toLowerCase().includes(medName.toLowerCase()) ||
          medName.toLowerCase().includes(med.name.toLowerCase())) {
        const numericDoses = med.dosages
          .map(d => parseFloat(d))
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);
        if (numericDoses.length >= 2) {
          // Find the next dose up from current
          const nextUp = numericDoses.find(d => d > currentDose);
          if (nextUp) return nextUp - currentDose;
          // Or use smallest increment
          return numericDoses[1] - numericDoses[0];
        }
        if (numericDoses.length === 1) return numericDoses[0];
      }
    }
  }
  // Default increments based on dose range
  if (currentDose <= 1) return 0.5;
  if (currentDose <= 10) return 1;
  if (currentDose <= 100) return 5;
  return 50;
}

export default function ActiveMedicationsCard({ patientId }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: medications = [], isLoading } = usePatientMedications(patientId);
  const changeDosage = useChangeDosage(patientId);
  const updateMed = useUpdateMedication(patientId);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [executing, setExecuting] = useState(false);

  const activeMeds = medications.filter((m: any) => m.is_active);
  const heldMeds = medications.filter((m: any) => !m.is_active && m.notes?.includes("[HELD]"));

  const prepareAction = (med: any, action: QuickAction) => {
    const parsed = parseDose(med.dosage);
    let newDosage = med.dosage;
    let description = "";

    if (action === "increase" && parsed) {
      const increment = getStandardIncrement(med.medication_name, parsed.value);
      const newValue = parsed.value + increment;
      newDosage = `${newValue} ${parsed.unit}`;
      description = `Increase ${med.medication_name} from ${med.dosage} to ${newDosage}`;
    } else if (action === "decrease" && parsed) {
      const increment = getStandardIncrement(med.medication_name, parsed.value);
      const newValue = Math.max(0, parsed.value - increment);
      newDosage = `${newValue} ${parsed.unit}`;
      description = `Decrease ${med.medication_name} from ${med.dosage} to ${newDosage}`;
    } else if (action === "hold") {
      newDosage = med.dosage;
      description = `Hold ${med.medication_name} (${med.dosage})`;
    } else if (action === "restart") {
      newDosage = med.dosage;
      description = `Restart ${med.medication_name} (${med.dosage})`;
    }

    setPendingAction({
      medId: med.id,
      medName: med.medication_name,
      action,
      oldDosage: med.dosage,
      newDosage,
      description,
    });
  };

  const executeAction = async () => {
    if (!pendingAction || !user) return;
    setExecuting(true);
    try {
      const { medId, action, oldDosage, newDosage, medName } = pendingAction;

      if (action === "hold") {
        // Deactivate medication, mark as held
        await updateMed.mutateAsync({
          id: medId,
          updates: { is_active: false, notes: `[HELD] ${new Date().toLocaleDateString()}` },
        });
        await changeDosage.mutateAsync({
          medicationId: medId,
          patientId,
          changedBy: user.id,
          oldDosage,
          newDosage: `HELD (${oldDosage})`,
          reason: `Medication held by doctor`,
        });
        toast({ title: `${medName} held` });
      } else if (action === "restart") {
        await updateMed.mutateAsync({
          id: medId,
          updates: { is_active: true, notes: null },
        });
        await changeDosage.mutateAsync({
          medicationId: medId,
          patientId,
          changedBy: user.id,
          oldDosage: `HELD (${oldDosage})`,
          newDosage: oldDosage,
          reason: `Medication restarted by doctor`,
        });
        toast({ title: `${medName} restarted` });
      } else {
        // increase / decrease
        await changeDosage.mutateAsync({
          medicationId: medId,
          patientId,
          changedBy: user.id,
          oldDosage,
          newDosage,
          reason: `Quick ${action} by doctor`,
        });
        toast({ title: `${medName}: ${oldDosage} → ${newDosage}` });
      }
      setPendingAction(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t("med.title")}</CardTitle>
            {activeMeds.length > 0 && (
              <Badge variant="secondary" className="ml-auto">{activeMeds.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : activeMeds.length === 0 && heldMeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("med.noActive")}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeMeds.map((med: any) => (
                <div key={med.id} className="rounded-md border px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{med.medication_name}</span>
                      <span className="text-muted-foreground ml-2">{med.dosage}</span>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{med.frequency}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-success hover:bg-success/10"
                      title="Increase dose"
                      onClick={() => prepareAction(med, "increase")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-warning hover:bg-warning/10"
                      title="Decrease dose"
                      onClick={() => prepareAction(med, "decrease")}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      title="Hold medication"
                      onClick={() => prepareAction(med, "hold")}
                    >
                      <PauseCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Held medications */}
              {heldMeds.map((med: any) => (
                <div key={med.id} className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-2 bg-muted/30">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground line-through">{med.medication_name}</span>
                      <Badge variant="outline" className="ml-2 text-xs text-destructive border-destructive/30">HELD</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-success hover:bg-success/10"
                      title="Restart medication"
                      onClick={() => prepareAction(med, "restart")}
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Medication Change</AlertDialogTitle>
            <AlertDialogDescription>{pendingAction?.description}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={executing}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} disabled={executing}>
              {executing ? "..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { REFERENCE_RANGES } from "./LabResultsTable";
import { updateLabDate, updateLabResult, deleteLabResult } from "@/services/labService";
import { Pencil, Trash2, Check, X } from "lucide-react";
import type { LabResult } from "@/types/patient";

/** Numeric fields on LabResult that can appear as table columns */
type LabNumericKey = keyof Pick<LabResult,
  "tacrolimus_level" | "cyclosporine" | "hb" | "tlc" | "platelets" | "pti" | "inr" |
  "total_bilirubin" | "direct_bilirubin" | "ast" | "alt" | "alp" | "ggt" |
  "total_protein" | "albumin" | "urea" | "creatinine" | "egfr" |
  "sodium" | "potassium" | "calcium" | "magnesium" | "phosphorus" |
  "uric_acid" | "crp" | "esr" | "ldh" | "ammonia" | "proteinuria"
>;

const ALL_HEADERS: { key: LabNumericKey; label: string }[] = [
  { key: "tacrolimus_level", label: "Tacrolimus" },
  { key: "cyclosporine", label: "Cyclosporine" },
  { key: "hb", label: "HB" },
  { key: "tlc", label: "TLC" },
  { key: "platelets", label: "Platelets" },
  { key: "pti", label: "PTI" },
  { key: "inr", label: "INR" },
  { key: "total_bilirubin", label: "Total Bilirubin" },
  { key: "direct_bilirubin", label: "Direct Bilirubin" },
  { key: "ast", label: "AST" },
  { key: "alt", label: "ALT" },
  { key: "alp", label: "ALP" },
  { key: "ggt", label: "GGT" },
  { key: "total_protein", label: "Total Protein" },
  { key: "albumin", label: "Albumin" },
  { key: "urea", label: "Urea" },
  { key: "creatinine", label: "Creatinine" },
  { key: "egfr", label: "eGFR" },
  { key: "sodium", label: "Sodium" },
  { key: "potassium", label: "Potassium" },
  { key: "calcium", label: "Calcium" },
  { key: "magnesium", label: "Magnesium" },
  { key: "phosphorus", label: "Phosphorus" },
  { key: "uric_acid", label: "Uric Acid" },
  { key: "crp", label: "CRP" },
  { key: "esr", label: "ESR" },
  { key: "ldh", label: "LDH" },
  { key: "ammonia", label: "Ammonia" },
  { key: "proteinuria", label: "Proteinuria" },
];

function getCellColor(key: string, value: number): string {
  const ref = REFERENCE_RANGES[key];
  if (!ref) return "";
  if (value >= ref.min && value <= ref.max) return "";
  const lowBorder = ref.min * 0.9;
  const highBorder = ref.max * 1.1;
  if (value < lowBorder || value > highBorder) return "text-destructive font-bold";
  return "text-yellow-600 font-semibold";
}

interface Props {
  labs: LabResult[];
  organType?: string;
  showAll?: boolean;
  editable?: boolean;
  onLabChanged?: () => void;
}

export default function LabHistoryTable({ labs, organType, showAll = false, editable = false, onLabChanged }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (labs.length === 0) return null;

  const sorted = [...labs].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

  let headers = ALL_HEADERS;
  if (!showAll && organType) {
    const liverKeys = ["tacrolimus_level", "alt", "ast", "total_bilirubin", "direct_bilirubin"];
    const kidneyKeys = ["creatinine", "egfr", "proteinuria", "potassium"];
    const keys = organType === "liver" ? liverKeys : kidneyKeys;
    headers = ALL_HEADERS.filter(h => keys.includes(h.key));
  }

  if (showAll) {
    headers = headers.filter(h => sorted.some(lab => lab[h.key] != null));
  }

  const startEdit = (lab: LabResult) => {
    const values: Record<string, string> = {
      date: new Date(lab.recorded_at).toISOString().split("T")[0],
    };
    headers.forEach(h => {
      const val = lab[h.key];
      values[h.key] = val != null ? String(val) : "";
    });
    setEditValues(values);
    setEditingId(lab.id);
  };

  const updateEditValue = (key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      // Find original lab to compare
      const original = labs.find(l => l.id === editingId);
      if (!original) return;

      const updates: Partial<Record<LabNumericKey | "recorded_at", number | string | null>> = {};

      // Check date change
      const origDate = new Date(original.recorded_at).toISOString().split("T")[0];
      if (editValues.date && editValues.date !== origDate) {
        updates.recorded_at = new Date(editValues.date).toISOString();
      }

      // Check lab value changes
      headers.forEach(h => {
        const newStr = editValues[h.key]?.trim() ?? "";
        const origVal = original[h.key];
        const newVal = newStr === "" ? null : parseFloat(newStr);

        if (newStr === "" && origVal == null) return; // both null, no change
        if (newStr !== "" && isNaN(newVal!)) return; // invalid number, skip

        if (origVal !== newVal) {
          updates[h.key] = newVal;
        }
      });

      if (Object.keys(updates).length > 0) {
        await updateLabResult(editingId, updates);
        toast({ title: t("detail.labUpdated") || "Таҳлил янгиланди" });
        onLabChanged?.();
      }

      setEditingId(null);
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await deleteLabResult(deleteId);
      toast({ title: t("detail.labDeleted") });
      setDeleteId(null);
      onLabChanged?.();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="rounded-lg border overflow-hidden">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                {editable && <TableHead className="whitespace-nowrap sticky left-0 bg-background z-10 min-w-[80px]" />}
                <TableHead className={`whitespace-nowrap ${editable ? 'sticky left-[80px]' : 'sticky left-0'} bg-background z-10 min-w-[100px]`}>{t("detail.date")}</TableHead>
                {headers.map((h) => (
                  <TableHead key={h.key} className="whitespace-nowrap text-center min-w-[80px]">{h.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((lab) => {
                const isEditing = editingId === lab.id;
                return (
                  <TableRow key={lab.id}>
                    {editable && (
                      <TableCell className="sticky left-0 bg-background z-10">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit} disabled={loading}>
                              <Check className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title={t("detail.editDate")} onClick={() => startEdit(lab)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title={t("detail.deleteLab")} onClick={() => setDeleteId(lab.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                    <TableCell className={`whitespace-nowrap font-medium ${editable ? 'sticky left-[80px]' : 'sticky left-0'} bg-background z-10`}>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editValues.date || ""}
                          onChange={(e) => updateEditValue("date", e.target.value)}
                          className="h-7 w-36 text-xs"
                        />
                      ) : (
                        new Date(lab.recorded_at).toLocaleDateString()
                      )}
                    </TableCell>
                    {headers.map((h) => {
                      if (isEditing) {
                        return (
                          <TableCell key={h.key} className="text-center p-1">
                            <Input
                              type="number"
                              step="any"
                              value={editValues[h.key] ?? ""}
                              onChange={(e) => updateEditValue(h.key, e.target.value)}
                              className="h-7 w-20 text-xs text-center mx-auto"
                              placeholder="—"
                            />
                          </TableCell>
                        );
                      }
                      const val = (lab as any)[h.key];
                      const colorClass = val != null ? getCellColor(h.key, val) : "";
                      return (
                        <TableCell key={h.key} className={`text-center ${colorClass}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default inline-block w-full" tabIndex={0}>
                                {val != null ? String(val) : "—"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-medium">
                              <div>{h.label}</div>
                              <div className="text-muted-foreground">{new Date(lab.recorded_at).toLocaleDateString()}</div>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("detail.confirmDeleteLab")}</AlertDialogTitle>
            <AlertDialogDescription>{t("detail.confirmDeleteLabDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("detail.deleteLab")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

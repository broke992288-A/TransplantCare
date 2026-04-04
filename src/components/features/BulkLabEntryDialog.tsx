import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableProperties, Plus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { computeRiskScoreAsync, insertRiskSnapshot } from "@/services/riskSnapshotService";
import { fetchLabsByPatientId } from "@/services/labService";
import { autoCompleteSchedules } from "@/services/labScheduleService";

interface Props {
  patientId: string;
  organType: string;
  onLabsAdded: () => void;
  patientData?: {
    transplant_number?: number | null;
    dialysis_history?: boolean | null;
    transplant_date?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
  };
}

const COLUMNS = [
  { key: "recorded_at", label: "DATE", type: "date", required: true },
  { key: "hb", label: "HB" },
  { key: "tlc", label: "TLC" },
  { key: "platelets", label: "PLT" },
  { key: "inr", label: "PT/INR" },
  { key: "total_bilirubin", label: "BIL T" },
  { key: "direct_bilirubin", label: "BIL D" },
  { key: "ast", label: "AST" },
  { key: "alt", label: "ALT" },
  { key: "alp", label: "SAP/ALP" },
  { key: "ggt", label: "GGT" },
  { key: "total_protein", label: "PRT" },
  { key: "albumin", label: "ALB" },
  { key: "urea", label: "BUN" },
  { key: "creatinine", label: "CRT" },
  { key: "sodium", label: "NA" },
  { key: "potassium", label: "K" },
  { key: "tacrolimus_level", label: "TAC LVL" },
  { key: "tacrolimus_dose", label: "TAC DOSE", skip: true },
  { key: "mmf_dose", label: "MMF", skip: true },
  { key: "steroid_dose", label: "STEROID", skip: true },
] as const;

type RowData = Record<string, string>;

function emptyRow(): RowData {
  const row: RowData = {};
  COLUMNS.forEach((c) => (row[c.key] = ""));
  return row;
}

export default function BulkLabEntryDialog({ patientId, organType, onLabsAdded, patientData }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RowData[]>(() => Array.from({ length: 5 }, emptyRow));
  const [errors, setErrors] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const updateCell = useCallback((rowIdx: number, key: string, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [key]: value };
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      const rowKey = String(rowIdx);
      if (next[rowKey]) {
        const s = new Set(next[rowKey]);
        s.delete(key);
        if (s.size === 0) delete next[rowKey];
        else next[rowKey] = s;
      }
      return next;
    });
  }, []);

  const addRows = () => setRows((prev) => [...prev, ...Array.from({ length: 5 }, emptyRow)]);

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, Set<string>> = {};
    let valid = true;

    rows.forEach((row, idx) => {
      const hasAnyData = COLUMNS.some((c) => c.key !== "recorded_at" && row[c.key]?.trim());
      if (!hasAnyData) return; // skip completely empty rows

      if (!row.recorded_at?.trim()) {
        if (!newErrors[idx]) newErrors[idx] = new Set();
        newErrors[idx].add("recorded_at");
        valid = false;
      }

      COLUMNS.forEach((col) => {
        if (col.key === "recorded_at" || col.skip) return;
        const val = row[col.key]?.trim();
        if (val && isNaN(Number(val))) {
          if (!newErrors[idx]) newErrors[idx] = new Set();
          newErrors[idx].add(col.key);
          valid = false;
        }
      });
    });

    setErrors(newErrors);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast({ title: "Validation errors", description: "Fix highlighted cells", variant: "destructive" });
      return;
    }

    const dataRows = rows.filter((row) =>
      COLUMNS.some((c) => c.key !== "recorded_at" && !c.skip && row[c.key]?.trim())
    );

    if (dataRows.length === 0) {
      toast({ title: "No data", description: "Enter at least one row", variant: "destructive" });
      return;
    }

    setSaving(true);
    let savedCount = 0;

    try {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        setProgress(`Saving ${i + 1}/${dataRows.length}...`);

        const labData: Record<string, unknown> = { patient_id: patientId };

        // Set date
        labData.recorded_at = new Date(row.recorded_at).toISOString();

        // Set numeric fields
        COLUMNS.forEach((col) => {
          if (col.key === "recorded_at" || col.skip) return;
          const val = row[col.key]?.trim();
          if (val) labData[col.key] = parseFloat(val);
        });

        // Insert via RPC for atomic risk calculation
        const { data: rpcResult, error: rpcError } = await supabase.rpc("insert_lab_and_recalculate", {
          _lab_data: labData as any,
        });

        if (rpcError) {
          // Fallback: direct insert
          const { error: insertError } = await supabase.from("lab_results").insert([labData as any]);
          if (insertError) throw insertError;
        }

        // Auto-complete schedules
        const labId = (rpcResult as any)?.lab_id;
        if (labId) {
          await autoCompleteSchedules(patientId, labId, row.recorded_at).catch(() => {});
        }

        savedCount++;
      }

      // Trigger risk recalculation for all saved labs
      setProgress("Recalculating risk scores...");
      try {
        const recentLabs = await fetchLabsByPatientId(patientId, 20);
        for (const lab of recentLabs.slice(0, dataRows.length)) {
          const riskResult = await computeRiskScoreAsync(organType, patientId);
          if (riskResult && typeof riskResult === "object" && "score" in riskResult) {
            await insertRiskSnapshot({
              patient_id: patientId,
              lab_result_id: lab.id,
              score: (riskResult as any).score,
              risk_level: (riskResult as any).level ?? "low",
              creatinine: lab.creatinine,
              alt: lab.alt,
              ast: lab.ast,
              total_bilirubin: lab.total_bilirubin,
              tacrolimus_level: lab.tacrolimus_level,
              details: {},
              trend_flags: [],
              algorithm_version: "v4.0-full-kdigo-aasld",
            }).catch(() => {});
          }
        }
      } catch (riskErr) {
        console.error("Bulk risk recalculation partial error:", riskErr);
      }

      toast({ title: `${savedCount} lab result(s) saved` });
      setRows(Array.from({ length: 5 }, emptyRow));
      setErrors({});
      setOpen(false);
      onLabsAdded();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  const hasError = (rowIdx: number, key: string) => errors[String(rowIdx)]?.has(key) ?? false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <TableProperties className="mr-1 h-4 w-4" /> Bulk Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TableProperties className="h-5 w-5" />
            Bulk Lab Entry — Fortis Investigation Sheet
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] border rounded-md">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8 text-center sticky left-0 bg-muted/50 z-10">#</TableHead>
                  {COLUMNS.map((col) => (
                    <TableHead
                      key={col.key}
                      className={`text-center text-xs whitespace-nowrap px-1 min-w-[70px] ${
                        col.key === "recorded_at" ? "min-w-[130px] sticky left-8 bg-muted/50 z-10" : ""
                      }`}
                    >
                      {col.label}
                      {col.required && <span className="text-destructive">*</span>}
                    </TableHead>
                  ))}
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, rowIdx) => (
                  <TableRow key={rowIdx} className="hover:bg-muted/30">
                    <TableCell className="text-center text-xs text-muted-foreground sticky left-0 bg-background z-10">
                      {rowIdx + 1}
                    </TableCell>
                    {COLUMNS.map((col) => (
                      <TableCell
                        key={col.key}
                        className={`p-0.5 ${
                          col.key === "recorded_at" ? "sticky left-8 bg-background z-10" : ""
                        }`}
                      >
                        <Input
                          type={col.type === "date" ? "date" : "text"}
                          inputMode={col.type === "date" ? undefined : "decimal"}
                          value={row[col.key]}
                          onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
                          className={`h-8 text-xs px-1.5 text-center ${
                            hasError(rowIdx, col.key)
                              ? "border-destructive ring-1 ring-destructive"
                              : "border-border/50"
                          }`}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="p-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(rowIdx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={addRows}>
            <Plus className="h-4 w-4 mr-1" /> Add 5 Rows
          </Button>

          <div className="flex items-center gap-3">
            {progress && <span className="text-sm text-muted-foreground">{progress}</span>}
            <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                </>
              ) : (
                "Save All"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/useLanguage";
import { REFERENCE_RANGES } from "./LabResultsTable";
import type { LabResult } from "@/types/patient";

const ALL_HEADERS = [
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
}

export default function LabHistoryTable({ labs, organType, showAll = false }: Props) {
  const { t } = useLanguage();
  if (labs.length === 0) return null;

  const sorted = [...labs].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

  // Filter headers: if showAll, show all columns that have at least one value across all labs
  let headers = ALL_HEADERS;
  if (!showAll && organType) {
    const liverKeys = ["tacrolimus_level", "alt", "ast", "total_bilirubin", "direct_bilirubin"];
    const kidneyKeys = ["creatinine", "egfr", "proteinuria", "potassium"];
    const keys = organType === "liver" ? liverKeys : kidneyKeys;
    headers = ALL_HEADERS.filter(h => keys.includes(h.key));
  }

  if (showAll) {
    // Only show columns that have at least one non-null value
    headers = headers.filter(h =>
      sorted.some(lab => (lab as any)[h.key] != null)
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap sticky left-0 bg-background z-10 min-w-[100px]">{t("detail.date")}</TableHead>
              {headers.map((h) => (
                <TableHead key={h.key} className="whitespace-nowrap text-center min-w-[80px]">{h.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((lab) => (
              <TableRow key={lab.id}>
                <TableCell className="whitespace-nowrap font-medium sticky left-0 bg-background z-10">
                  {new Date(lab.recorded_at).toLocaleDateString()}
                </TableCell>
                {headers.map((h) => {
                  const val = (lab as any)[h.key];
                  const colorClass = val != null ? getCellColor(h.key, val) : "";
                  return (
                    <TableCell key={h.key} className={`text-center ${colorClass}`}>
                      {val != null ? String(val) : "—"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

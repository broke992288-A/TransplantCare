import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";

interface LabResult {
  id: string; recorded_at: string; tacrolimus_level: number | null; alt: number | null; ast: number | null;
  total_bilirubin: number | null; direct_bilirubin: number | null; creatinine: number | null;
  egfr: number | null; proteinuria: number | null; potassium: number | null;
}

export default function LabHistoryTable({ labs, organType }: { labs: LabResult[]; organType: string }) {
  const { t } = useLanguage();
  if (labs.length === 0) return null;
  const sorted = [...labs].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  const liverHeaders = [
    { key: "tacrolimus_level", label: t("add.tacrolimus") },
    { key: "alt", label: t("add.alt") },
    { key: "ast", label: t("add.ast") },
    { key: "total_bilirubin", label: t("add.totalBilirubin") },
    { key: "direct_bilirubin", label: t("add.directBilirubin") },
  ];
  const kidneyHeaders = [
    { key: "creatinine", label: t("add.creatinine") },
    { key: "egfr", label: t("add.egfr") },
    { key: "proteinuria", label: t("add.proteinuria") },
    { key: "potassium", label: t("add.potassium") },
  ];
  const headers = organType === "liver" ? liverHeaders : kidneyHeaders;

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">{t("detail.date")}</TableHead>
            {headers.map((h) => (<TableHead key={h.key} className="whitespace-nowrap text-center">{h.label}</TableHead>))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((lab) => (
            <TableRow key={lab.id}>
              <TableCell className="whitespace-nowrap font-medium">{new Date(lab.recorded_at).toLocaleDateString()}</TableCell>
              {headers.map((h) => {
                const val = lab[h.key as keyof LabResult];
                return <TableCell key={h.key} className="text-center">{val != null ? String(val) : "—"}</TableCell>;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import type { LabResult } from "@/types/patient";

interface Props {
  labs: LabResult[];
  organType: string;
}

export default function LatestLabsTable({ labs, organType }: Props) {
  const { t } = useLanguage();
  const latest5 = labs.slice(0, 5);

  const isLiver = organType === "liver";

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t("detail.latestLabs")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {latest5.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 pb-4">{t("detail.noEvents")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("lab.date")}</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("add.tacrolimus")}</th>
                  {isLiver ? (
                    <>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("add.alt")}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("add.ast")}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("add.totalBilirubin")}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("add.creatinine")}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("add.egfr")}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("add.potassium")}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {latest5.map((lab) => (
                  <tr key={lab.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(lab.recorded_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{lab.tacrolimus_level ?? "—"}</td>
                    {isLiver ? (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums">{lab.alt ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{lab.ast ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{lab.total_bilirubin ?? "—"}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums">{lab.creatinine ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{lab.egfr ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{lab.potassium ?? "—"}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { triggerFullRecalculation } from "@/services/riskRecalculationService";
import { useQueryClient } from "@tanstack/react-query";

export default function RiskRecalculationCard() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [result, setResult] = useState<{ totalProcessed: number; totalSnapshots: number; totalAlerts: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecalculate = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    setProgress({ processed: 0, total: 0 });
    try {
      const res = await triggerFullRecalculation((processed, total) => {
        setProgress({ processed, total });
      });
      setResult(res);
      toast({
        title: t("recalc.success"),
        description: `${res.totalProcessed} ${t("recalc.patients")}, ${res.totalSnapshots} snapshot, ${res.totalAlerts} ${t("recalc.alerts")}`,
      });
      qc.invalidateQueries();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast({ title: t("error.title"), description: message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{t("recalc.title")}</CardTitle>
            <CardDescription>{t("recalc.desc")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {running && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("recalc.calculating")} {progress.processed > 0 && `(${progress.processed} ${t("recalc.patients")})`}
            </p>
            <Progress
              value={progress.total > 0 ? (progress.processed / progress.total) * 100 : undefined}
              className="h-2"
            />
          </div>
        )}

        {result && (
          <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3">
            <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-success">{t("recalc.successLabel")}</p>
              <p className="text-muted-foreground mt-1">
                {result.totalProcessed} {t("recalc.patients")} • {result.totalSnapshots} snapshot • {result.totalAlerts} {t("recalc.alerts")}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button onClick={handleRecalculate} disabled={running} className="w-full">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t("recalc.calculating")}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("recalc.button")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { triggerRiskRecalculation, type RecalculationResult } from "@/services/riskRecalculationService";
import { useQueryClient } from "@tanstack/react-query";

export default function RiskRecalculationCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecalculate = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await triggerRiskRecalculation();
      setResult(res);
      toast({
        title: "Хавф балли қайта ҳисобланди ✅",
        description: `${res.patients_processed} бемор, ${res.snapshots_created} snapshot, ${res.alerts_generated} алерт`,
      });
      qc.invalidateQueries();
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Хатолик", description: err.message, variant: "destructive" });
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
            <CardTitle className="text-base">Хавф баллини қайта ҳисоблаш</CardTitle>
            <CardDescription>
              Барча тарихий таҳлилларни янги клиник алгоритмлар билан қайта ишлайди
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {running && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Қайта ҳисобланмоқда...</p>
            <Progress value={undefined} className="h-2 animate-pulse" />
          </div>
        )}

        {result && result.success && (
          <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3">
            <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-success">Муваффақиятли!</p>
              <p className="text-muted-foreground mt-1">
                Алгоритм: {result.algorithm_version} • {result.patients_processed} бемор •{" "}
                {result.snapshots_created} snapshot • {result.alerts_generated} алерт
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
              Ҳисобланмоқда...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Барча таҳлилларни қайта ҳисоблаш
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

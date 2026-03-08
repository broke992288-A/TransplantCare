import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Database, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { generateDemoData, type DemoProgress } from "@/services/demoDataService";
import { useQueryClient } from "@tanstack/react-query";

export default function DemoDataGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<DemoProgress | null>(null);
  const [result, setResult] = useState<{ patients: number; labs: number; alerts: number; medications: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stepLabels: Record<string, string> = {
    patients: "Беморлар яратилмоқда...",
    labs: "Лаб натижалари киритилмоқда...",
    alerts: "Огоҳлантиришлар яратилмоқда...",
    medications: "Дорилар киритилмоқда...",
  };

  const getProgressPercent = () => {
    if (!progress) return 0;
    const stepWeights: Record<string, { base: number; weight: number }> = {
      patients: { base: 0, weight: 40 },
      labs: { base: 40, weight: 30 },
      alerts: { base: 70, weight: 10 },
      medications: { base: 80, weight: 20 },
    };
    const s = stepWeights[progress.step] ?? { base: 0, weight: 25 };
    return s.base + (progress.current / progress.total) * s.weight;
  };

  const handleGenerate = async () => {
    if (!user) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await generateDemoData(user.id, setProgress);
      setResult(res);
      toast({ title: "Demo маълумотлар яратилди ✅", description: `${res.patients} бемор, ${res.labs} таҳлил, ${res.alerts} алерт, ${res.medications} дори` });
      qc.invalidateQueries();
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Хатолик", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Demo маълумотлар генератори</CardTitle>
            <CardDescription>50 бемор, ~200 таҳлил, 20 алерт, ~100 дори</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {running && progress && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{stepLabels[progress.step] ?? progress.step}</p>
            <Progress value={getProgressPercent()} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{Math.round(getProgressPercent())}%</p>
          </div>
        )}

        {result && (
          <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3">
            <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-success">Муваффақиятли яратилди!</p>
              <p className="text-muted-foreground mt-1">
                {result.patients} бемор • {result.labs} таҳлил • {result.alerts} алерт • {result.medications} дори
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

        <Button onClick={handleGenerate} disabled={running} className="w-full">
          {running ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Яратилмоқда...</> : "Demo маълумотлар яратиш"}
        </Button>
      </CardContent>
    </Card>
  );
}

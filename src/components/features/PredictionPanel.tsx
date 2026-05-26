import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BrainCircuit, TrendingUp, Clock, ShieldAlert, CheckCircle2, Loader2, Info } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { usePrediction } from "@/hooks/usePrediction";
import { useTranslatedText, useTranslatedTexts } from "@/hooks/useTranslate";

const PREDICTION_HIDDEN = true;

interface PredictionPanelProps {
  patientId: string;
  patientName: string;
  organType: string;
  currentRisk: string;
  patientData?: { blood_type?: string | null; donor_blood_type?: string | null; titer_therapy?: boolean | null };
}

function riskBadgeClass(level: string) {
  if (level === "high") return "bg-destructive text-destructive-foreground";
  if (level === "medium") return "bg-warning text-warning-foreground";
  return "bg-success text-success-foreground";
}

function riskIcon(level: string) {
  if (level === "high") return <AlertTriangle className="h-5 w-5 text-destructive" />;
  if (level === "medium") return <ShieldAlert className="h-5 w-5 text-warning" />;
  return <CheckCircle2 className="h-5 w-5 text-success" />;
}

export default function PredictionPanel({ patientId, patientName, organType, currentRisk, patientData }: PredictionPanelProps) {
  if (PREDICTION_HIDDEN) return null;

  const { t, lang } = useLanguage();
  const { data: prediction, isLoading, error } = usePrediction(patientId, organType, patientData);

  const needsTranslation = lang !== "en";
  const { translated: translatedMessage, loading: msgLoading } = useTranslatedText(
    needsTranslation ? prediction?.message ?? undefined : undefined,
    needsTranslation ? "en" : undefined
  );
  const { translated: translatedTimeframe, loading: tfLoading } = useTranslatedText(
    needsTranslation ? prediction?.timeframe ?? undefined : undefined,
    needsTranslation ? "en" : undefined
  );
  const { translations: translatedReasons, loading: reasonsLoading } = useTranslatedTexts(
    needsTranslation ? (prediction?.reasons ?? []) : [],
    needsTranslation ? "en" : undefined
  );

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("prediction.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("prediction.analyzing")}
        </CardContent>
      </Card>
    );
  }

  if (error || !prediction) return null;

  // Unavailable / failure path — grey neutral banner, never green/safe.
  if (!prediction.available) {
    return (
      <Card className="border-2 border-muted bg-muted/30">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Info className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg flex-1 text-muted-foreground">{t("prediction.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{prediction.message}</p>
        </CardContent>
      </Card>
    );
  }

  const predLevel = prediction.prediction_risk!;
  const displayMessage = needsTranslation ? (msgLoading ? prediction.message : translatedMessage) : prediction.message;
  const displayTimeframe = needsTranslation ? (tfLoading ? prediction.timeframe : translatedTimeframe) : prediction.timeframe;
  const displayReasons = needsTranslation ? (reasonsLoading ? prediction.reasons : translatedReasons) : prediction.reasons;
  const isTranslating = needsTranslation && (msgLoading || tfLoading || reasonsLoading);

  return (
    <Card className={`border-2 ${
      predLevel === "high" ? "border-destructive/40 bg-destructive/5" :
      predLevel === "medium" ? "border-warning/40 bg-warning/5" :
      "border-success/40 bg-success/5"
    }`}>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <BrainCircuit className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg flex-1">{t("prediction.title")}</CardTitle>
        {riskIcon(predLevel)}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("dashboard.patient")}:</span>
            <span className="font-medium">{patientName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("prediction.currentRisk")}:</span>
            <Badge className={riskBadgeClass(currentRisk)}>{t(`risk.${currentRisk}`)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("prediction.prediction")}:</span>
            <Badge className={riskBadgeClass(predLevel)}>
              {t(`risk.${predLevel}`)}
            </Badge>
          </div>
          {prediction.score != null && prediction.score > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-bold">{prediction.score}/100</span>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-background/80 p-3">
          <p className="text-sm font-medium">
            {displayMessage}
            {isTranslating && <Loader2 className="inline-block ml-1 h-3 w-3 animate-spin text-muted-foreground" />}
          </p>
          {displayTimeframe && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t("prediction.timeframe")}: {displayTimeframe}
            </div>
          )}
        </div>

        {displayReasons.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">{t("prediction.reasons")}:</p>
            <ul className="space-y-1">
              {displayReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic border-t pt-2">
          ⚕️ {t("prediction.disclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}

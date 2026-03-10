import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Shield, CheckCircle, Zap } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import {
  calculatePriorityScore,
  priorityCategoryLabel,
  type PriorityInput,
  type PriorityResult,
} from "@/utils/priorityScore";
import { EmptyState } from "@/components/ui/empty-state";

interface PatientWithLab {
  id: string;
  full_name: string;
  organ_type: string;
  risk_level: string;
  risk_score: number | null;
  last_risk_evaluation: string | null;
}

interface Props {
  patients: PatientWithLab[];
  labs: Record<string, any>;
}

interface PrioritizedPatient {
  patient: PatientWithLab;
  priority: PriorityResult;
}

function getCategoryIcon(cat: "critical" | "review" | "stable") {
  switch (cat) {
    case "critical": return <AlertTriangle className="h-4 w-4" />;
    case "review": return <Shield className="h-4 w-4" />;
    case "stable": return <CheckCircle className="h-4 w-4" />;
  }
}

export default function PatientPriorityPanel({ patients, labs }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const prioritized: PrioritizedPatient[] = patients
    .map((patient) => {
      const lab = labs[patient.id] ?? null;
      const input: PriorityInput = {
        riskScore: patient.risk_score,
        riskLevel: patient.risk_level,
        lastReviewDate: patient.last_risk_evaluation,
        latestLabDate: lab?.recorded_at ?? null,
        hasCriticalLab: false,
        organType: patient.organ_type,
        latestLab: lab,
      };
      return { patient, priority: calculatePriorityScore(input, t) };
    })
    .sort((a, b) => b.priority.score - a.priority.score);

  const criticalCount = prioritized.filter(p => p.priority.category === "critical").length;
  const reviewCount = prioritized.filter(p => p.priority.category === "review").length;

  const attentionPatients = prioritized.filter(p => p.priority.category !== "stable");
  const displayPatients = attentionPatients.length > 0 ? attentionPatients : prioritized.slice(0, 5);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {t("dashboard.patientsAttention")}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">
                {criticalCount} {t("dashboard.criticalCount")}
              </Badge>
            )}
            {reviewCount > 0 && (
              <Badge className="bg-warning text-warning-foreground">
                {reviewCount} {t("dashboard.reviewCount")}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          ⚕️ {t("dashboard.priorityDisclaimer")}
        </p>
      </CardHeader>
      <CardContent>
        {displayPatients.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title={t("dashboard.allStable")}
            description={t("dashboard.noUrgent")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("dashboard.patient")}</TableHead>
                <TableHead className="text-center">{t("dashboard.priority")}</TableHead>
                <TableHead>{t("dashboard.risk")}</TableHead>
                <TableHead>{t("dashboard.status")}</TableHead>
                <TableHead>{t("dashboard.reasons")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPatients.map(({ patient, priority }) => (
                <TableRow
                  key={patient.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/patient/${patient.id}`)}
                >
                  <TableCell className="font-medium">{patient.full_name}</TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                      priority.category === "critical"
                        ? "bg-destructive/10 text-destructive"
                        : priority.category === "review"
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                    }`}>
                      {priority.score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      patient.risk_level === "high"
                        ? "bg-destructive text-destructive-foreground"
                        : patient.risk_level === "medium"
                          ? "bg-warning text-warning-foreground"
                          : "bg-success text-success-foreground"
                    }>
                      {t(`risk.${patient.risk_level}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {getCategoryIcon(priority.category)}
                      {priorityCategoryLabel(priority.category, t)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {priority.reasons.slice(0, 3).map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

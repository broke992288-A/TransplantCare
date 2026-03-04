import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ArrowLeft, Clock, FlaskConical, AlertTriangle, Shield } from "lucide-react";
import AddLabDialog from "@/components/AddLabDialog";
import LabHistoryTable from "@/components/LabHistoryTable";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [patient, setPatient] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [labs, setLabs] = useState<any>(null);
  const [allLabs, setAllLabs] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideLevel, setOverrideLevel] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);

  const loadData = async () => {
    if (!id) return;
    const [{ data: pt }, { data: tl }, { data: lb }, { data: ins }] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("timeline_events").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("lab_results").select("*").eq("patient_id", id).order("recorded_at", { ascending: false }),
      supabase.from("ai_insights").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
    ]);
    setPatient(pt);
    setTimeline(tl ?? []);
    setAllLabs(lb ?? []);
    setLabs(lb?.[0] ?? null);
    setInsights(ins ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const handleApprove = async (insightId: string) => {
    if (!user || !id) return;
    await supabase.from("ai_insights").update({ status: "approved" }).eq("id", insightId);
    await supabase.from("audit_logs").insert({ insight_id: insightId, doctor_id: user.id, patient_id: id, decision: "approved" });
    toast({ title: t("detail.riskApproved") });
    setInsights((prev) => prev.map((i) => (i.id === insightId ? { ...i, status: "approved" } : i)));
  };

  const handleOverride = async (insightId: string) => {
    if (!user || !id || !overrideLevel || !overrideReason.trim()) {
      toast({ title: t("detail.provideReason"), variant: "destructive" });
      return;
    }
    setOverriding(true);
    await supabase.from("ai_insights").update({ status: "overridden" }).eq("id", insightId);
    await supabase.from("patients").update({ risk_level: overrideLevel }).eq("id", id);
    await supabase.from("audit_logs").insert({ insight_id: insightId, doctor_id: user.id, patient_id: id, decision: "overridden", new_risk_level: overrideLevel, reason: overrideReason });
    setPatient((prev: any) => ({ ...prev, risk_level: overrideLevel }));
    setInsights((prev) => prev.map((i) => (i.id === insightId ? { ...i, status: "overridden" } : i)));
    setOverrideLevel(""); setOverrideReason(""); setOverriding(false);
    toast({ title: t("detail.riskOverridden") });
  };

  const riskColor = (level: string) =>
    level === "high" ? "bg-destructive text-destructive-foreground" : level === "medium" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground";

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  if (!patient) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Patient not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/doctor-dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary"><Heart className="h-5 w-5 text-primary-foreground" /></div>
          <span className="text-lg font-bold">{patient.full_name}</span>
          <Badge className={riskColor(patient.risk_level)}>{patient.risk_level.toUpperCase()}</Badge>
        </div>
      </header>

      <main className="container max-w-3xl py-8 space-y-6">
        {patient.risk_level === "high" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-medium">{t("detail.underReview")}</span>
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">{t("detail.patientInfo")}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow label={t("home.organ")} value={patient.organ_type} />
            <InfoRow label={t("add.gender")} value={patient.gender} />
            <InfoRow label={t("detail.dob")} value={new Date(patient.birth_date).toLocaleDateString()} />
            <InfoRow label={t("detail.added")} value={new Date(patient.created_at).toLocaleDateString()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t("detail.latestLabs")}</CardTitle>
            </div>
            <AddLabDialog patientId={patient.id} organType={patient.organ_type} onLabAdded={loadData} />
          </CardHeader>
          <CardContent>
            {labs ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {patient.organ_type === "liver" ? (
                  <>
                    <LabItem label={t("add.tacrolimus")} value={labs.tacrolimus_level} />
                    <LabItem label={t("add.alt")} value={labs.alt} />
                    <LabItem label={t("add.ast")} value={labs.ast} />
                    <LabItem label={t("add.totalBilirubin")} value={labs.total_bilirubin} />
                    <LabItem label={t("add.directBilirubin")} value={labs.direct_bilirubin} />
                  </>
                ) : (
                  <>
                    <LabItem label={t("add.creatinine")} value={labs.creatinine} />
                    <LabItem label={t("add.egfr")} value={labs.egfr} />
                    <LabItem label={t("add.proteinuria")} value={labs.proteinuria} />
                    <LabItem label={t("add.potassium")} value={labs.potassium} />
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("detail.noEvents")}</p>
            )}
          </CardContent>
        </Card>

        {insights.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t("detail.aiAdvisory")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={insight.status === "pending" ? "default" : "secondary"}>{insight.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(insight.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm italic">{insight.insight_text}</p>
                  {insight.status === "pending" && (
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(insight.id)}>{t("detail.approve")}</Button>
                        <span className="text-muted-foreground text-sm self-center">{t("detail.orOverride")}</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Select value={overrideLevel} onValueChange={setOverrideLevel}>
                          <SelectTrigger><SelectValue placeholder={t("detail.newRiskLevel")} /></SelectTrigger>
                          <SelectContent><SelectItem value="medium">MEDIUM</SelectItem><SelectItem value="low">LOW</SelectItem></SelectContent>
                        </Select>
                        <Textarea placeholder={t("detail.overrideReason")} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="min-h-[60px]" />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleOverride(insight.id)} disabled={overriding}>{t("detail.overrideRisk")}</Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {allLabs.length > 0 && patient && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t("detail.labHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <LabHistoryTable labs={allLabs} organType={patient.organ_type} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t("detail.timeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("detail.noEvents")}</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 border-l-2 border-primary/20 pl-4 py-1">
                    <div>
                      <p className="text-sm font-medium">{ev.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

function LabItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value ?? "—"}</p>
    </div>
  );
}

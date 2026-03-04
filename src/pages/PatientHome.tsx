import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FlaskConical, TrendingUp, TrendingDown, Minus, Phone, Calendar, User } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function PatientHome() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [patient, setPatient] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [allLabs, setAllLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: pts } = await supabase.from("patients").select("*").eq("linked_user_id", user.id).limit(1);
      if (pts && pts.length > 0) {
        const pt = pts[0];
        setPatient(pt);
        const [{ data: tl }, { data: lb }] = await Promise.all([
          supabase.from("patient_events").select("*").eq("patient_id", pt.id).order("created_at", { ascending: false }).limit(20),
          supabase.from("lab_results").select("*").eq("patient_id", pt.id).order("recorded_at", { ascending: false }).limit(10),
        ]);
        setTimeline(tl ?? []);
        setAllLabs(lb ?? []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const riskColor = (level: string) =>
    level === "high" ? "bg-destructive text-destructive-foreground" : level === "medium" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground";

  const latestLab = allLabs[0] ?? null;
  const prevLab = allLabs[1] ?? null;

  const getTrend = (current: number | null, previous: number | null) => {
    if (current == null || previous == null) return null;
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "same";
  };

  const TrendIcon = ({ trend }: { trend: string | null }) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-green-600" />;
    if (trend === "same") return <Minus className="h-4 w-4 text-muted-foreground" />;
    return null;
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {loading ? (
          <p className="text-muted-foreground text-center">{t("home.loading")}</p>
        ) : !patient ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">{t("home.noLinked")}</p></CardContent></Card>
        ) : (
          <>
            {/* Patient Info Card */}
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" />{t("home.healthStatus")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("home.name")}</span><span className="font-medium">{patient.full_name}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("home.organ")}</span><span className="capitalize font-medium">{patient.organ_type}</span></div>
                {patient.phone && (
                  <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Телефон</span><span className="font-medium">{patient.phone}</span></div>
                )}
                {patient.transplant_date && (
                  <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Трансплантация</span><span className="font-medium">{new Date(patient.transplant_date).toLocaleDateString()}</span></div>
                )}
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("home.riskLevel")}</span><Badge className={riskColor(patient.risk_level)}>{patient.risk_level.toUpperCase()}</Badge></div>
                {patient.risk_level === "high" && (
                  <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{t("home.highRiskWarning")}</div>
                )}
              </CardContent>
            </Card>

            {/* Latest Labs */}
            {latestLab && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Охирги таҳлиллар</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {patient.organ_type === "liver" ? (
                      <>
                        <LabItemTrend label={t("add.tacrolimus")} value={latestLab.tacrolimus_level} prev={prevLab?.tacrolimus_level} />
                        <LabItemTrend label={t("add.alt")} value={latestLab.alt} prev={prevLab?.alt} />
                        <LabItemTrend label={t("add.ast")} value={latestLab.ast} prev={prevLab?.ast} />
                        <LabItemTrend label={t("add.totalBilirubin")} value={latestLab.total_bilirubin} prev={prevLab?.total_bilirubin} />
                        <LabItemTrend label={t("add.directBilirubin")} value={latestLab.direct_bilirubin} prev={prevLab?.direct_bilirubin} />
                      </>
                    ) : (
                      <>
                        <LabItemTrend label={t("add.creatinine")} value={latestLab.creatinine} prev={prevLab?.creatinine} />
                        <LabItemTrend label={t("add.egfr")} value={latestLab.egfr} prev={prevLab?.egfr} />
                        <LabItemTrend label={t("add.proteinuria")} value={latestLab.proteinuria} prev={prevLab?.proteinuria} />
                        <LabItemTrend label={t("add.potassium")} value={latestLab.potassium} prev={prevLab?.potassium} />
                      </>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Сана: {new Date(latestLab.recorded_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            )}

            {/* Lab History */}
            {allLabs.length > 1 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Таҳлиллар тарихи</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allLabs.map((lab, i) => (
                      <div key={lab.id} className={`rounded-lg border p-3 ${i === 0 ? "border-primary/30 bg-primary/5" : ""}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{new Date(lab.recorded_at).toLocaleDateString()}</span>
                          {i === 0 && <Badge variant="outline" className="text-xs">Охирги</Badge>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {patient.organ_type === "liver" ? (
                            <>
                              {lab.tacrolimus_level != null && <span>Tacrolimus: <strong>{lab.tacrolimus_level}</strong></span>}
                              {lab.alt != null && <span>ALT: <strong>{lab.alt}</strong></span>}
                              {lab.ast != null && <span>AST: <strong>{lab.ast}</strong></span>}
                              {lab.total_bilirubin != null && <span>Bilirubin: <strong>{lab.total_bilirubin}</strong></span>}
                            </>
                          ) : (
                            <>
                              {lab.creatinine != null && <span>Creatinine: <strong>{lab.creatinine}</strong></span>}
                              {lab.egfr != null && <span>eGFR: <strong>{lab.egfr}</strong></span>}
                              {lab.proteinuria != null && <span>Proteinuria: <strong>{lab.proteinuria}</strong></span>}
                              {lab.potassium != null && <span>Potassium: <strong>{lab.potassium}</strong></span>}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2"><Clock className="h-5 w-5 text-primary" /><CardTitle className="text-lg">{t("home.careTimeline")}</CardTitle></CardHeader>
              <CardContent>
                {timeline.length === 0 ? <p className="text-muted-foreground text-sm">{t("home.noEvents")}</p> : (
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function LabItemTrend({ label, value, prev }: { label: string; value: number | null; prev?: number | null }) {
  if (value == null) return null;
  const getTrend = (current: number | null, previous: number | null) => {
    if (current == null || previous == null) return null;
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "same";
  };
  const trend = getTrend(value, prev ?? null);
  return (
    <div className="rounded-lg border p-3 flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
      {trend === "up" && <TrendingUp className="h-4 w-4 text-destructive" />}
      {trend === "down" && <TrendingDown className="h-4 w-4 text-green-600" />}
      {trend === "same" && <Minus className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
}

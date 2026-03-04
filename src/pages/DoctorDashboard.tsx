import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Heart, Users, AlertTriangle, Activity, Plus, LogOut, ShieldAlert } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageSelector from "@/components/LanguageSelector";

interface PatientRow { id: string; full_name: string; organ_type: string; risk_level: string; created_at: string; }
interface LabRow { patient_id: string; tacrolimus_level: number | null; creatinine: number | null; }

export default function DoctorDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [labs, setLabs] = useState<Record<string, LabRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: pts } = await supabase.from("patients").select("id, full_name, organ_type, risk_level, created_at").eq("assigned_doctor_id", user.id);
      setPatients(pts ?? []);
      if (pts && pts.length > 0) {
        const { data: labData } = await supabase.from("lab_results").select("patient_id, tacrolimus_level, creatinine").in("patient_id", pts.map((p) => p.id)).order("recorded_at", { ascending: false });
        const labMap: Record<string, LabRow> = {};
        labData?.forEach((l) => { if (!labMap[l.patient_id]) labMap[l.patient_id] = l; });
        setLabs(labMap);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const highRisk = patients.filter((p) => p.risk_level === "high");
  const mediumRisk = patients.filter((p) => p.risk_level === "medium");
  const pieData = [
    { name: t("dashboard.highRisk"), value: highRisk.length, color: "hsl(0, 72%, 51%)" },
    { name: t("dashboard.mediumRisk"), value: mediumRisk.length, color: "hsl(38, 92%, 50%)" },
    { name: "Low", value: patients.length - highRisk.length - mediumRisk.length, color: "hsl(142, 71%, 35%)" },
  ].filter((d) => d.value > 0);

  const daysSince = (dateStr: string) => Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  const riskBadge = (level: string) => {
    const cls = level === "high" ? "bg-destructive text-destructive-foreground" : level === "medium" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground";
    return <Badge className={cls}>{level.toUpperCase()}</Badge>;
  };

  const summaryCards = [
    { label: t("dashboard.totalPatients"), value: patients.length, icon: Users, color: "text-primary" },
    { label: t("dashboard.highRisk"), value: highRisk.length, icon: AlertTriangle, color: "text-destructive" },
    { label: t("dashboard.mediumRisk"), value: mediumRisk.length, icon: ShieldAlert, color: "text-warning" },
    { label: t("dashboard.activeAlerts"), value: highRisk.length, icon: Activity, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary"><Heart className="h-5 w-5 text-primary-foreground" /></div>
            <span className="text-lg font-bold">{t("app.name")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button asChild><Link to="/add-patient"><Plus className="mr-1 h-4 w-4" /> {t("nav.addPatient")}</Link></Button>
            <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate("/login"); }}><LogOut className="h-5 w-5" /></Button>
          </div>
        </div>
      </header>
      <main className="container py-8 space-y-8">
        <div><h1 className="text-2xl font-bold">{t("dashboard.title")}</h1><p className="text-muted-foreground">{t("dashboard.subtitle")}</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle><Icon className={`h-5 w-5 ${color}`} /></CardHeader><CardContent><div className="text-3xl font-bold">{loading ? "—" : value}</div></CardContent></Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1"><CardHeader><CardTitle className="text-lg">{t("dashboard.riskDistribution")}</CardTitle></CardHeader><CardContent className="flex items-center justify-center">
            {patients.length === 0 ? <p className="text-muted-foreground text-sm">{t("dashboard.noPatients")}</p> : (
              <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">{pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            )}
          </CardContent></Card>
          <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-lg">{t("dashboard.highRiskPatients")}</CardTitle></CardHeader><CardContent>
            {highRisk.length === 0 ? <p className="text-muted-foreground text-sm">{t("dashboard.noHighRisk")}</p> : (
              <Table><TableHeader><TableRow><TableHead>{t("dashboard.patient")}</TableHead><TableHead>{t("dashboard.organ")}</TableHead><TableHead>{t("dashboard.daysPostTx")}</TableHead><TableHead>{t("dashboard.keyLab")}</TableHead><TableHead>{t("dashboard.risk")}</TableHead></TableRow></TableHeader>
              <TableBody>{highRisk.map((p) => { const lab = labs[p.id]; const keyLab = p.organ_type === "liver" ? `Tac: ${lab?.tacrolimus_level ?? "—"}` : `Cr: ${lab?.creatinine ?? "—"}`; return (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/patient/${p.id}`)}><TableCell className="font-medium">{p.full_name}</TableCell><TableCell className="capitalize">{p.organ_type}</TableCell><TableCell>{daysSince(p.created_at)}</TableCell><TableCell>{keyLab}</TableCell><TableCell>{riskBadge(p.risk_level)}</TableCell></TableRow>
              ); })}</TableBody></Table>
            )}
          </CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-lg">{t("dashboard.totalPatients")}</CardTitle></CardHeader><CardContent>
          {patients.length === 0 ? <p className="text-muted-foreground text-sm">{t("dashboard.noPatients")}</p> : (
            <Table><TableHeader><TableRow><TableHead>{t("dashboard.patient")}</TableHead><TableHead>{t("dashboard.organ")}</TableHead><TableHead>{t("dashboard.daysPostTx")}</TableHead><TableHead>{t("dashboard.risk")}</TableHead></TableRow></TableHeader>
            <TableBody>{patients.map((p) => (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/patient/${p.id}`)}><TableCell className="font-medium">{p.full_name}</TableCell><TableCell className="capitalize">{p.organ_type}</TableCell><TableCell>{daysSince(p.created_at)}</TableCell><TableCell>{riskBadge(p.risk_level)}</TableCell></TableRow>
            ))}</TableBody></Table>
          )}
        </CardContent></Card>
      </main>
    </div>
  );
}
import { useState } from "react";
import { FileText, Download, Calendar, TrendingUp, Users, Activity, PieChart, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { fetchPatientStats, fetchTotalLabCount, fetchAllMedicationsAggregated } from "@/services/statsService";
import { SkeletonCard, SkeletonChart } from "@/components/ui/skeleton-card";
import jsPDF from "jspdf";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--accent))"];

export default function Reports() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [generating, setGenerating] = useState<number | null>(null);

  const { data: patients = [], isLoading: pLoading } = useQuery({
    queryKey: ["patient-stats"],
    queryFn: fetchPatientStats,
  });
  const { data: labCount = 0 } = useQuery({
    queryKey: ["total-lab-count"],
    queryFn: fetchTotalLabCount,
  });
  const { data: medications = [] } = useQuery({
    queryKey: ["all-medications-agg"],
    queryFn: fetchAllMedicationsAggregated,
  });

  const isLoading = pLoading;

  const totalPatients = patients.length;
  const highRisk = patients.filter(p => p.risk_level === "high").length;
  const mediumRisk = patients.filter(p => p.risk_level === "medium").length;
  const lowRisk = patients.filter(p => p.risk_level === "low").length;
  const kidneyCount = patients.filter(p => p.organ_type === "kidney").length;
  const liverCount = patients.filter(p => p.organ_type === "liver").length;
  const activeMeds = medications.filter(m => m.is_active).length;

  const riskDistribution = [
    { name: t("dashboard.highRisk"), value: highRisk },
    { name: t("dashboard.mediumRisk"), value: mediumRisk },
    { name: t("patients.lowRisk"), value: lowRisk },
  ].filter(d => d.value > 0);

  const organDistribution = [
    { name: t("analytics.kidney"), value: kidneyCount },
    { name: t("analytics.liver"), value: liverCount },
  ].filter(d => d.value > 0);

  // Monthly patient additions
  const monthlyData = (() => {
    const months: Record<string, { patients: number; kidney: number; liver: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { patients: 0, kidney: 0, liver: 0 };
    }
    patients.forEach(p => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) {
        months[key].patients++;
        if (p.organ_type === "kidney") months[key].kidney++;
        else months[key].liver++;
      }
    });
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  })();

  const budgetStats = [
    { label: t("dashboard.totalPatients"), value: totalPatients.toString(), subtext: `${kidneyCount} ${t("analytics.kidney")} / ${liverCount} ${t("analytics.liver")}`, icon: Users, color: "text-primary" },
    { label: t("dashboard.highRisk"), value: highRisk.toString(), subtext: `${totalPatients > 0 ? Math.round(highRisk / totalPatients * 100) : 0}%`, icon: TrendingUp, color: "text-destructive" },
    { label: t("reports.labResults") || "Lab natijalar", value: labCount.toString(), subtext: t("reports.total") || "Jami", icon: Activity, color: "text-success" },
    { label: t("medications.totalMedications"), value: activeMeds.toString(), subtext: t("medications.activeLabel") || "Faol", icon: PieChart, color: "text-accent" },
  ];

  const generatePdf = (reportName: string, content: string[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(reportName, 20, 25);
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString(), 20, 33);
    doc.setLineWidth(0.5);
    doc.line(20, 36, 190, 36);
    doc.setFontSize(12);
    content.forEach((line, i) => {
      doc.text(line, 20, 46 + i * 8);
    });
    doc.save(`${reportName.replace(/\s+/g, "_")}.pdf`);
  };

  type ReportItem = { id: number; name: string; type: string };

  const reports: ReportItem[] = [
    { id: 1, name: t("reports.monthlyPatientRegistry"), type: "PDF" },
    { id: 2, name: t("reports.quarterlyTransplantStats"), type: "PDF" },
    { id: 3, name: t("reports.medicationUsageReport"), type: "PDF" },
    { id: 4, name: t("reports.regionalDistribution"), type: "PDF" },
  ];

  const handleDownload = (report: ReportItem) => {
    setGenerating(report.id);
    setTimeout(() => {
      const content: string[] = [
        `${report.name}`,
        `${t("common.date") || "Sana"}: ${new Date().toLocaleDateString()}`,
        "",
        `${t("dashboard.totalPatients")}: ${totalPatients}`,
        `${t("analytics.kidney")}: ${kidneyCount}`,
        `${t("analytics.liver")}: ${liverCount}`,
        `${t("dashboard.highRisk")}: ${highRisk}`,
        `${t("dashboard.mediumRisk")}: ${mediumRisk}`,
        "",
        ...monthlyData.map(d => `${d.month}: ${d.patients} ${t("reports.patients") || "bemor"}`),
      ];
      generatePdf(report.name, content);
      setGenerating(null);
      toast({ title: t("reports.downloaded") });
    }, 600);
  };

  const handleGenerateNew = () => {
    setGenerating(-1);
    setTimeout(() => {
      generatePdf(`${t("reports.generateNew")} — ${new Date().toLocaleDateString()}`, [
        `${t("dashboard.totalPatients")}: ${totalPatients}`,
        `${t("analytics.kidney")}: ${kidneyCount}`,
        `${t("analytics.liver")}: ${liverCount}`,
        `${t("dashboard.highRisk")}: ${highRisk}`,
        `${t("dashboard.mediumRisk")}: ${mediumRisk}`,
        `${t("reports.labResults") || "Lab natijalar"}: ${labCount}`,
        `${t("medications.totalMedications")}: ${activeMeds}`,
        "",
        ...monthlyData.map(d => `${d.month}: ${d.patients} bemor`),
      ]);
      setGenerating(null);
      toast({ title: t("reports.generated") });
    }, 800);
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) :
          budgetStats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xs text-muted-foreground/70">{stat.subtext}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("reports.patientTrends")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <SkeletonChart /> : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Bar dataKey="kidney" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t("analytics.kidney")} />
                    <Bar dataKey="liver" fill="hsl(var(--liver))" radius={[4, 4, 0, 0]} name={t("analytics.liver")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t("dashboard.riskDistribution")}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <SkeletonChart /> : (
              <div className="flex items-center gap-6">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                        {riskDistribution.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {riskDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm"><span className="text-foreground">{item.name}</span><span className="text-muted-foreground">{item.value}</span></div>
                        <p className="text-xs text-muted-foreground">{totalPatients > 0 ? Math.round(item.value / totalPatients * 100) : 0}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{t("reports.availableReports")}</CardTitle>
            <Button variant="outline" size="sm" onClick={handleGenerateNew} disabled={generating === -1}>
              {generating === -1 ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}{t("reports.generateNew")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
                  <div><p className="font-medium text-foreground">{report.name}</p><p className="text-xs text-muted-foreground">{report.type}</p></div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDownload(report)} disabled={generating === report.id}>
                  {generating === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

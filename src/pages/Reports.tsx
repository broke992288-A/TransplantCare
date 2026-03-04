import { FileText, Download, Calendar, TrendingUp, Users, DollarSign, PieChart } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { useLanguage } from "@/hooks/useLanguage";

const monthlyData = [
  { month: "Jan", patients: 245, transplants: 12 },
  { month: "Feb", patients: 268, transplants: 15 },
  { month: "Mar", patients: 302, transplants: 18 },
  { month: "Apr", patients: 285, transplants: 14 },
  { month: "May", patients: 320, transplants: 22 },
  { month: "Jun", patients: 356, transplants: 19 },
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--accent))"];

export default function Reports() {
  const { t } = useLanguage();

  const budgetData = [
    { name: t("reports.medications"), value: 45, amount: 2250000 },
    { name: t("reports.equipment"), value: 20, amount: 1000000 },
    { name: t("reports.personnel"), value: 25, amount: 1250000 },
    { name: t("reports.facilities"), value: 10, amount: 500000 },
  ];

  const reports = [
    { id: 1, name: t("reports.monthlyPatientRegistry"), date: "Oct 2024", type: "PDF", size: "2.4 MB" },
    { id: 2, name: t("reports.quarterlyTransplantStats"), date: "Q3 2024", type: "PDF", size: "5.1 MB" },
    { id: 3, name: t("reports.medicationUsageReport"), date: "Sep 2024", type: "Excel", size: "1.8 MB" },
    { id: 4, name: t("reports.regionalDistribution"), date: "Oct 2024", type: "PDF", size: "3.2 MB" },
  ];

  const budgetStats = [
    { label: t("reports.totalBudget"), value: "$5.0M", subtext: t("reports.annualAllocation"), icon: DollarSign, color: "text-primary" },
    { label: t("reports.spentYTD"), value: "$3.2M", subtext: "64%", icon: TrendingUp, color: "text-success" },
    { label: t("reports.remaining"), value: "$1.8M", subtext: "36%", icon: PieChart, color: "text-warning" },
    { label: t("reports.patientsCovered"), value: "12,458", subtext: "$256/pt", icon: Users, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {budgetStats.map((stat) => (
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
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{t("reports.patientTrends")}</CardTitle>
              <Select defaultValue="2024"><SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2024">2024</SelectItem><SelectItem value="2023">2023</SelectItem></SelectContent></Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="patients" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t("reports.patients")} />
                  <Bar dataKey="transplants" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name={t("reports.transplants")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t("reports.budgetAllocation")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={budgetData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                      {budgetData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => [`${value}%`, ""]} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {budgetData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm"><span className="text-foreground">{item.name}</span><span className="text-muted-foreground">{item.value}%</span></div>
                      <p className="text-xs text-muted-foreground">${(item.amount / 1000000).toFixed(2)}M</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t("reports.departmentUtilization")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {budgetData.map((dept) => (
              <div key={dept.name} className="p-3 rounded-lg bg-muted/50">
                <div className="flex justify-between items-center mb-2"><span className="text-sm font-medium text-foreground">{dept.name}</span><span className="text-xs text-muted-foreground">{Math.round(dept.value * 1.4)}%</span></div>
                <Progress value={dept.value * 1.4} className="h-2 mb-1" />
                <p className="text-xs text-muted-foreground">${((dept.amount * dept.value * 1.4) / 10000000).toFixed(2)}M / ${(dept.amount / 1000000).toFixed(2)}M</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{t("reports.availableReports")}</CardTitle>
            <Button variant="outline" size="sm"><Calendar className="w-4 h-4 mr-2" />{t("reports.generateNew")}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
                  <div><p className="font-medium text-foreground">{report.name}</p><p className="text-xs text-muted-foreground">{report.date} • {report.type} • {report.size}</p></div>
                </div>
                <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

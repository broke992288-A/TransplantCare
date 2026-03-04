import { useState } from "react";
import { Download, FileText, Table as TableIcon, Filter, TrendingUp, Building2, Printer } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { useLanguage } from "@/hooks/useLanguage";

const yearlyData = [
  { year: "2019", kidney: 145, liver: 42 },
  { year: "2020", kidney: 132, liver: 38 },
  { year: "2021", kidney: 168, liver: 52 },
  { year: "2022", kidney: 195, liver: 68 },
  { year: "2023", kidney: 234, liver: 85 },
  { year: "2024", kidney: 178, liver: 62 },
];

export default function Analytics() {
  const { t } = useLanguage();
  const [yearFilter, setYearFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [organFilter, setOrganFilter] = useState("all");

  const centerData = [
    { name: t("analytics.vakhidovCenter"), region: t("analytics.tashkent"), totalTransplants: 1245, kidney: 892, liver: 315, survivalRate1y: 96.2, survivalRate3y: 91.4 },
    { name: t("analytics.nephrologyCenter"), region: t("analytics.tashkent"), totalTransplants: 856, kidney: 678, liver: 156, survivalRate1y: 94.8, survivalRate3y: 88.9 },
    { name: t("analytics.nationalMedicalCenter"), region: t("analytics.tashkent"), totalTransplants: 423, kidney: 389, liver: 34, survivalRate1y: 93.5, survivalRate3y: 86.2 },
    { name: t("analytics.childrenNationalCenter"), region: t("analytics.tashkent"), totalTransplants: 312, kidney: 245, liver: 67, survivalRate1y: 92.1, survivalRate3y: 85.7 },
  ];

  const handleExportCSV = () => {
    const headers = [t("analytics.centerName"), t("analytics.region"), t("analytics.total"), t("analytics.kidney"), t("analytics.liver"), t("analytics.oneYearSurvival"), t("analytics.threeYearSurvival")];
    const rows = centerData.map(c => [c.name, c.region, c.totalTransplants, c.kidney, c.liver, `${c.survivalRate1y}%`, `${c.survivalRate3y}%`]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("analytics.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />{t("analytics.print")}</Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}><TableIcon className="w-4 h-4 mr-2" />{t("analytics.exportCSV")}</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">{t("analytics.filters")}:</span></div>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t("analytics.allYears")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("analytics.allYears")}</SelectItem>
                <SelectItem value="2024">2024</SelectItem><SelectItem value="2023">2023</SelectItem><SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t("analytics.allRegions")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("analytics.allRegions")}</SelectItem>
                <SelectItem value="tashkent">{t("analytics.tashkent")}</SelectItem>
                <SelectItem value="samarkand">{t("analytics.samarkand")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={organFilter} onValueChange={setOrganFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t("analytics.allOrgans")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("analytics.allOrgans")}</SelectItem>
                <SelectItem value="kidney">{t("analytics.kidney")}</SelectItem>
                <SelectItem value="liver">{t("analytics.liver")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { setYearFilter("all"); setRegionFilter("all"); setOrganFilter("all"); }}>{t("analytics.reset")}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t("analytics.transplantsByYear")}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="kidney" name={t("analytics.kidney")} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="liver" name={t("analytics.liver")} fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t("analytics.survivalTrends")}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 250]} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Line type="monotone" dataKey="kidney" name={t("analytics.kidney")} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                  <Line type="monotone" dataKey="liver" name={t("analytics.liver")} stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ fill: "hsl(var(--secondary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /><CardTitle className="text-base font-semibold">{t("analytics.centerComparison")}</CardTitle></div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2" />CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analytics.centerName")}</TableHead>
                  <TableHead>{t("analytics.region")}</TableHead>
                  <TableHead className="text-right">{t("analytics.total")}</TableHead>
                  <TableHead className="text-right">{t("analytics.kidney")}</TableHead>
                  <TableHead className="text-right">{t("analytics.liver")}</TableHead>
                  <TableHead className="text-right">{t("analytics.oneYearSurvival")}</TableHead>
                  <TableHead className="text-right">{t("analytics.threeYearSurvival")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centerData.map((center, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{center.name}</TableCell>
                    <TableCell><Badge variant="outline">{center.region}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{center.totalTransplants}</TableCell>
                    <TableCell className="text-right">{center.kidney}</TableCell>
                    <TableCell className="text-right">{center.liver}</TableCell>
                    <TableCell className="text-right"><span className="text-success font-medium">{center.survivalRate1y}%</span></TableCell>
                    <TableCell className="text-right"><span className="text-primary font-medium">{center.survivalRate3y}%</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

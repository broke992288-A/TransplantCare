import { useState, useMemo } from "react";
import { Download, Table as TableIcon, Filter, TrendingUp, Building2, Printer, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { fetchPatientStats } from "@/services/statsService";
import { uzbekistanRegions } from "@/data/uzbekistanRegions";
import { SkeletonChart, SkeletonTable } from "@/components/ui/skeleton-card";

export default function Analytics() {
  const { t } = useLanguage();
  const [yearFilter, setYearFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [organFilter, setOrganFilter] = useState("all");

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patient-stats"],
    queryFn: fetchPatientStats,
  });

  // Build yearly transplant data from real patients
  const yearlyData = useMemo(() => {
    const yearMap: Record<string, { kidney: number; liver: number }> = {};
    patients.forEach((p) => {
      const year = p.transplant_date ? new Date(p.transplant_date).getFullYear().toString() : p.created_at ? new Date(p.created_at).getFullYear().toString() : null;
      if (!year) return;
      if (!yearMap[year]) yearMap[year] = { kidney: 0, liver: 0 };
      if (p.organ_type === "kidney") yearMap[year].kidney++;
      else if (p.organ_type === "liver") yearMap[year].liver++;
    });
    return Object.entries(yearMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, counts]) => ({ year, ...counts }));
  }, [patients]);

  // Build region-based data
  const regionData = useMemo(() => {
    const regionMap: Record<string, { total: number; kidney: number; liver: number; high: number; medium: number; low: number }> = {};
    patients.forEach((p) => {
      const region = p.region || t("analytics.unknown");
      if (!regionMap[region]) regionMap[region] = { total: 0, kidney: 0, liver: 0, high: 0, medium: 0, low: 0 };
      regionMap[region].total++;
      if (p.organ_type === "kidney") regionMap[region].kidney++;
      else if (p.organ_type === "liver") regionMap[region].liver++;
      if (p.risk_level === "high") regionMap[region].high++;
      else if (p.risk_level === "medium") regionMap[region].medium++;
      else regionMap[region].low++;
    });
    return Object.entries(regionMap)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([name, data]) => ({ name, ...data }));
  }, [patients, t]);

  const filteredRegions = regionData.filter((r) => {
    if (regionFilter !== "all" && r.name !== regionFilter) return false;
    return true;
  });

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    patients.forEach((p) => {
      const year = p.transplant_date ? new Date(p.transplant_date).getFullYear().toString() : p.created_at ? new Date(p.created_at).getFullYear().toString() : null;
      if (year) years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [patients]);

  const handleExportCSV = () => {
    const headers = [t("analytics.region"), t("analytics.total"), t("analytics.kidney"), t("analytics.liver"), t("dashboard.highRisk"), t("dashboard.mediumRisk"), t("patients.lowRisk")];
    const rows = filteredRegions.map(r => [r.name, r.total, r.kidney, r.liver, r.high, r.medium, r.low]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("analytics.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />{t("analytics.print")}</Button>
          <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={handleExportCSV}><TableIcon className="w-4 h-4 mr-2" />{t("analytics.exportCSV")}</Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">{isLoading ? "—" : patients.length}</p><p className="text-xs text-muted-foreground">{t("dashboard.totalPatients")}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">{isLoading ? "—" : patients.filter(p => p.organ_type === "kidney").length}</p><p className="text-xs text-muted-foreground">{t("analytics.kidney")}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">{isLoading ? "—" : patients.filter(p => p.organ_type === "liver").length}</p><p className="text-xs text-muted-foreground">{t("analytics.liver")}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">{isLoading ? "—" : regionData.length}</p><p className="text-xs text-muted-foreground">{t("analytics.allRegions")}</p></CardContent></Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">{t("analytics.filters")}:</span></div>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder={t("analytics.allYears")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("analytics.allYears")}</SelectItem>
                {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder={t("analytics.allRegions")} /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">{t("analytics.allRegions")}</SelectItem>
                {uzbekistanRegions.map((r) => (
                  <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={organFilter} onValueChange={setOrganFilter}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder={t("analytics.allOrgans")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("analytics.allOrgans")}</SelectItem>
                <SelectItem value="kidney">{t("analytics.kidney")}</SelectItem>
                <SelectItem value="liver">{t("analytics.liver")}</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full sm:w-auto" variant="ghost" size="sm" onClick={() => { setYearFilter("all"); setRegionFilter("all"); setOrganFilter("all"); }}>{t("analytics.reset")}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t("analytics.transplantsByYear")}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <SkeletonChart /> : yearlyData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">{t("dashboard.noPatients")}</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Bar dataKey="kidney" name={t("analytics.kidney")} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="liver" name={t("analytics.liver")} fill="hsl(var(--liver))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t("analytics.survivalTrends")}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <SkeletonChart /> : yearlyData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">{t("dashboard.noPatients")}</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Line type="monotone" dataKey="kidney" name={t("analytics.kidney")} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                    <Line type="monotone" dataKey="liver" name={t("analytics.liver")} stroke="hsl(var(--liver))" strokeWidth={2} dot={{ fill: "hsl(var(--liver))" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /><CardTitle className="text-base font-semibold">{t("analytics.centerComparison")}</CardTitle></div>
            <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2" />CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <SkeletonTable rows={6} cols={7} /> : filteredRegions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">{t("dashboard.noPatients")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("analytics.region")}</TableHead>
                    <TableHead className="text-right">{t("analytics.total")}</TableHead>
                    <TableHead className="text-right">{t("analytics.kidney")}</TableHead>
                    <TableHead className="text-right">{t("analytics.liver")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.highRisk")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.mediumRisk")}</TableHead>
                    <TableHead className="text-right">{t("patients.lowRisk")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegions.map((region, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{region.name}</TableCell>
                      <TableCell className="text-right font-semibold">{region.total}</TableCell>
                      <TableCell className="text-right">{region.kidney}</TableCell>
                      <TableCell className="text-right">{region.liver}</TableCell>
                      <TableCell className="text-right"><span className="text-destructive font-medium">{region.high}</span></TableCell>
                      <TableCell className="text-right"><span className="text-warning font-medium">{region.medium}</span></TableCell>
                      <TableCell className="text-right"><span className="text-success font-medium">{region.low}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

import { useState, useMemo } from "react";
import { Package, AlertTriangle, TrendingDown, TrendingUp, Search, Filter, Pill } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { fetchAllMedicationsAggregated } from "@/services/statsService";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-card";

export default function Medications() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const { data: rawMeds = [], isLoading } = useQuery({
    queryKey: ["all-medications-agg"],
    queryFn: fetchAllMedicationsAggregated,
  });

  // Aggregate medications by name
  const aggregated = useMemo(() => {
    const map: Record<string, { name: string; active: number; inactive: number; total: number; dosages: Set<string>; frequencies: Set<string>; patients: Set<string> }> = {};
    rawMeds.forEach((m) => {
      const key = m.medication_name.toLowerCase().trim();
      if (!map[key]) map[key] = { name: m.medication_name, active: 0, inactive: 0, total: 0, dosages: new Set(), frequencies: new Set(), patients: new Set() };
      map[key].total++;
      if (m.is_active) map[key].active++;
      else map[key].inactive++;
      map[key].dosages.add(m.dosage);
      map[key].frequencies.add(m.frequency);
      map[key].patients.add(m.patient_id);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rawMeds]);

  const filtered = aggregated.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive = rawMeds.filter(m => m.is_active).length;
  const totalInactive = rawMeds.filter(m => !m.is_active).length;
  const uniqueMedNames = aggregated.length;
  const uniquePatients = new Set(rawMeds.map(m => m.patient_id)).size;

  const stockStats = [
    { label: t("medications.totalMedications"), value: uniqueMedNames.toString(), icon: Package, color: "text-primary" },
    { label: t("medications.activeLabel"), value: totalActive.toString(), icon: Pill, color: "text-success" },
    { label: t("medications.inactiveLabel"), value: totalInactive.toString(), icon: AlertTriangle, color: "text-warning" },
    { label: t("dashboard.totalPatients"), value: uniquePatients.toString(), icon: Package, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) :
          stockStats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
                  <div><p className="text-2xl font-bold text-foreground">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">{t("medications.inventory")}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder={t("medications.search")} className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <SkeletonTable rows={6} cols={5} /> : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">{search ? t("medications.noResults") || "Natija topilmadi" : t("dashboard.noPatients")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("medications.medication")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.totalPatients")}</TableHead>
                    <TableHead className="text-right">{t("medications.activeLabel") || "Faol"}</TableHead>
                    <TableHead>{t("medications.dosages") || "Dozalar"}</TableHead>
                    <TableHead>{t("medications.frequency") || "Chastota"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((med) => (
                    <TableRow key={med.name}>
                      <TableCell className="font-medium">{med.name}</TableCell>
                      <TableCell className="text-right">{med.patients.size}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={med.active > 0 ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                          {med.active} / {med.total}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{Array.from(med.dosages).slice(0, 3).join(", ")}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{Array.from(med.frequencies).slice(0, 2).join(", ")}</TableCell>
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

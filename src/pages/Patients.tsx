import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, Users, AlertTriangle, Activity, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { useAllPatients } from "@/hooks/usePatients";
import { riskColorClass, getAge } from "@/utils/risk";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-card";

const PAGE_SIZE = 20;

export default function Patients() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [organFilter, setOrganFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data: patients = [], isLoading: loading } = useAllPatients();

  const filteredPatients = useMemo(() => patients.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrgan = organFilter === "all" || p.organ_type.toLowerCase() === organFilter.toLowerCase();
    const matchesRisk = riskFilter === "all" || p.risk_level === riskFilter;
    return matchesSearch && matchesOrgan && matchesRisk;
  }), [patients, searchQuery, organFilter, riskFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page when filters change
  const handleSearchChange = (v: string) => { setSearchQuery(v); setPage(1); };
  const handleOrganChange = (v: string) => { setOrganFilter(v); setPage(1); };
  const handleRiskChange = (v: string) => { setRiskFilter(v); setPage(1); };

  const getRiskBadge = (level: string) => <Badge className={riskColorClass(level)}>{t(`risk.${level}`)}</Badge>;

  const stats = {
    total: patients.length,
    high: patients.filter(p => p.risk_level === "high").length,
    medium: patients.filter(p => p.risk_level === "medium").length,
    low: patients.filter(p => p.risk_level === "low").length,
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : (
          <>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">{t("patients.total")}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><Heart className="w-5 h-5 text-success" /></div><div><p className="text-2xl font-bold text-foreground">{stats.low}</p><p className="text-xs text-muted-foreground">{t("patients.lowRisk")}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Activity className="w-5 h-5 text-warning" /></div><div><p className="text-2xl font-bold text-foreground">{stats.medium}</p><p className="text-xs text-muted-foreground">{t("dashboard.mediumRisk")}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div><div><p className="text-2xl font-bold text-foreground">{stats.high}</p><p className="text-xs text-muted-foreground">{t("dashboard.highRisk")}</p></div></div></CardContent></Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">{t("patients.recipientsList")}</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => navigate("/add-patient")}><UserPlus className="w-4 h-4 mr-2" />{t("patients.newTransplant")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("patients.search")} value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9" />
            </div>
            <Select value={organFilter} onValueChange={handleOrganChange}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t("patients.organ")} /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("patients.allOrgans")}</SelectItem><SelectItem value="kidney">{t("analytics.kidney")}</SelectItem><SelectItem value="liver">{t("analytics.liver")}</SelectItem></SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={handleRiskChange}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t("dashboard.risk")} /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("alerts.all")}</SelectItem><SelectItem value="high">{t("dashboard.highRisk")}</SelectItem><SelectItem value="medium">{t("dashboard.mediumRisk")}</SelectItem><SelectItem value="low">{t("patients.lowRisk")}</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <SkeletonTable rows={8} cols={5} />
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">{searchQuery ? t("medications.noResults") || "Natija topilmadi" : t("dashboard.noPatients")}</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("patients.name")}</TableHead>
                      <TableHead>{t("patients.ageGender")}</TableHead>
                      <TableHead>{t("patients.organ")}</TableHead>
                      <TableHead>{t("patients.transplantDate")}</TableHead>
                      <TableHead>{t("dashboard.risk")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPatients.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/patient/${p.id}`)}>
                        <TableCell className="font-medium">{p.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{getAge(p.date_of_birth)}/{p.gender ? t(`gender.${p.gender}`) : "—"}</TableCell>
                        <TableCell><Badge variant="outline">{t(`organ.${p.organ_type}`)}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{p.transplant_date ?? "—"}</TableCell>
                        <TableCell>{getRiskBadge(p.risk_level)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredPatients.length)} / {filteredPatients.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
                      <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

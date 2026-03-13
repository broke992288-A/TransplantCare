import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { usePaginatedPatients } from "@/hooks/usePatients";
import { riskColorClass, getAge } from "@/utils/risk";
import { SkeletonTable } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { PatientFilters } from "@/services/patientService";

const PAGE_SIZE = 20;

export default function Patients() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [organFilter, setOrganFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  // Debounced search — use server-side filtering
  const filters: PatientFilters = useMemo(() => ({
    search: searchQuery || undefined,
    organType: organFilter,
    riskLevel: riskFilter,
  }), [searchQuery, organFilter, riskFilter]);

  const { data, isLoading: loading, isFetching } = usePaginatedPatients(page, PAGE_SIZE, filters);

  const patients = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  // Reset page when filters change
  const handleSearchChange = useCallback((v: string) => { setSearchQuery(v); setPage(1); }, []);
  const handleOrganChange = useCallback((v: string) => { setOrganFilter(v); setPage(1); }, []);
  const handleRiskChange = useCallback((v: string) => { setRiskFilter(v); setPage(1); }, []);

  const getRiskBadge = (level: string) => <Badge className={riskColorClass(level)}>{t(`risk.${level}`)}</Badge>;

  return (
    <DashboardLayout>
      {/* Stats cards removed — server-side pagination doesn't return full aggregation cheaply. 
          Stats can be added via a separate lightweight RPC if needed. */}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-lg font-semibold">
              {t("patients.recipientsList")}
              {!loading && <span className="ml-2 text-sm font-normal text-muted-foreground">({totalCount})</span>}
            </CardTitle>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button size="sm" className="w-full sm:w-auto" onClick={() => navigate("/add-patient")}><UserPlus className="w-4 h-4 mr-2" />{t("patients.newTransplant")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm sm:flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("patients.search")} value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9" />
            </div>
            <Select value={organFilter} onValueChange={handleOrganChange}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder={t("patients.organ")} /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("patients.allOrgans")}</SelectItem><SelectItem value="kidney">{t("analytics.kidney")}</SelectItem><SelectItem value="liver">{t("analytics.liver")}</SelectItem></SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={handleRiskChange}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder={t("dashboard.risk")} /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("alerts.all")}</SelectItem><SelectItem value="high">{t("dashboard.highRisk")}</SelectItem><SelectItem value="medium">{t("dashboard.mediumRisk")}</SelectItem><SelectItem value="low">{t("patients.lowRisk")}</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <SkeletonTable rows={8} cols={5} />
            ) : patients.length === 0 ? (
              <EmptyState
                icon={Users}
                title={searchQuery ? (t("medications.noResults") || "Natija topilmadi") : t("dashboard.noPatients")}
                description={searchQuery ? "Қидирув сўзини ўзгартириб кўринг" : "Янги бемор қўшиш учун тугмани босинг"}
                actionLabel={!searchQuery ? t("patients.newTransplant") : undefined}
                onAction={!searchQuery ? () => navigate("/add-patient") : undefined}
              />
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
                    {patients.map((p) => (
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
                      {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} / {totalCount}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={currentPage <= 1 || isFetching} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
                      <Button variant="outline" size="sm" disabled={currentPage >= totalPages || isFetching} onClick={() => setPage(p => p + 1)}>
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

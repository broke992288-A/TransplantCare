import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, UserPlus, Download, Users, AlertTriangle, Activity, Heart } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";

const allPatients = [
  { id: "R-2024-001", name: "Azimov Rustam", age: 45, gender: "M", organ: "Kidney", transplantDate: "2023-06-15", region: "Tashkent", center: "Republican Center", status: "Alive", riskScore: 85 },
  { id: "R-2024-002", name: "Karimova Nilufar", age: 38, gender: "F", organ: "Liver", transplantDate: "2022-11-20", region: "Samarkand", center: "Samarkand Regional", status: "Alive", riskScore: 62 },
  { id: "R-2024-003", name: "Toshmatov Bekzod", age: 52, gender: "M", organ: "Kidney", transplantDate: "2024-01-08", region: "Fergana", center: "Fergana Medical", status: "Alive", riskScore: 28 },
  { id: "R-2024-004", name: "Yuldasheva Malika", age: 29, gender: "F", organ: "Liver", transplantDate: "2023-09-12", region: "Bukhara", center: "Bukhara Regional", status: "Alive", riskScore: 15 },
  { id: "R-2024-005", name: "Rahimov Sardor", age: 61, gender: "M", organ: "Kidney", transplantDate: "2021-04-25", region: "Tashkent", center: "Republican Center", status: "Dialysis", riskScore: 78 },
  { id: "R-2024-006", name: "Umarova Dilfuza", age: 44, gender: "F", organ: "Liver", transplantDate: "2023-03-18", region: "Navoi", center: "Navoi Medical", status: "Alive", riskScore: 45 },
];

export default function Patients() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [organFilter, setOrganFilter] = useState("all");
  const navigate = useNavigate();

  const filteredPatients = allPatients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesOrgan = organFilter === "all" || p.organ.toLowerCase() === organFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesOrgan;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Deceased": return <Badge variant="destructive">{status}</Badge>;
      case "Dialysis": return <Badge className="bg-warning text-warning-foreground">{status}</Badge>;
      default: return <Badge className="bg-success text-success-foreground">{status}</Badge>;
    }
  };

  const getRiskBadge = (score: number) => {
    if (score === 0) return <span className="text-muted-foreground">—</span>;
    if (score >= 70) return <Badge variant="destructive">{score}%</Badge>;
    if (score >= 40) return <Badge className="bg-warning text-warning-foreground">{score}%</Badge>;
    return <Badge className="bg-success text-success-foreground">{score}%</Badge>;
  };

  const stats = {
    total: allPatients.length,
    alive: allPatients.filter(p => p.status === "Alive").length,
    dialysis: allPatients.filter(p => p.status === "Dialysis").length,
    deceased: allPatients.filter(p => p.status === "Deceased").length,
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">{t("patients.total")}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><Heart className="w-5 h-5 text-success" /></div><div><p className="text-2xl font-bold text-foreground">{stats.alive}</p><p className="text-xs text-muted-foreground">{t("patients.alive")}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Activity className="w-5 h-5 text-warning" /></div><div><p className="text-2xl font-bold text-foreground">{stats.dialysis}</p><p className="text-xs text-muted-foreground">{t("patients.onDialysis")}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div><div><p className="text-2xl font-bold text-foreground">{stats.deceased}</p><p className="text-xs text-muted-foreground">{t("patients.deceased")}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">{t("patients.recipientsList")}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />{t("patients.export")}</Button>
              <Button size="sm" onClick={() => navigate("/add-patient")}><UserPlus className="w-4 h-4 mr-2" />{t("patients.newTransplant")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("patients.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={organFilter} onValueChange={setOrganFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t("patients.organ")} /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("patients.allOrgans")}</SelectItem><SelectItem value="kidney">{t("analytics.kidney")}</SelectItem><SelectItem value="liver">{t("analytics.liver")}</SelectItem></SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t("patients.status")} /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("patients.allStatus")}</SelectItem><SelectItem value="alive">Alive</SelectItem><SelectItem value="dialysis">Dialysis</SelectItem><SelectItem value="deceased">Deceased</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead><TableHead>{t("patients.name")}</TableHead><TableHead>{t("patients.ageGender")}</TableHead><TableHead>{t("patients.organ")}</TableHead><TableHead>{t("patients.transplantDate")}</TableHead><TableHead>{t("patients.region")}</TableHead><TableHead>{t("patients.status")}</TableHead><TableHead>{t("patients.riskScore")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/patient/${patient.id}`)}>
                    <TableCell className="font-medium text-primary">{patient.id}</TableCell>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell className="text-muted-foreground">{patient.age}/{patient.gender}</TableCell>
                    <TableCell><Badge variant="outline">{patient.organ}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{patient.transplantDate}</TableCell>
                    <TableCell>{patient.region}</TableCell>
                    <TableCell>{getStatusBadge(patient.status)}</TableCell>
                    <TableCell>{getRiskBadge(patient.riskScore)}</TableCell>
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

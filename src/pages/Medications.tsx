import { Package, AlertTriangle, TrendingDown, TrendingUp, Search, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";

const medications = [
  { id: 1, name: "Tacrolimus (Prograf)", category: "immunosuppressant", stock: 2450, minStock: 500, unit: "capsules", status: "OK", trend: "stable", monthlyUsage: 890 },
  { id: 2, name: "Mycophenolate (CellCept)", category: "immunosuppressant", stock: 1820, minStock: 400, unit: "tablets", status: "OK", trend: "up", monthlyUsage: 720 },
  { id: 3, name: "Cyclosporine", category: "immunosuppressant", stock: 180, minStock: 300, unit: "capsules", status: "Low", trend: "down", monthlyUsage: 450 },
  { id: 4, name: "Prednisone", category: "corticosteroid", stock: 3200, minStock: 600, unit: "tablets", status: "OK", trend: "stable", monthlyUsage: 560 },
  { id: 5, name: "Sirolimus (Rapamune)", category: "immunosuppressant", stock: 95, minStock: 200, unit: "tablets", status: "Critical", trend: "down", monthlyUsage: 280 },
  { id: 6, name: "Azathioprine", category: "immunosuppressant", stock: 890, minStock: 250, unit: "tablets", status: "OK", trend: "stable", monthlyUsage: 340 },
];

export default function Medications() {
  const { t } = useLanguage();

  const stockStats = [
    { label: t("medications.totalMedications"), value: "24", icon: Package, color: "text-primary" },
    { label: t("medications.lowStock"), value: "3", icon: AlertTriangle, color: "text-warning" },
    { label: t("medications.criticalStock"), value: "1", icon: AlertTriangle, color: "text-destructive" },
    { label: t("medications.ordersPending"), value: "5", icon: Package, color: "text-accent" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Critical": return <Badge variant="destructive">{t("medications.critical")}</Badge>;
      case "Low": return <Badge className="bg-warning text-warning-foreground">{t("medications.low")}</Badge>;
      default: return <Badge className="bg-success text-success-foreground">{t("medications.inStock")}</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-success" />;
      case "down": return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <span className="text-muted-foreground text-xs">—</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stockStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
                <div><p className="text-2xl font-bold text-foreground">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">{t("medications.inventory")}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder={t("medications.search")} className="pl-9 w-64" /></div>
              <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("medications.medication")}</TableHead>
                  <TableHead>{t("medications.category")}</TableHead>
                  <TableHead>{t("medications.currentStock")}</TableHead>
                  <TableHead>{t("medications.stockLevel")}</TableHead>
                  <TableHead>{t("medications.monthlyUsage")}</TableHead>
                  <TableHead>{t("medications.trend")}</TableHead>
                  <TableHead>{t("medications.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="font-medium">{med.name}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{med.category}</TableCell>
                    <TableCell>{med.stock.toLocaleString()} {med.unit}</TableCell>
                    <TableCell className="w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min((med.stock / (med.minStock * 5)) * 100, 100)} className="h-2" />
                        <span className="text-xs text-muted-foreground w-10">{Math.round(Math.min((med.stock / (med.minStock * 5)) * 100, 100))}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{med.monthlyUsage}/mo</TableCell>
                    <TableCell>{getTrendIcon(med.trend)}</TableCell>
                    <TableCell>{getStatusBadge(med.status)}</TableCell>
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

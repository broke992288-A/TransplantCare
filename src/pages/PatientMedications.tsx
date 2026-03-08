import { useState } from "react";
import { Pill, Plus, Clock, Search } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "react-router-dom";
import { usePatientMedications, useMedicationChanges, useDeleteMedication } from "@/hooks/useMedications";
import { usePatientDetail } from "@/hooks/usePatientDetail";
import AddMedicationDialog from "@/components/features/AddMedicationDialog";
import ChangeDosageDialog from "@/components/features/ChangeDosageDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function PatientMedications() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const { patient, loading } = usePatientDetail(id);
  const { data: medications = [], isLoading: medsLoading } = usePatientMedications(id);
  const { data: changes = [] } = useMedicationChanges(id);
  const deleteMed = useDeleteMedication(id);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("active");

  const canEdit = role === "doctor" || role === "admin" || role === "support";

  const activeMeds = medications.filter(m => m.is_active);
  const inactiveMeds = medications.filter(m => !m.is_active);

  const filteredActive = activeMeds.filter(m =>
    m.medication_name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredInactive = inactiveMeds.filter(m =>
    m.medication_name.toLowerCase().includes(search.toLowerCase())
  );

  const freqLabel = (f: string) => t(`med.${f}`) || f;

  if (loading || medsLoading) return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">{t("common.loading")}</div></DashboardLayout>;
  if (!patient) return <DashboardLayout><p className="text-center py-20 text-muted-foreground">{t("detail.patientNotFound")}</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              {t("med.title")} — {patient.full_name}
            </h1>
            <p className="text-sm text-muted-foreground">{t("med.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("med.search")} className="pl-9 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {canEdit && <AddMedicationDialog patientId={id!} />}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{activeMeds.length}</p>
              <p className="text-xs text-muted-foreground">{t("med.activeMeds")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{inactiveMeds.length}</p>
              <p className="text-xs text-muted-foreground">{t("med.stoppedMeds")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">{changes.length}</p>
              <p className="text-xs text-muted-foreground">{t("med.totalChanges")}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">{t("med.activeMeds")} ({activeMeds.length})</TabsTrigger>
            <TabsTrigger value="stopped">{t("med.stoppedMeds")} ({inactiveMeds.length})</TabsTrigger>
            <TabsTrigger value="history"><Clock className="h-3.5 w-3.5 mr-1" />{t("med.changeHistory")}</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardContent className="pt-4">
                {filteredActive.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t("med.noMedications")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("med.medicationName")}</TableHead>
                          <TableHead>{t("med.dosage")}</TableHead>
                          <TableHead>{t("med.frequency")}</TableHead>
                          <TableHead>{t("med.startDate")}</TableHead>
                          <TableHead>{t("med.notes")}</TableHead>
                          {canEdit && <TableHead>{t("med.actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredActive.map((med) => (
                          <TableRow key={med.id}>
                            <TableCell className="font-medium">{med.medication_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{med.dosage}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{freqLabel(med.frequency)}</TableCell>
                            <TableCell className="text-sm">{new Date(med.start_date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{med.notes || "—"}</TableCell>
                            {canEdit && (
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <ChangeDosageDialog medication={med} />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-destructive">{t("med.stop")}</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>{t("med.stopConfirm")}</AlertDialogTitle>
                                        <AlertDialogDescription>{t("med.stopDesc")}: {med.medication_name}</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                        <AlertDialogAction onClick={async () => {
                                          try {
                                            const { updateMedication } = await import("@/services/medicationService");
                                            await updateMedication(med.id, { is_active: false, end_date: new Date().toISOString().slice(0, 10) } as any);
                                            deleteMed.reset();
                                            // Trigger refetch
                                            window.location.reload();
                                          } catch (err: any) {
                                            toast({ title: t("common.error"), description: err.message, variant: "destructive" });
                                          }
                                        }}>{t("med.stop")}</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stopped">
            <Card>
              <CardContent className="pt-4">
                {filteredInactive.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t("med.noStoppedMeds")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("med.medicationName")}</TableHead>
                          <TableHead>{t("med.dosage")}</TableHead>
                          <TableHead>{t("med.frequency")}</TableHead>
                          <TableHead>{t("med.startDate")}</TableHead>
                          <TableHead>{t("med.endDate")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInactive.map((med) => (
                          <TableRow key={med.id} className="opacity-60">
                            <TableCell className="font-medium">{med.medication_name}</TableCell>
                            <TableCell>{med.dosage}</TableCell>
                            <TableCell>{freqLabel(med.frequency)}</TableCell>
                            <TableCell>{new Date(med.start_date).toLocaleDateString()}</TableCell>
                            <TableCell>{med.end_date ? new Date(med.end_date).toLocaleDateString() : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader><CardTitle className="text-lg">{t("med.changeHistory")}</CardTitle></CardHeader>
              <CardContent>
                {changes.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t("med.noChanges")}</p>
                ) : (
                  <div className="space-y-3">
                    {changes.map((ch) => {
                      const med = medications.find(m => m.id === ch.medication_id);
                      return (
                        <div key={ch.id} className="flex items-start gap-3 border-l-2 border-warning/40 pl-4 py-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{med?.medication_name || t("med.unknownMed")}</p>
                            <p className="text-sm">
                              <span className="text-destructive line-through">{ch.old_dosage}</span>
                              {" → "}
                              <span className="text-primary font-medium">{ch.new_dosage}</span>
                            </p>
                            {ch.reason && <p className="text-xs text-muted-foreground mt-0.5">{t("med.reason")}: {ch.reason}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(ch.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

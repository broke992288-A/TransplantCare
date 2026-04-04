import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { usePatientMedications } from "@/hooks/useMedications";

interface Props {
  patientId: string;
}

export default function ActiveMedicationsCard({ patientId }: Props) {
  const { t } = useLanguage();
  const { data: medications = [], isLoading } = usePatientMedications(patientId);
  const activeMeds = medications.filter((m: any) => m.is_active);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t("med.title")}</CardTitle>
          {activeMeds.length > 0 && (
            <Badge variant="secondary" className="ml-auto">{activeMeds.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : activeMeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("med.noActive")}</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeMeds.map((med: any) => (
              <div key={med.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{med.medication_name}</span>
                  <span className="text-muted-foreground ml-2">{med.dosage}</span>
                </div>
                <Badge variant="outline" className="text-xs">{med.frequency}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

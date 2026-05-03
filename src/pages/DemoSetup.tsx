import DemoDataGenerator from "@/components/features/DemoDataGenerator";
import RiskRecalculationCard from "@/components/features/RiskRecalculationCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/hooks/useLanguage";

export default function DemoSetup() {
  const { t } = useLanguage();
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("demoSetup.title")}</h1>
          <p className="text-muted-foreground">{t("demoSetup.subtitle")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <DemoDataGenerator />
          <RiskRecalculationCard />
        </div>
      </div>
    </DashboardLayout>
  );
}

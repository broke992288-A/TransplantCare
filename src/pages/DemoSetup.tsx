import DemoDataGenerator from "@/components/features/DemoDataGenerator";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/hooks/useLanguage";

export default function DemoSetup() {
  const { t } = useLanguage();
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Demo Setup</h1>
          <p className="text-muted-foreground">Тизимни тест қилиш учун демо маълумотлар яратинг</p>
        </div>
        <DemoDataGenerator />
      </div>
    </DashboardLayout>
  );
}

import { describe, expect, it } from "vitest";
import profile from "@/pages/PatientProfile.tsx?raw";
import alerts from "@/components/features/PatientAlertsCard.tsx?raw";
import notifications from "@/components/features/NotificationSettings.tsx?raw";
import language from "@/hooks/useLanguage.tsx?raw";

describe("patient portal safety regressions", () => {
  it("does not show doctor-note controls or push debug tools on the patient dashboard", () => {
    expect(profile).not.toContain("DoctorNotesCard");
    expect(notifications).not.toContain("TestPushButton");
    expect(notifications).not.toContain("ResubscribePushButton");
  });

  it("uses active critical alerts for the patient health status", () => {
    expect(profile).toContain('alert.severity === "critical"');
    expect(profile).toContain("activeHighRiskAlert={hasActiveHighRiskAlert}");
  });

  it("keeps patient alerts collapsed and removes technical alert detail", () => {
    expect(alerts).toContain("useState(!patientView)");
    expect(alerts).toContain('t("patientAlerts.patientMessage")');
    expect(alerts).toContain("{!patientView && <Button");
  });

  it("contains the requested Uzbek alert translations", () => {
    expect(language).toContain('"patientAlerts.status.new": "Yangi"');
    expect(language).toContain('"patientAlerts.status.acknowledged": "Ko\'rib chiqilgan"');
    expect(language).toContain('"patientAlerts.showResolved": "Yopilganlarni ko\'rsatish"');
    expect(language).toContain('"patientAlerts.acknowledge": "Tanishib chiqdim"');
    expect(language).toContain('"patientAlerts.resolve": "Yopish"');
  });
});
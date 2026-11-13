import { describe, it, expect } from "vitest";
import { localizeClinicalText, localizeStage } from "./clinicalText";

describe("clinical text localization", () => {
  it("translates critical marker title to Uzbek", () => {
    expect(localizeClinicalText("TOTAL_BILIRUBIN critically abnormal", "uz")).toBe("Umumiy bilirubin — kritik darajada o'zgargan");
  });
  it("translates threshold message keeping values", () => {
    expect(localizeClinicalText("direct_bilirubin 3.8 mg/dL ≥ 1 (critical)", "ru")).toBe("Прямой билирубин 3.8 mg/dL ≥ 1 (критично)");
  });
  it("translates stage", () => {
    expect(localizeStage("maintenance (>6 mo)", "uz")).toBe("davomiy davr (>6 oy)");
  });
  it("translates fixed Uzbek alert title to English", () => {
    expect(localizeClinicalText("Dori dozasi o'zgartirildi", "en")).toBe("Medication dose changed");
  });
  it("keeps English unchanged", () => {
    expect(localizeClinicalText("TOTAL_BILIRUBIN critically abnormal", "en")).toBe("TOTAL_BILIRUBIN critically abnormal");
  });
});

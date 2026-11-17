import { describe, it, expect } from "vitest";
import { isMachineClinicalText, localizeClinicalText, localizeStage } from "./clinicalText";

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
  it("localizes historical reference messages in all languages without altering measurements or citations", () => {
    const source = "tacrolimus: 8.19 ng/mL (norma 5-12) [ISHLT/ACT]; total_bilirubin: 14.4 mg/dL (norma 0.1-1.2) [AASLD]";
    const names = { uz: "Umumiy bilirubin", ru: "Общий билирубин", en: "total_bilirubin" };
    for (const lang of ["uz", "ru", "en"] as const) {
      const result = localizeClinicalText(source, lang);
      expect(result).toContain(names[lang]);
      expect(result).toContain("8.19 ng/mL");
      expect(result).toContain("14.4 mg/dL");
      expect(result).toContain("0.1-1.2) [AASLD]");
      expect(result).toContain("5-12) [ISHLT/ACT]");
      expect(result).not.toContain("norma");
    }
  });
  it("localizes historical unitless threshold summaries without changing thresholds", () => {
    const source = "total_bilirubin 10.7 ≥ 3; direct_bilirubin 3.1 ≥ 1; alp 202 ≥ 200; Re-transplant patient; Multiple abnormal: 4";
    for (const lang of ["uz", "ru"] as const) {
      const result = localizeClinicalText(source, lang);
      expect(result).not.toMatch(/total_bilirubin|direct_bilirubin|Re-transplant patient|Multiple abnormal/);
      expect(result).toContain("10.7 ≥ 3");
      expect(result).toContain("3.1 ≥ 1");
      expect(result).toContain("202 ≥ 200");
      expect(result).toContain(": 4");
    }
  });
  it("handles old medication messages mixed into a clinical narrative without translating drug names or doses", () => {
    const source = "tacrolimus: 8.19 ng/mL (norma 5-12) [ISHLT/ACT]. Dori: Everolimus Evercon. Eski doza: 0.5 → Новая доза: 0.5";
    for (const [lang, medication, previous, next] of [
      ["uz", "Dori", "Eski doza", "Yangi doza"],
      ["ru", "Препарат", "Прежняя доза", "Новая доза"],
      ["en", "Medication", "Previous dose", "New dose"],
    ] as const) {
      expect(localizeClinicalText(source, lang)).toContain(`${medication}: Everolimus Evercon. ${previous}: 0.5 → ${next}: 0.5`);
    }
    expect(isMachineClinicalText("Dori: Everolimus Evercon. Eski doza: 0.5 → Yangi doza: 0.5")).toBe(true);
  });
  it("leaves unrecognized authored notes unchanged", () => {
    expect(localizeClinicalText("Patient discussed treatment with family", "ru")).toBe("Patient discussed treatment with family");
  });
});

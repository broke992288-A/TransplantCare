import { describe, expect, it } from "vitest";
import { translations } from "@/hooks/useLanguage";
import { localizeClinicalText, isMachineClinicalText } from "./clinicalText";
import { computeSmartPriority } from "@/utils/smartPriority";
import { translateUi } from "./uiText";
import { validateLabValues } from "@/utils/labValidation";

describe("three-language coverage contracts", () => {
  it("requires matching nonempty translation keys in all three languages", () => {
    const keys = Object.keys(translations.en).sort();
    for (const lang of ["en", "ru", "uz"] as const) {
      expect(Object.keys(translations[lang]).sort()).toEqual(keys);
      expect(Object.values(translations[lang]).every(value => value.trim().length > 0)).toBe(true);
    }
  });

  it("recognizes critical engine warnings without AI and preserves numeric thresholds", () => {
    const source = "TOTAL_BILIRUBIN critically abnormal: total_bilirubin 14.4 mg/dL ≥ 3 (critical); Tacrolimus data missing";
    expect(isMachineClinicalText(source)).toBe(true);
    for (const lang of ["uz", "ru"] as const) {
      const result = localizeClinicalText(source, lang);
      expect(result).not.toBe(source);
      expect(result).toContain("14.4 mg/dL ≥ 3");
      expect(result).not.toContain("critically abnormal");
      expect(result).not.toContain("data missing");
    }
  });

  it("localizes signed and scientific threshold values without changing them", () => {
    const result = localizeClinicalText("potassium -1e-2 mmol/L ≤ 3 (warning)", "ru");
    expect(result).toContain("-1e-2 mmol/L ≤ 3");
    expect(result).not.toContain("warning");
  });

  it("covers generated smart priority reasons without changing urgency", () => {
    const pair = { latest: null, previous: null };
    for (const risk_level of ["high", "medium", "low"]) {
      const priority = computeSmartPriority({ risk_level, risk_score: 72, organ_type: "kidney" }, pair, false, 0);
      for (const lang of ["uz", "ru"] as const) {
        expect(translateUi(localizeClinicalText(priority.reason, lang), lang)).not.toBe(priority.reason);
      }
    }
  });

  it("preserves clinician validation values in every language", () => {
    const issues = validateLabValues({ creatinine: 99, direct_bilirubin: 2, total_bilirubin: 1 });
    expect(issues).toHaveLength(2);
    for (const issue of issues) {
      expect(isMachineClinicalText(issue.message)).toBe(true);
      for (const lang of ["en", "ru", "uz"] as const) {
        expect(localizeClinicalText(issue.message, lang)).toContain(String(issue.value));
      }
    }
  });
});
import { describe, it, expect } from "vitest";
import { detectAndConvert, convertUnit, normalizeLabValues, STANDARD_UNITS } from "@/utils/unitConversion";

describe("detectAndConvert", () => {
  it("converts bilirubin from µmol/L to mg/dL", () => {
    const result = detectAndConvert("total_bilirubin", 51.3);
    expect(result.converted).toBe(true);
    expect(result.value).toBeCloseTo(3.0, 1);
    expect(result.fromUnit).toBe("µmol/L");
  });

  it("does not convert bilirubin already in mg/dL", () => {
    const result = detectAndConvert("total_bilirubin", 1.2);
    expect(result.converted).toBe(false);
  });

  it("converts creatinine from µmol/L to mg/dL", () => {
    const result = detectAndConvert("creatinine", 88.4);
    expect(result.converted).toBe(true);
    expect(result.value).toBeCloseTo(1.0, 1);
  });

  it("does not convert creatinine already in mg/dL", () => {
    const result = detectAndConvert("creatinine", 1.2);
    expect(result.converted).toBe(false);
  });

  it("converts hemoglobin from g/L to g/dL", () => {
    const result = detectAndConvert("hb", 140);
    expect(result.converted).toBe(true);
    expect(result.value).toBeCloseTo(14.0, 1);
  });

  it("converts platelets from cells/µL", () => {
    const result = detectAndConvert("platelets", 250000);
    expect(result.converted).toBe(true);
    expect(result.value).toBeCloseTo(250, 0);
  });

  it("converts WBC from cells/µL", () => {
    const result = detectAndConvert("tlc", 8000);
    expect(result.converted).toBe(true);
    expect(result.value).toBeCloseTo(8.0, 1);
  });

  it("handles NaN gracefully", () => {
    const result = detectAndConvert("creatinine", NaN);
    expect(result.converted).toBe(false);
  });
});

describe("convertUnit", () => {
  it("converts bilirubin µmol/L to mg/dL", () => {
    const result = convertUnit("total_bilirubin", 17.1, "µmol/L", "mg/dL");
    expect(result).toBeCloseTo(1.0, 1);
  });

  it("converts reverse (mg/dL to µmol/L)", () => {
    const result = convertUnit("total_bilirubin", 1.0, "mg/dL", "µmol/L");
    expect(result).toBeCloseTo(17.1, 0);
  });

  it("returns null for unknown conversion", () => {
    expect(convertUnit("unknown_param", 10, "foo", "bar")).toBeNull();
  });
});

describe("normalizeLabValues", () => {
  it("normalizes mixed-unit lab record", () => {
    const { normalized, conversions } = normalizeLabValues({
      creatinine: 88.4,
      total_bilirubin: 1.0,
      hb: 140,
      alt: 45,
    });
    expect(normalized.creatinine).toBeCloseTo(1.0, 1);
    expect(normalized.hb).toBeCloseTo(14.0, 1);
    expect(normalized.total_bilirubin).toBe(1.0); // already in mg/dL
    expect(normalized.alt).toBe(45); // not convertible
    expect(conversions.length).toBe(2);
  });

  it("skips null values", () => {
    const { normalized, conversions } = normalizeLabValues({ creatinine: null, hb: undefined });
    expect(conversions.length).toBe(0);
  });
});

describe("STANDARD_UNITS", () => {
  it("has standard units for key parameters", () => {
    expect(STANDARD_UNITS.creatinine).toBe("mg/dL");
    expect(STANDARD_UNITS.tacrolimus_level).toBe("ng/mL");
    expect(STANDARD_UNITS.egfr).toBe("mL/min/1.73m²");
    expect(STANDARD_UNITS.potassium).toBe("mmol/L");
  });
});

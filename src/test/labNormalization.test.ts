import { describe, it, expect } from "vitest";
import { normalizeField, normalizeFields } from "@/utils/labNormalization";
import { kidneyLabSchema, liverLabSchema } from "@/lib/validations";

describe("normalizeField — explicit source-unit conversion", () => {
  it("converts Uzbek creatinine 90 µmol/L to 1.02 mg/dL", () => {
    const r = normalizeField("creatinine", 90, "µmol/L");
    expect(r.converted).toBe(true);
    expect(r.value).toBeCloseTo(1.02, 2);
    expect(r.rawValue).toBe(90);
    expect(r.sourceUnit).toBe("µmol/L");
    expect(r.canonicalUnit).toBe("mg/dL");
  });

  it("keeps Indian creatinine 1.2 mg/dL unchanged", () => {
    const r = normalizeField("creatinine", 1.2, "mg/dL");
    expect(r.converted).toBe(false);
    expect(r.value).toBe(1.2);
  });

  it("converts bilirubin 20 µmol/L to ~1.17 mg/dL", () => {
    const r = normalizeField("total_bilirubin", 20, "µmol/L");
    expect(r.converted).toBe(true);
    expect(r.value).toBeCloseTo(1.17, 2);
  });

  it("converts direct bilirubin 20 µmol/L too", () => {
    expect(normalizeField("direct_bilirubin", 20, "µmol/L").value).toBeCloseTo(1.17, 2);
  });

  it("never guesses when the source unit is unknown", () => {
    const r = normalizeField("creatinine", 90, null);
    expect(r.converted).toBe(false);
    expect(r.value).toBe(90);
    expect(r.ambiguous).toBe(true);
  });

  it("flags a known-but-unmapped unit instead of scaling it", () => {
    const r = normalizeField("creatinine", 90, "mmol/L");
    expect(r.converted).toBe(false);
    expect(r.ambiguous).toBe(true);
  });

  it("leaves unit-agnostic markers (ALT U/L) alone", () => {
    const r = normalizeField("alt", 45, "U/L");
    expect(r.converted).toBe(false);
    expect(r.value).toBe(45);
    expect(r.ambiguous).toBe(false);
  });
});

describe("normalization order — normalize BEFORE physiologic validation", () => {
  it("raw µmol/L creatinine fails hard validation (why order matters)", () => {
    expect(kidneyLabSchema.safeParse({
      creatinine: 90, egfr: "", proteinuria: 0.2, potassium: 4.2,
    }).success).toBe(false);
  });

  it("normalized creatinine passes hard validation", () => {
    const { fields } = normalizeFields(
      { creatinine: "90", proteinuria: "0.2", potassium: "4.2" },
      (k) => (k === "creatinine" ? "µmol/L" : null),
    );
    const parsed = kidneyLabSchema.safeParse({
      creatinine: fields.creatinine.value,
      egfr: "",
      proteinuria: fields.proteinuria?.value ?? 0,
      potassium: fields.potassium?.value ?? 0,
    });
    expect(parsed.success).toBe(true);
  });

  it("normalized bilirubin 40 µmol/L passes liver validation", () => {
    const r = normalizeField("total_bilirubin", 40, "µmol/L");
    const parsed = liverLabSchema.safeParse({
      tacrolimus_level: 7, alt: 30, ast: 28,
      total_bilirubin: r.value, direct_bilirubin: 0.3,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("normalizeFields", () => {
  it("skips empty and non-numeric entries and reports ambiguity", () => {
    const { fields, ambiguous } = normalizeFields(
      { creatinine: "90", potassium: "", proteinuria: "abc", egfr: "55" },
      (k) => (k === "creatinine" ? "µmol/L" : null),
    );
    expect(Object.keys(fields).sort()).toEqual(["creatinine", "egfr"]);
    expect(ambiguous).toContain("egfr");
  });
});

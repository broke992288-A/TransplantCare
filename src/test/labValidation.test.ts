import { describe, it, expect } from "vitest";
import { validateLabValues, hasValidationErrors } from "@/utils/labValidation";

describe("validateLabValues", () => {
  it("returns empty for normal values", () => {
    const results = validateLabValues({ creatinine: 1.0, potassium: 4.5, alt: 30 });
    expect(results).toHaveLength(0);
  });

  it("flags impossible creatinine", () => {
    const results = validateLabValues({ creatinine: 50 });
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe("error");
    expect(results[0].parameter).toBe("creatinine");
  });

  it("flags suspicious but possible creatinine", () => {
    const results = validateLabValues({ creatinine: 18 });
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe("warning");
  });

  it("flags impossible potassium", () => {
    const results = validateLabValues({ potassium: 12 });
    expect(results[0].severity).toBe("error");
  });

  it("detects direct > total bilirubin cross-field error", () => {
    const results = validateLabValues({ total_bilirubin: 2.0, direct_bilirubin: 3.0 });
    expect(results.some(r => r.parameter === "direct_bilirubin" && r.severity === "error")).toBe(true);
  });

  it("allows valid bilirubin cross-field", () => {
    const results = validateLabValues({ total_bilirubin: 3.0, direct_bilirubin: 1.0 });
    expect(results.filter(r => r.parameter === "direct_bilirubin")).toHaveLength(0);
  });

  it("skips null and non-numeric values", () => {
    const results = validateLabValues({ creatinine: null, alt: "abc", potassium: undefined });
    expect(results).toHaveLength(0);
  });

  it("flags multiple impossible values", () => {
    const results = validateLabValues({ creatinine: 50, potassium: 0.5, hb: 30 });
    expect(results.length).toBeGreaterThanOrEqual(3);
  });
});

describe("hasValidationErrors", () => {
  it("returns true when errors exist", () => {
    expect(hasValidationErrors([{ parameter: "cr", value: 50, severity: "error", message: "test" }])).toBe(true);
  });

  it("returns false for warnings only", () => {
    expect(hasValidationErrors([{ parameter: "cr", value: 18, severity: "warning", message: "test" }])).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasValidationErrors([])).toBe(false);
  });
});

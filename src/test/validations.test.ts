import { describe, it, expect } from "vitest";
import { patientSchema, liverLabSchema, kidneyLabSchema, medicationSchema } from "@/lib/validations";

describe("patientSchema", () => {
  const validPatient = {
    full_name: "Test Patient",
    date_of_birth: "1990-01-01",
    gender: "male" as const,
    region: "Toshkent shahri",
    district: "Yunusobod",
    transplant_number: 1,
    transplant_date: "2024-01-01",
  };

  it("passes with valid data", () => {
    expect(patientSchema.safeParse(validPatient).success).toBe(true);
  });

  it("fails with empty name", () => {
    const result = patientSchema.safeParse({ ...validPatient, full_name: "" });
    expect(result.success).toBe(false);
  });

  it("fails with name > 100 chars", () => {
    const result = patientSchema.safeParse({ ...validPatient, full_name: "A".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("fails with empty region", () => {
    const result = patientSchema.safeParse({ ...validPatient, region: "" });
    expect(result.success).toBe(false);
  });

  it("fails with invalid gender", () => {
    const result = patientSchema.safeParse({ ...validPatient, gender: "unknown" });
    expect(result.success).toBe(false);
  });

  it("fails with transplant_number > 10", () => {
    const result = patientSchema.safeParse({ ...validPatient, transplant_number: 15 });
    expect(result.success).toBe(false);
  });
});

describe("liverLabSchema", () => {
  const valid = { tacrolimus_level: 8, alt: 30, ast: 25, total_bilirubin: 1.0, direct_bilirubin: 0.3 };

  it("passes valid liver labs", () => {
    expect(liverLabSchema.safeParse(valid).success).toBe(true);
  });

  it("fails when tacrolimus > 50", () => {
    expect(liverLabSchema.safeParse({ ...valid, tacrolimus_level: 60 }).success).toBe(false);
  });

  it("fails with negative ALT", () => {
    expect(liverLabSchema.safeParse({ ...valid, alt: -5 }).success).toBe(false);
  });

  it("coerces string numbers", () => {
    const result = liverLabSchema.safeParse({ tacrolimus_level: "8", alt: "30", ast: "25", total_bilirubin: "1.0", direct_bilirubin: "0.3" });
    expect(result.success).toBe(true);
  });
});

describe("kidneyLabSchema", () => {
  const valid = { creatinine: 1.0, egfr: 80, proteinuria: 0.1, potassium: 4.5 };

  it("passes valid kidney labs", () => {
    expect(kidneyLabSchema.safeParse(valid).success).toBe(true);
  });

  it("fails when creatinine > 30", () => {
    expect(kidneyLabSchema.safeParse({ ...valid, creatinine: 35 }).success).toBe(false);
  });

  it("fails when potassium < 1", () => {
    expect(kidneyLabSchema.safeParse({ ...valid, potassium: 0.5 }).success).toBe(false);
  });
});

describe("medicationSchema", () => {
  const valid = { medication_name: "Tacrolimus", dosage: "5 mg", frequency: "daily" as const, start_date: "2024-01-01" };

  it("passes valid medication", () => {
    expect(medicationSchema.safeParse(valid).success).toBe(true);
  });

  it("fails with empty name", () => {
    expect(medicationSchema.safeParse({ ...valid, medication_name: "" }).success).toBe(false);
  });

  it("fails with empty dosage", () => {
    expect(medicationSchema.safeParse({ ...valid, dosage: "" }).success).toBe(false);
  });

  it("fails with invalid frequency", () => {
    expect(medicationSchema.safeParse({ ...valid, frequency: "hourly" }).success).toBe(false);
  });

  it("allows optional notes up to 500 chars", () => {
    expect(medicationSchema.safeParse({ ...valid, notes: "Some note" }).success).toBe(true);
  });

  it("rejects notes > 500 chars", () => {
    expect(medicationSchema.safeParse({ ...valid, notes: "A".repeat(501) }).success).toBe(false);
  });
});

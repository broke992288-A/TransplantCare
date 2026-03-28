import { describe, it, expect } from "vitest";
import { calculateEgfr, getAgeFromDob, autoCalculateEgfr } from "@/utils/egfrCalculator";

describe("calculateEgfr", () => {
  it("returns 0 for creatinine <= 0", () => {
    expect(calculateEgfr({ creatinine: 0, age: 50, sex: "male" })).toBe(0);
  });

  it("returns 0 for age <= 0", () => {
    expect(calculateEgfr({ creatinine: 1.0, age: 0, sex: "male" })).toBe(0);
  });

  it("calculates normal male eGFR", () => {
    const result = calculateEgfr({ creatinine: 1.0, age: 40, sex: "male" });
    expect(result).toBeGreaterThan(80);
    expect(result).toBeLessThan(130);
  });

  it("calculates normal female eGFR (higher due to sex coefficient)", () => {
    const male = calculateEgfr({ creatinine: 0.7, age: 40, sex: "male" });
    const female = calculateEgfr({ creatinine: 0.7, age: 40, sex: "female" });
    expect(female).toBeGreaterThan(male * 0.9); // female coefficient boosts
  });

  it("returns lower eGFR for higher creatinine", () => {
    const normal = calculateEgfr({ creatinine: 1.0, age: 50, sex: "male" });
    const high = calculateEgfr({ creatinine: 3.0, age: 50, sex: "male" });
    expect(high).toBeLessThan(normal);
  });

  it("returns lower eGFR for older age", () => {
    const young = calculateEgfr({ creatinine: 1.0, age: 30, sex: "male" });
    const old = calculateEgfr({ creatinine: 1.0, age: 70, sex: "male" });
    expect(old).toBeLessThan(young);
  });

  it("returns integer value", () => {
    const result = calculateEgfr({ creatinine: 1.2, age: 45, sex: "female" });
    expect(result).toBe(Math.round(result));
  });
});

describe("getAgeFromDob", () => {
  it("returns null for null input", () => {
    expect(getAgeFromDob(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(getAgeFromDob(undefined)).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(getAgeFromDob("not-a-date")).toBeNull();
  });

  it("calculates correct age", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 35);
    dob.setMonth(0, 1);
    const age = getAgeFromDob(dob.toISOString().slice(0, 10));
    expect(age).toBeGreaterThanOrEqual(34);
    expect(age).toBeLessThanOrEqual(35);
  });
});

describe("autoCalculateEgfr", () => {
  it("returns null when creatinine is missing", () => {
    expect(autoCalculateEgfr(null, "1990-01-01", "male")).toBeNull();
  });

  it("returns null when dob is missing", () => {
    expect(autoCalculateEgfr(1.0, null, "male")).toBeNull();
  });

  it("returns eGFR when all params available", () => {
    const result = autoCalculateEgfr(1.0, "1985-06-15", "male");
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(50);
  });

  it("defaults to male for unknown gender", () => {
    const result = autoCalculateEgfr(1.0, "1985-06-15", "other");
    const male = autoCalculateEgfr(1.0, "1985-06-15", "male");
    expect(result).toBe(male);
  });
});

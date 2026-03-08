import { describe, it, expect } from "vitest";
import { calculateRisk, riskColorClass, daysSince, getAge } from "@/utils/risk";

describe("calculateRisk", () => {
  describe("liver", () => {
    it("returns high when ALT > 120", () => {
      expect(calculateRisk("liver", { alt: "150", tacrolimus_level: "8", transplant_number: "1" })).toBe("high");
    });

    it("returns high when tacrolimus < 5 and txNum >= 2", () => {
      expect(calculateRisk("liver", { alt: "30", tacrolimus_level: "3", transplant_number: "2" })).toBe("high");
    });

    it("returns medium when tacrolimus < 5 and txNum = 1", () => {
      expect(calculateRisk("liver", { alt: "30", tacrolimus_level: "3", transplant_number: "1" })).toBe("medium");
    });

    it("returns medium when txNum >= 2 and normal labs", () => {
      expect(calculateRisk("liver", { alt: "30", tacrolimus_level: "8", transplant_number: "2" })).toBe("medium");
    });

    it("returns low when all normal", () => {
      expect(calculateRisk("liver", { alt: "30", tacrolimus_level: "8", transplant_number: "1" })).toBe("low");
    });
  });

  describe("kidney", () => {
    it("returns high with dialysis history", () => {
      expect(calculateRisk("kidney", { creatinine: "1.0", egfr: "80", dialysis_history: "yes" })).toBe("high");
    });

    it("returns high when creatinine > 2.5", () => {
      expect(calculateRisk("kidney", { creatinine: "3.0", egfr: "80" })).toBe("high");
    });

    it("returns high when eGFR < 30", () => {
      expect(calculateRisk("kidney", { creatinine: "1.0", egfr: "25" })).toBe("high");
    });

    it("returns medium when eGFR < 45", () => {
      expect(calculateRisk("kidney", { creatinine: "1.0", egfr: "40" })).toBe("medium");
    });

    it("returns medium when creatinine > 1.5", () => {
      expect(calculateRisk("kidney", { creatinine: "1.8", egfr: "70" })).toBe("medium");
    });

    it("returns low when all normal", () => {
      expect(calculateRisk("kidney", { creatinine: "1.0", egfr: "80" })).toBe("low");
    });
  });
});

describe("riskColorClass", () => {
  it("returns destructive for high", () => {
    expect(riskColorClass("high")).toContain("destructive");
  });
  it("returns warning for medium", () => {
    expect(riskColorClass("medium")).toContain("warning");
  });
  it("returns success for low", () => {
    expect(riskColorClass("low")).toContain("success");
  });
});

describe("daysSince", () => {
  it("returns 0 for today", () => {
    expect(daysSince(new Date().toISOString())).toBe(0);
  });
  it("returns positive for past dates", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    expect(daysSince(past.toISOString())).toBe(10);
  });
});

describe("getAge", () => {
  it("returns — for null", () => {
    expect(getAge(null)).toBe("—");
  });
  it("calculates age correctly", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 30);
    const age = getAge(dob.toISOString().slice(0, 10));
    expect(age).toBe(30);
  });
});

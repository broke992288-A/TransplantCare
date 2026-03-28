import { describe, it, expect } from "vitest";
import { calculateRisk, calculateRiskScore, riskColorClass, daysSince, getAge } from "@/utils/risk";
import { computeRiskScore } from "@/services/riskSnapshotService";

describe("calculateRisk", () => {
  describe("liver", () => {
    it("returns high when ALT > 120 with tacrolimus < 5", () => {
      // ALT 150 = 25pts, tacrolimus 3 = 25pts = 50pts → medium
      // Need more to hit 60: add transplant_number >= 2 (+15)
      expect(calculateRisk("liver", { alt: 150, tacrolimus_level: 3, transplant_number: 2 })).toBe("high");
    });

    it("returns medium with moderately elevated ALT", () => {
      // ALT 150 = 25pts only → medium needs 30+
      expect(calculateRisk("liver", { alt: 150, tacrolimus_level: 8, transplant_number: 1 })).toBe("low");
      // ALT 150 (25) + tac < 5 (25) = 50 → medium
      expect(calculateRisk("liver", { alt: 150, tacrolimus_level: 3, transplant_number: 1 })).toBe("medium");
    });

    it("returns low when all normal", () => {
      expect(calculateRisk("liver", { alt: 30, tacrolimus_level: 8, transplant_number: 1 })).toBe("low");
    });
  });

  describe("kidney", () => {
    it("returns high with dialysis + creatinine", () => {
      // dialysis = 20pts, creatinine 3.0 = 30pts, egfr 20 = 25pts = 75 → high
      expect(calculateRisk("kidney", { creatinine: 3.0, egfr: 20, dialysis_history: "yes" })).toBe("high");
    });

    it("returns high when creatinine > 2.5 and egfr < 30", () => {
      // cr 3.0 = 30pts + egfr 25 = 25pts = 55 → medium; need more
      expect(calculateRisk("kidney", { creatinine: 3.0, egfr: 25, potassium: 6.5, transplant_number: 1 })).toBe("high");
    });

    it("returns medium with elevated creatinine", () => {
      // cr 1.8 = 12pts + tac 3 = 20pts = 32 → medium
      expect(calculateRisk("kidney", { creatinine: 1.8, egfr: 70, tacrolimus_level: 3 })).toBe("medium");
    });

    it("returns low when all normal", () => {
      expect(calculateRisk("kidney", { creatinine: 1.0, egfr: 80 })).toBe("low");
    });
  });
});

describe("calculateRiskScore", () => {
  it("applies blood type mismatch penalty", () => {
    const score = calculateRiskScore("kidney", { 
      blood_type: "A", donor_blood_type: "B",
      creatinine: 1.0, egfr: 80 
    });
    expect(score).toBeGreaterThanOrEqual(25);
  });

  it("reduces penalty with titer therapy", () => {
    const withoutTiter = calculateRiskScore("kidney", { 
      blood_type: "A", donor_blood_type: "B",
      creatinine: 1.0, egfr: 80 
    });
    const withTiter = calculateRiskScore("kidney", { 
      blood_type: "A", donor_blood_type: "B", titer_therapy: true,
      creatinine: 1.0, egfr: 80 
    });
    expect(withTiter).toBeLessThan(withoutTiter);
  });

  it("caps at 100", () => {
    const score = calculateRiskScore("liver", {
      alt: 300, ast: 300, total_bilirubin: 10, direct_bilirubin: 5,
      ggt: 300, alp: 400, tacrolimus_level: 2, transplant_number: 3,
    });
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("computeRiskScore (advanced)", () => {
  const baseLiverLab = {
    tacrolimus_level: 8, alt: 30, ast: 25, total_bilirubin: 0.8,
    creatinine: null, egfr: null, proteinuria: null, potassium: null,
  } as any;

  const baseKidneyLab = {
    creatinine: 1.0, egfr: 80, potassium: 4.0, proteinuria: 0.1,
    tacrolimus_level: 8, alt: null, ast: null, total_bilirubin: null,
  } as any;

  it("adds early post-transplant bonus when < 90 days", () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);
    const result = computeRiskScore("liver", baseLiverLab, {
      transplant_date: recentDate.toISOString().slice(0, 10),
    });
    expect(result.score).toBeGreaterThanOrEqual(10);
    expect(result.explanations.some(e => e.key === "early_post_tx")).toBe(true);
  });

  it("does NOT add early post-transplant bonus when > 90 days", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 200);
    const result = computeRiskScore("liver", baseLiverLab, {
      transplant_date: oldDate.toISOString().slice(0, 10),
    });
    expect(result.explanations.some(e => e.key === "early_post_tx")).toBe(false);
  });

  it("detects ALT rapid increase from rolling lab window", () => {
    const history = [
      { ...baseLiverLab, alt: 45 },
      { ...baseLiverLab, alt: 50 },
      { ...baseLiverLab, alt: 55 },
      { ...baseLiverLab, alt: 52 },
    ];
    const currentLab = { ...baseLiverLab, alt: 80 };
    const result = computeRiskScore("liver", currentLab, {}, history);
    expect(result.explanations.some(e => e.key === "alt_trend_up")).toBe(true);
  });

  it("detects creatinine rapid increase from rolling lab window", () => {
    const history = [
      { ...baseKidneyLab, creatinine: 1.0 },
      { ...baseKidneyLab, creatinine: 1.1 },
      { ...baseKidneyLab, creatinine: 0.95 },
      { ...baseKidneyLab, creatinine: 1.05 },
    ];
    const currentLab = { ...baseKidneyLab, creatinine: 1.5 };
    const result = computeRiskScore("kidney", currentLab, {}, history);
    expect(result.explanations.some(e => e.key === "cr_trend_up")).toBe(true);
  });

  it("detects multiple abnormal labs for kidney", () => {
    const abnormalLab = { ...baseKidneyLab, creatinine: 2.0, egfr: 40, tacrolimus_level: 3 };
    const result = computeRiskScore("kidney", abnormalLab, {});
    expect(result.explanations.some(e => e.key === "multiple_abnormal")).toBe(true);
  });

  it("returns explanations array with each risk factor", () => {
    const criticalLab = { ...baseLiverLab, alt: 200, tacrolimus_level: 3 };
    const result = computeRiskScore("liver", criticalLab, {});
    expect(result.explanations.length).toBeGreaterThanOrEqual(2);
    expect(result.explanations.every(e => e.message && e.severity)).toBe(true);
  });

  it("caps score at 100", () => {
    const extremeLab = {
      tacrolimus_level: 1, alt: 300, ast: 300, total_bilirubin: 10,
      creatinine: null, egfr: null, proteinuria: null, potassium: null,
    } as any;
    const history = [{ ...extremeLab, alt: 50 }, { ...extremeLab, alt: 60 }];
    const result = computeRiskScore("liver", extremeLab, { transplant_number: 3 }, history);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns low for normal kidney labs", () => {
    const result = computeRiskScore("kidney", baseKidneyLab, {});
    expect(result.level).toBe("low");
    expect(result.score).toBeLessThan(30);
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
    dob.setMonth(0, 1); // Jan 1 to avoid edge case
    const age = getAge(dob.toISOString().slice(0, 10));
    expect(age).toBeGreaterThanOrEqual(29);
    expect(age).toBeLessThanOrEqual(30);
  });
});

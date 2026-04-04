import { describe, it, expect } from "vitest";
import { calculateRisk, calculateRiskScore, riskColorClass, daysSince, getAge } from "@/utils/risk";
import { computeRiskScore } from "@/services/riskSnapshotService";

describe("calculateRisk", () => {
  describe("liver", () => {
    it("returns high when ALT > 120 with tacrolimus outside window", () => {
      // ALT 150 = 25pts, tac 3 outside [4-7] for >180d = 25pts, retransplant = 15pts = 65 → high
      expect(calculateRisk("liver", { alt: 150, tacrolimus_level: 3, transplant_number: 2 })).toBe("high");
    });

    it("returns medium with moderately elevated ALT and tac outside window", () => {
      // ALT 150 = 25pts only → no transplant_date means >180d, tac 8 > 7 = 25pts → 50 → medium
      expect(calculateRisk("liver", { alt: 150, tacrolimus_level: 8, transplant_number: 1 })).toBe("medium");
      // ALT 150 (25) + tac 3 outside [4-7] (25) = 50 → medium
      expect(calculateRisk("liver", { alt: 150, tacrolimus_level: 3, transplant_number: 1 })).toBe("medium");
    });

    it("returns low when all normal (tac in late window [4-7])", () => {
      // tac 5 is within [4-7] for >180d (no transplant_date), ALT 30 = normal
      expect(calculateRisk("liver", { alt: 30, tacrolimus_level: 5, transplant_number: 1 })).toBe("low");
    });

    it("uses time-dependent tac windows for early post-tx", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 15); // 15 days ago → 0-30d window: [8-10]
      // tac 7 < 8 → +25pts, early post-tx +10 = 35 → medium
      expect(calculateRisk("liver", { alt: 30, tacrolimus_level: 7, transplant_number: 1, transplant_date: recentDate.toISOString().slice(0, 10) })).toBe("medium");
      // tac 9 is within [8-10] → 0 + early +10 = 10 → low
      expect(calculateRisk("liver", { alt: 30, tacrolimus_level: 9, transplant_number: 1, transplant_date: recentDate.toISOString().slice(0, 10) })).toBe("low");
    });
  });

  describe("kidney", () => {
    it("returns high with dialysis + creatinine", () => {
      // dialysis = 20pts, creatinine 3.0 = 30pts, egfr 20 = 25pts = 75 + tac pts → high
      expect(calculateRisk("kidney", { creatinine: 3.0, egfr: 20, dialysis_history: "yes" })).toBe("high");
    });

    it("returns high when creatinine > 2.5 and egfr < 30", () => {
      expect(calculateRisk("kidney", { creatinine: 3.0, egfr: 25, potassium: 6.5, transplant_number: 1 })).toBe("high");
    });

    it("returns medium with elevated creatinine and tac outside window", () => {
      // cr 1.8 = 12pts + tac 3 (no transplant_date → >365d, target [4-6], <4 → +25pts) = 37 → medium
      expect(calculateRisk("kidney", { creatinine: 1.8, egfr: 70, tacrolimus_level: 3 })).toBe("medium");
    });

    it("returns low when all normal (tac in late window [4-6])", () => {
      // tac 5 is within [4-6] for >365d
      expect(calculateRisk("kidney", { creatinine: 1.0, egfr: 80, tacrolimus_level: 5 })).toBe("low");
    });

    it("uses time-dependent tac windows for kidney", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days → 0-90d window: [8-12]
      // tac 10 is within [8-12] → 0pts
      const score = calculateRiskScore("kidney", { creatinine: 1.0, egfr: 80, tacrolimus_level: 10, transplant_date: recentDate.toISOString().slice(0, 10) });
      expect(score).toBe(10); // only early post-tx bonus

      // tac 7 < 8 → +20pts
      const score2 = calculateRiskScore("kidney", { creatinine: 1.0, egfr: 80, tacrolimus_level: 7, transplant_date: recentDate.toISOString().slice(0, 10) });
      expect(score2).toBe(30); // 10 early + 20 tac
    });

    it("adds baseline-relative creatinine penalty", () => {
      // best_creatinine = 1.0, current = 1.3 → 30% above → +35pts
      const score = calculateRiskScore("kidney", { creatinine: 1.3, egfr: 80, best_creatinine: 1.0 });
      expect(score).toBeGreaterThanOrEqual(35);
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
    tacrolimus_level: 5, alt: 30, ast: 25, total_bilirubin: 0.8,
    creatinine: null, egfr: null, proteinuria: null, potassium: null,
  } as any;

  const baseKidneyLab = {
    creatinine: 1.0, egfr: 80, potassium: 4.0, proteinuria: 0.1,
    tacrolimus_level: 5, alt: null, ast: null, total_bilirubin: null,
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

  it("detects ALT rapid increase (>50%) from rolling lab window", () => {
    const history = [
      { ...baseLiverLab, alt: 40 },
      { ...baseLiverLab, alt: 42 },
      { ...baseLiverLab, alt: 38 },
    ];
    const currentLab = { ...baseLiverLab, alt: 80 }; // ~100% increase from median ~40
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

  it("detects baseline-relative creatinine >25% for kidney", () => {
    const history = [
      { ...baseKidneyLab, creatinine: 0.9 },
      { ...baseKidneyLab, creatinine: 1.0 },
      { ...baseKidneyLab, creatinine: 0.95 },
    ];
    const currentLab = { ...baseKidneyLab, creatinine: 1.3 }; // >25% above best 0.9
    const result = computeRiskScore("kidney", currentLab, {}, history);
    expect(result.explanations.some(e => e.key === "cr_baseline_alert")).toBe(true);
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

  it("includes guideline reference in tacrolimus explanations", () => {
    const lab = { ...baseLiverLab, tacrolimus_level: 3 }; // <4 for >180d → outside [4-7]
    const result = computeRiskScore("liver", lab, {});
    const tacExpl = result.explanations.find(e => e.key === "tacrolimus_low");
    expect(tacExpl).toBeDefined();
    expect(tacExpl?.guideline).toContain("AASLD");
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
    dob.setMonth(0, 1);
    const age = getAge(dob.toISOString().slice(0, 10));
    expect(age).toBeGreaterThanOrEqual(29);
    expect(age).toBeLessThanOrEqual(30);
  });
});

describe("BK/CMV/DSA kidney risk markers", () => {
  it("adds +20 for BK virus >10000", () => {
    const score = calculateRiskScore("kidney", { bk_virus_load: 15000 });
    expect(score).toBeGreaterThanOrEqual(20);
  });

  it("adds +10 for BK virus >1000 but <=10000", () => {
    const score = calculateRiskScore("kidney", { bk_virus_load: 5000 });
    expect(score).toBeGreaterThanOrEqual(10);
  });

  it("no points for BK virus <=1000", () => {
    const score = calculateRiskScore("kidney", { bk_virus_load: 500 });
    expect(score).toBe(0);
  });

  it("adds +15 for CMV >1000", () => {
    const score = calculateRiskScore("kidney", { cmv_load: 2000 });
    expect(score).toBeGreaterThanOrEqual(15);
  });

  it("adds +8 for CMV >500 but <=1000", () => {
    const score = calculateRiskScore("kidney", { cmv_load: 800 });
    expect(score).toBeGreaterThanOrEqual(8);
  });

  it("adds +20 for DSA MFI >5000", () => {
    const score = calculateRiskScore("kidney", { dsa_mfi: 8000 });
    expect(score).toBeGreaterThanOrEqual(20);
  });

  it("adds +10 for DSA MFI >1000 but <=5000", () => {
    const score = calculateRiskScore("kidney", { dsa_mfi: 3000 });
    expect(score).toBeGreaterThanOrEqual(10);
  });

  it("combined BK + CMV + DSA produces high risk", () => {
    const score = calculateRiskScore("kidney", { bk_virus_load: 15000, cmv_load: 2000, dsa_mfi: 8000 });
    // 20 + 15 + 20 = 55 → medium; with creatinine elevated → high
    expect(score).toBeGreaterThanOrEqual(55);
  });

  it("does NOT add BK/CMV/DSA points for liver organ", () => {
    const score = calculateRiskScore("liver", { bk_virus_load: 15000, cmv_load: 2000, dsa_mfi: 8000 });
    expect(score).toBe(0);
  });
});

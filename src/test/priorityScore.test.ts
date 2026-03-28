import { describe, it, expect } from "vitest";
import { calculatePriorityScore, priorityCategoryLabel, priorityCategoryColor, type PriorityInput } from "@/utils/priorityScore";

const baseInput: PriorityInput = {
  riskScore: 20,
  riskLevel: "low",
  lastReviewDate: new Date().toISOString(),
  latestLabDate: null,
  hasCriticalLab: false,
  organType: "kidney",
  latestLab: null,
};

describe("calculatePriorityScore", () => {
  it("returns stable for low-risk reviewed patient", () => {
    const result = calculatePriorityScore(baseInput);
    expect(result.category).toBe("stable");
    expect(result.score).toBeLessThan(50);
  });

  it("increases score for high risk", () => {
    const result = calculatePriorityScore({ ...baseInput, riskScore: 85, riskLevel: "high" });
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.reasonKeys.some(r => r.key === "highRisk")).toBe(true);
  });

  it("increases score for never-reviewed patient", () => {
    const result = calculatePriorityScore({ ...baseInput, lastReviewDate: null });
    expect(result.reasonKeys.some(r => r.key === "neverReviewed")).toBe(true);
  });

  it("detects new lab within 24h", () => {
    const result = calculatePriorityScore({
      ...baseInput,
      latestLabDate: new Date(Date.now() - 3600000).toISOString(),
    });
    expect(result.reasonKeys.some(r => r.key === "newLab")).toBe(true);
  });

  it("detects critical kidney labs", () => {
    const result = calculatePriorityScore({
      ...baseInput,
      organType: "kidney",
      latestLab: { creatinine: 3.0, egfr: 20, potassium: 6.0 },
    });
    expect(result.reasonKeys.some(r => r.key === "creatinineHigh")).toBe(true);
    expect(result.reasonKeys.some(r => r.key === "egfrLow")).toBe(true);
  });

  it("detects critical liver labs", () => {
    const result = calculatePriorityScore({
      ...baseInput,
      organType: "liver",
      latestLab: { alt: 100, ast: 100, tacrolimus_level: 2, total_bilirubin: 3.0 },
    });
    expect(result.reasonKeys.some(r => r.key === "altHigh")).toBe(true);
    expect(result.reasonKeys.some(r => r.key === "tacrolimusAbnormal")).toBe(true);
  });

  it("caps score at 100", () => {
    const result = calculatePriorityScore({
      riskScore: 95, riskLevel: "high",
      lastReviewDate: null, latestLabDate: new Date().toISOString(),
      hasCriticalLab: true, organType: "kidney",
      latestLab: { creatinine: 5.0, egfr: 10, potassium: 7.0 },
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe("priorityCategoryLabel", () => {
  it("returns Uzbek labels without translator", () => {
    expect(priorityCategoryLabel("critical")).toContain("Zudlik");
    expect(priorityCategoryLabel("stable")).toContain("Barqaror");
  });
});

describe("priorityCategoryColor", () => {
  it("returns destructive for critical", () => {
    expect(priorityCategoryColor("critical")).toContain("destructive");
  });
  it("returns success for stable", () => {
    expect(priorityCategoryColor("stable")).toContain("success");
  });
});

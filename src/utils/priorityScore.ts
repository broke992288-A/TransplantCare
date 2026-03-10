/**
 * Patient Priority Score Calculator
 * Calculates a 0–100 score to help doctors identify which patients need attention first.
 */

export interface PriorityInput {
  riskScore: number | null;        // 0–100 from patient record
  riskLevel: string;               // "low" | "medium" | "high"
  lastReviewDate: string | null;   // last_risk_evaluation timestamp
  latestLabDate: string | null;    // most recent lab recorded_at
  hasCriticalLab: boolean;         // any critical lab values
  organType: string;
  latestLab: {
    creatinine?: number | null;
    tacrolimus_level?: number | null;
    alt?: number | null;
    ast?: number | null;
    total_bilirubin?: number | null;
    egfr?: number | null;
    potassium?: number | null;
  } | null;
}

export interface PriorityResult {
  score: number;
  category: "critical" | "review" | "stable";
  reasonKeys: { key: string; value?: string | number }[];
  reasons: string[];
}

/** Translation-aware reason builder */
function buildReasons(
  reasonKeys: { key: string; value?: string | number }[],
  t?: (key: string) => string
): string[] {
  if (!t) {
    return reasonKeys.map(r => {
      const label = REASON_FALLBACKS[r.key] ?? r.key;
      return r.value !== undefined ? `${label}: ${r.value}` : label;
    });
  }
  return reasonKeys.map(r => {
    const translated = t(`priority.${r.key}`);
    const label = translated !== `priority.${r.key}` ? translated : (REASON_FALLBACKS[r.key] ?? r.key);
    return r.value !== undefined ? `${label}: ${r.value}` : label;
  });
}

const REASON_FALLBACKS: Record<string, string> = {
  highRisk: "Yuqori xavf darajasi (>80)",
  mediumRisk: "O'rtacha xavf darajasi",
  highLevel: "Yuqori xavf darajasi",
  newLab: "Yangi tahlil yuklandi (24 soat ichida)",
  notReviewed: "Ko'rib chiqilmagan",
  neverReviewed: "Hech qachon ko'rib chiqilmagan",
  creatinineHigh: "Kreatinin yuqori",
  egfrLow: "eGFR past",
  potassiumAbnormal: "Kaliy og'ishi",
  altHigh: "ALT yuqori",
  astHigh: "AST yuqori",
  tacrolimusAbnormal: "Tacrolimus og'ishi",
  bilirubinHigh: "Bilirubin yuqori",
};

export function calculatePriorityScore(input: PriorityInput, t?: (key: string) => string): PriorityResult {
  let score = 0;
  const reasonKeys: { key: string; value?: string | number }[] = [];

  // 1. Current Risk Score (up to 40 points)
  const riskScore = input.riskScore ?? 0;
  if (riskScore > 80) {
    score += 40;
    reasonKeys.push({ key: "highRisk" });
  } else if (riskScore > 60) {
    score += 25;
    reasonKeys.push({ key: "mediumRisk" });
  } else if (riskScore > 40) {
    score += 12;
  }

  // 2. Risk level as prediction proxy (up to 20 points)
  if (input.riskLevel === "high") {
    score += 20;
    if (!reasonKeys.some(r => r.key === "highRisk")) {
      reasonKeys.push({ key: "highLevel" });
    }
  } else if (input.riskLevel === "medium") {
    score += 10;
  }

  // 3. New lab uploaded within 24h (up to 10 points)
  if (input.latestLabDate) {
    const hoursAgo = (Date.now() - new Date(input.latestLabDate).getTime()) / 3600000;
    if (hoursAgo <= 24) {
      score += 10;
      reasonKeys.push({ key: "newLab" });
    } else if (hoursAgo <= 72) {
      score += 5;
    }
  }

  // 4. Days since last doctor review (up to 15 points)
  if (input.lastReviewDate) {
    const daysSinceReview = (Date.now() - new Date(input.lastReviewDate).getTime()) / 86400000;
    if (daysSinceReview > 14) {
      score += 15;
      reasonKeys.push({ key: "notReviewed", value: Math.floor(daysSinceReview) });
    } else if (daysSinceReview > 10) {
      score += 10;
      reasonKeys.push({ key: "notReviewed", value: Math.floor(daysSinceReview) });
    } else if (daysSinceReview > 7) {
      score += 5;
    }
  } else {
    score += 15;
    reasonKeys.push({ key: "neverReviewed" });
  }

  // 5. Critical lab values (up to 15 points)
  if (input.latestLab) {
    const lab = input.latestLab;
    if (input.organType === "kidney") {
      if (lab.creatinine && lab.creatinine > 2.0) {
        score += 8;
        reasonKeys.push({ key: "creatinineHigh", value: lab.creatinine });
      }
      if (lab.egfr && lab.egfr < 30) {
        score += 7;
        reasonKeys.push({ key: "egfrLow", value: lab.egfr });
      }
      if (lab.potassium && (lab.potassium > 5.5 || lab.potassium < 3.0)) {
        score += 7;
        reasonKeys.push({ key: "potassiumAbnormal", value: lab.potassium });
      }
    } else if (input.organType === "liver") {
      if (lab.alt && lab.alt > 80) {
        score += 5;
        reasonKeys.push({ key: "altHigh", value: lab.alt });
      }
      if (lab.ast && lab.ast > 80) {
        score += 5;
        reasonKeys.push({ key: "astHigh", value: lab.ast });
      }
      if (lab.tacrolimus_level && (lab.tacrolimus_level < 4 || lab.tacrolimus_level > 20)) {
        score += 7;
        reasonKeys.push({ key: "tacrolimusAbnormal", value: lab.tacrolimus_level });
      }
      if (lab.total_bilirubin && lab.total_bilirubin > 2.0) {
        score += 5;
        reasonKeys.push({ key: "bilirubinHigh", value: lab.total_bilirubin });
      }
    }
  }

  score = Math.min(100, Math.max(0, score));

  const category: PriorityResult["category"] =
    score >= 80 ? "critical" :
    score >= 50 ? "review" :
    "stable";

  const reasons = buildReasons(reasonKeys, t);

  return { score, category, reasonKeys, reasons };
}

export function priorityCategoryLabel(cat: "critical" | "review" | "stable", t?: (key: string) => string) {
  if (t) {
    const key = `priority.cat_${cat}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  switch (cat) {
    case "critical": return "Zudlik bilan e'tibor";
    case "review": return "Ko'rib chiqish kerak";
    case "stable": return "Barqaror";
  }
}

export function priorityCategoryColor(cat: "critical" | "review" | "stable") {
  switch (cat) {
    case "critical": return "bg-destructive text-destructive-foreground";
    case "review": return "bg-warning text-warning-foreground";
    case "stable": return "bg-success text-success-foreground";
  }
}

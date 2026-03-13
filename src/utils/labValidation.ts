/**
 * Lab Data Validation Engine
 * Detects impossible values, OCR mistakes, and abnormal ranges.
 * Flags suspicious lab values for manual confirmation.
 */

export interface LabValidationResult {
  parameter: string;
  value: number;
  severity: "error" | "warning";
  message: string;
}

// Physiologically impossible ranges (absolute bounds)
const IMPOSSIBLE_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  creatinine: { min: 0.1, max: 30, unit: "mg/dL" },
  egfr: { min: 1, max: 200, unit: "mL/min/1.73m²" },
  alt: { min: 0, max: 10000, unit: "U/L" },
  ast: { min: 0, max: 10000, unit: "U/L" },
  total_bilirubin: { min: 0, max: 50, unit: "mg/dL" },
  direct_bilirubin: { min: 0, max: 30, unit: "mg/dL" },
  tacrolimus_level: { min: 0, max: 60, unit: "ng/mL" },
  cyclosporine: { min: 0, max: 2000, unit: "ng/mL" },
  potassium: { min: 1.5, max: 10, unit: "mmol/L" },
  sodium: { min: 100, max: 180, unit: "mmol/L" },
  calcium: { min: 3, max: 18, unit: "mg/dL" },
  magnesium: { min: 0.5, max: 6, unit: "mg/dL" },
  phosphorus: { min: 0.5, max: 15, unit: "mg/dL" },
  hb: { min: 2, max: 25, unit: "g/dL" },
  platelets: { min: 1, max: 1500, unit: "x10³/µL" },
  tlc: { min: 0.1, max: 100, unit: "x10³/µL" },
  albumin: { min: 0.5, max: 7, unit: "g/dL" },
  total_protein: { min: 1, max: 15, unit: "g/dL" },
  urea: { min: 1, max: 300, unit: "mg/dL" },
  uric_acid: { min: 0.5, max: 25, unit: "mg/dL" },
  proteinuria: { min: 0, max: 30, unit: "g/day" },
  crp: { min: 0, max: 500, unit: "mg/L" },
  esr: { min: 0, max: 200, unit: "mm/hr" },
  inr: { min: 0.3, max: 15, unit: "" },
  pti: { min: 5, max: 150, unit: "%" },
  alp: { min: 0, max: 3000, unit: "U/L" },
  ggt: { min: 0, max: 5000, unit: "U/L" },
  ammonia: { min: 0, max: 500, unit: "µmol/L" },
  ldh: { min: 0, max: 5000, unit: "U/L" },
};

// Highly suspicious ranges (likely OCR errors or wrong units)
const SUSPICIOUS_RANGES: Record<string, { min: number; max: number }> = {
  creatinine: { min: 0.2, max: 15 },
  tacrolimus_level: { min: 1, max: 40 },
  potassium: { min: 2.5, max: 7.5 },
  sodium: { min: 120, max: 160 },
  hb: { min: 4, max: 20 },
  alt: { min: 3, max: 2000 },
  ast: { min: 3, max: 2000 },
  total_bilirubin: { min: 0.1, max: 30 },
};

/**
 * Validate a full set of lab values.
 * Returns list of flagged values with severity and reason.
 */
export function validateLabValues(labData: Record<string, any>): LabValidationResult[] {
  const results: LabValidationResult[] = [];

  for (const [param, range] of Object.entries(IMPOSSIBLE_RANGES)) {
    const value = labData[param];
    if (value == null || typeof value !== "number") continue;

    if (value < range.min || value > range.max) {
      results.push({
        parameter: param,
        value,
        severity: "error",
        message: `${param} = ${value} ${range.unit} — fiziologik jihatdan imkonsiz (${range.min}–${range.max})`,
      });
      continue;
    }

    // Check suspicious range
    const suspicious = SUSPICIOUS_RANGES[param];
    if (suspicious && (value < suspicious.min || value > suspicious.max)) {
      results.push({
        parameter: param,
        value,
        severity: "warning",
        message: `${param} = ${value} — g'ayrioddiy qiymat, tekshirishni tavsiya etamiz`,
      });
    }
  }

  // Cross-field validations
  if (labData.direct_bilirubin != null && labData.total_bilirubin != null) {
    if (labData.direct_bilirubin > labData.total_bilirubin) {
      results.push({
        parameter: "direct_bilirubin",
        value: labData.direct_bilirubin,
        severity: "error",
        message: `To'g'ridan-to'g'ri bilirubin (${labData.direct_bilirubin}) umumiy bilirubindan (${labData.total_bilirubin}) katta bo'lishi mumkin emas`,
      });
    }
  }

  return results;
}

/**
 * Check if any validation errors exist (not just warnings).
 */
export function hasValidationErrors(results: LabValidationResult[]): boolean {
  return results.some((r) => r.severity === "error");
}

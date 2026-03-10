/**
 * Unit Conversion Engine for Central Asia Laboratory Standards
 * Automatically normalizes lab values to standard clinical units used in calculations.
 */

export interface ConversionRule {
  parameter: string;
  fromUnit: string;
  toUnit: string;
  factor: number;
}

// Conversion factors: multiply source value by factor to get target value
const CONVERSION_RULES: ConversionRule[] = [
  // Bilirubin: µmol/L → mg/dL (÷ 17.1)
  { parameter: "total_bilirubin", fromUnit: "µmol/L", toUnit: "mg/dL", factor: 1 / 17.1 },
  { parameter: "direct_bilirubin", fromUnit: "µmol/L", toUnit: "mg/dL", factor: 1 / 17.1 },
  // Creatinine: µmol/L → mg/dL (÷ 88.4)
  { parameter: "creatinine", fromUnit: "µmol/L", toUnit: "mg/dL", factor: 1 / 88.4 },
  // Urea: mmol/L → mg/dL (× 6)
  { parameter: "urea", fromUnit: "mmol/L", toUnit: "mg/dL", factor: 6 },
  // Hemoglobin: g/L → g/dL (÷ 10)
  { parameter: "hb", fromUnit: "g/L", toUnit: "g/dL", factor: 0.1 },
  // WBC: cells/µL → x10³/µL (÷ 1000)
  { parameter: "tlc", fromUnit: "cells/µL", toUnit: "x10³/µL", factor: 0.001 },
  // Platelets: cells/µL → x10³/µL (÷ 1000)
  { parameter: "platelets", fromUnit: "cells/µL", toUnit: "x10³/µL", factor: 0.001 },
];

/** Standard units for each parameter */
export const STANDARD_UNITS: Record<string, string> = {
  total_bilirubin: "mg/dL",
  direct_bilirubin: "mg/dL",
  creatinine: "mg/dL",
  urea: "mg/dL",
  hb: "g/dL",
  tlc: "x10³/µL",
  platelets: "x10³/µL",
  alt: "U/L",
  ast: "U/L",
  alp: "U/L",
  ggt: "U/L",
  ldh: "U/L",
  tacrolimus_level: "ng/mL",
  cyclosporine: "ng/mL",
  egfr: "mL/min/1.73m²",
  potassium: "mmol/L",
  sodium: "mmol/L",
  calcium: "mg/dL",
  magnesium: "mg/dL",
  phosphorus: "mg/dL",
  uric_acid: "mg/dL",
  albumin: "g/dL",
  total_protein: "g/dL",
  proteinuria: "g/day",
  crp: "mg/L",
  esr: "mm/hr",
  ammonia: "µmol/L",
  inr: "",
  pti: "%",
};

/**
 * Detect if a value is likely in non-standard units and needs conversion.
 * Uses heuristic ranges to detect Central Asian lab units.
 */
export function detectAndConvert(parameter: string, value: number): { value: number; converted: boolean; fromUnit?: string; toUnit?: string } {
  if (value == null || isNaN(value)) return { value, converted: false };

  switch (parameter) {
    case "total_bilirubin":
    case "direct_bilirubin":
      // Normal bilirubin in mg/dL is 0.1-1.2 (total), in µmol/L is 2-21
      // If value > 30, likely µmol/L
      if (value > 30) {
        return { value: round(value / 17.1), converted: true, fromUnit: "µmol/L", toUnit: "mg/dL" };
      }
      break;

    case "creatinine":
      // Normal creatinine in mg/dL is 0.6-1.2, in µmol/L is 53-106
      // If value > 30, likely µmol/L
      if (value > 30) {
        return { value: round(value / 88.4), converted: true, fromUnit: "µmol/L", toUnit: "mg/dL" };
      }
      break;

    case "urea":
      // Normal urea in mg/dL is 7-20, in mmol/L is 2.5-7.1
      // If value < 15 and small decimal, could be mmol/L — but ambiguous
      // We'll only convert if explicitly flagged (manual conversion)
      break;

    case "hb":
      // Normal Hb in g/dL is 12-17, in g/L is 120-170
      // If value > 25, likely g/L
      if (value > 25) {
        return { value: round(value / 10), converted: true, fromUnit: "g/L", toUnit: "g/dL" };
      }
      break;

    case "platelets":
      // Normal in x10³/µL is 150-400, in cells/µL is 150000-400000
      if (value > 1000) {
        return { value: round(value / 1000), converted: true, fromUnit: "cells/µL", toUnit: "x10³/µL" };
      }
      break;

    case "tlc":
      // Normal WBC in x10³/µL is 4-11, in cells/µL is 4000-11000
      if (value > 100) {
        return { value: round(value / 1000), converted: true, fromUnit: "cells/µL", toUnit: "x10³/µL" };
      }
      break;
  }

  return { value, converted: false };
}

/**
 * Convert a value from one unit to another using a specific conversion rule.
 */
export function convertUnit(parameter: string, value: number, fromUnit: string, toUnit: string): number | null {
  const rule = CONVERSION_RULES.find(
    (r) => r.parameter === parameter && r.fromUnit === fromUnit && r.toUnit === toUnit
  );
  if (rule) return round(value * rule.factor);

  // Try reverse
  const reverse = CONVERSION_RULES.find(
    (r) => r.parameter === parameter && r.fromUnit === toUnit && r.toUnit === fromUnit
  );
  if (reverse) return round(value / reverse.factor);

  return null;
}

/**
 * Normalize all lab values in a record to standard units.
 * Returns the normalized record and a list of conversions applied.
 */
export function normalizeLabValues(
  labData: Record<string, any>
): { normalized: Record<string, any>; conversions: Array<{ parameter: string; original: number; converted: number; fromUnit: string; toUnit: string }> } {
  const normalized = { ...labData };
  const conversions: Array<{ parameter: string; original: number; converted: number; fromUnit: string; toUnit: string }> = [];

  const CONVERTIBLE = ["total_bilirubin", "direct_bilirubin", "creatinine", "hb", "platelets", "tlc"];

  for (const param of CONVERTIBLE) {
    const val = normalized[param];
    if (val == null || typeof val !== "number") continue;

    const result = detectAndConvert(param, val);
    if (result.converted) {
      normalized[param] = result.value;
      conversions.push({
        parameter: param,
        original: val,
        converted: result.value,
        fromUnit: result.fromUnit!,
        toUnit: result.toUnit!,
      });
    }
  }

  return { normalized, conversions };
}

function round(value: number, decimals = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Unit-driven conversion engine for OCR pipeline.
 *
 * Sprint A contract:
 *   - NEVER infer units from value magnitude.
 *   - Convert only when a printed unit was actually extracted from the report.
 *   - When no unit is detected → unit_source = "unknown" → doctor confirmation required.
 *   - Every conversion is logged via OCRLogger and persisted in provenance.
 */

import type { CanonicalLabKey } from "./labAliases";
import { logOCR } from "./OCRLogger";

export type UnitSource = "detected" | "assumed" | "unknown";

/** Canonical unit the app expects to store / display (post-conversion). */
export const CANONICAL_UNITS: Partial<Record<CanonicalLabKey, string>> = {
  hb: "g/dL",
  tlc: "x10^3/uL",
  platelets: "x10^3/uL",
  total_bilirubin: "mg/dL",
  direct_bilirubin: "mg/dL",
  ast: "U/L",
  alt: "U/L",
  alp: "U/L",
  ggt: "U/L",
  ldh: "U/L",
  total_protein: "g/dL",
  albumin: "g/dL",
  urea: "mg/dL",
  creatinine: "mg/dL",
  egfr: "mL/min/1.73m2",
  sodium: "mmol/L",
  potassium: "mmol/L",
  calcium: "mmol/L",
  magnesium: "mmol/L",
  phosphorus: "mmol/L",
  uric_acid: "mg/dL",
  crp: "mg/L",
  esr: "mm/hr",
  ammonia: "umol/L",
  glucose: "mmol/L",
  tacrolimus_level: "ng/mL",
  cyclosporine: "ng/mL",
  proteinuria: "g/day",
  pti: "%",
  inr: "",
};

/**
 * Normalize a unit token: strip whitespace, lowercase, fold common UTF symbols
 * (µ → u, ² → 2, divisions). The result is used only for matching.
 */
export function normalizeUnitToken(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/μ|µ/g, "u")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/\s+/g, "")
    .replace(/×/g, "x")
    .replace(/[·•]/g, "");
}

/** Regex of plausible printed unit strings that may follow a lab value. */
const UNIT_REGEX =
  /\b([µμu]?(?:mol|g|mol|eq|iu|u)\/(?:l|dl|ml)|(?:mg|g|ng|pg|mcg|µg)\/(?:dl|l|ml)|mmol\/l|µmol\/l|umol\/l|meq\/l|mEq\/l|ml\/min(?:\/1\.73m[²2])?|x?10[\^]?[36]?\/[uµ]?l|cells\/[uµ]l|%|mm\/hr|copies\/ml|u\/l|iu\/l|g\/l|g\/dl|ng\/ml|pg\/ml)\b/i;

/**
 * Try to extract a printed unit from the line tail (text appearing AFTER the
 * alias). Returns null if nothing recognizable is found.
 */
export function extractPrintedUnit(lineTail: string): string | null {
  if (!lineTail) return null;
  const m = lineTail.match(UNIT_REGEX);
  return m ? m[1] : null;
}

/**
 * Unit-driven conversion table.
 * Only applied when the printed unit matches one of the entries.
 * `factor` converts the printed-unit value to canonical units.
 */
interface ConvRule {
  matches: RegExp; // normalized printed unit pattern
  factor: number;
  toUnit: string;
}

const CONVERSIONS: Partial<Record<CanonicalLabKey, ConvRule[]>> = {
  total_bilirubin: [
    { matches: /^umol\/l$/, factor: 1 / 17.1, toUnit: "mg/dL" },
  ],
  direct_bilirubin: [
    { matches: /^umol\/l$/, factor: 1 / 17.1, toUnit: "mg/dL" },
  ],
  creatinine: [
    { matches: /^umol\/l$/, factor: 1 / 88.4, toUnit: "mg/dL" },
  ],
  urea: [
    { matches: /^mmol\/l$/, factor: 6, toUnit: "mg/dL" },
  ],
  hb: [
    { matches: /^g\/l$/, factor: 0.1, toUnit: "g/dL" },
  ],
  platelets: [
    { matches: /^cells?\/u?l$/, factor: 0.001, toUnit: "x10^3/uL" },
  ],
  tlc: [
    { matches: /^cells?\/u?l$/, factor: 0.001, toUnit: "x10^3/uL" },
  ],
};

export interface ConvertResult {
  /** Value to store (canonical units if conversion applied; otherwise raw). */
  value: number;
  /** Conversion record for provenance / log; null when no conversion applied. */
  conversion: { from: string; to: string; factor: number } | null;
  /** Whether unit was detected, assumed, or unknown. */
  unitSource: UnitSource;
  /** The unit string we ended up associating with the value. */
  unit: string;
}

/**
 * Convert a raw OCR value using ONLY the printed unit.
 * Never guesses from magnitude. When no unit is present, returns the value
 * unchanged with `unitSource = "unknown"` — caller must enforce verification.
 */
export function convertByPrintedUnit(
  field: CanonicalLabKey,
  rawValue: number,
  printedUnit: string | null,
  ctx: { fieldLabel?: string; patientId?: string } = {},
): ConvertResult {
  const canonical = CANONICAL_UNITS[field] ?? "";

  if (!printedUnit) {
    return {
      value: rawValue,
      conversion: null,
      unitSource: "unknown",
      unit: canonical,
    };
  }

  const norm = normalizeUnitToken(printedUnit);
  const rules = CONVERSIONS[field] ?? [];

  for (const rule of rules) {
    if (rule.matches.test(norm)) {
      const converted = Math.round(rawValue * rule.factor * 10000) / 10000;
      logOCR("done", {
        label: "unit_conversion",
        field,
        from: printedUnit,
        to: rule.toUnit,
        factor: rule.factor,
        raw: rawValue,
        normalized: converted,
        patient: ctx.patientId,
      });
      return {
        value: converted,
        conversion: { from: printedUnit, to: rule.toUnit, factor: rule.factor },
        unitSource: "detected",
        unit: rule.toUnit,
      };
    }
  }

  // Printed unit was detected but already matches canonical (or no rule needed).
  return {
    value: rawValue,
    conversion: null,
    unitSource: "detected",
    unit: printedUnit,
  };
}

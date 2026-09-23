/**
 * Explicit, source-unit-driven lab normalization.
 *
 * Contract (clinical safety):
 *   - Conversion is driven ONLY by the explicitly known source unit
 *     (country reference profile or user-selected unit). Never by magnitude.
 *   - Normalization runs BEFORE physiologic hard validation, so that
 *     Uzbek µmol/L creatinine 90 is validated as 1.02 mg/dL, not rejected.
 *   - When the source unit is unknown, the value is passed through unchanged
 *     and flagged `ambiguous` so the caller can request user confirmation.
 *   - The raw source value and unit are always returned for provenance.
 */

import { STANDARD_UNITS } from "@/utils/unitConversion";

export interface NormalizedField {
  fieldKey: string;
  /** Value as typed / extracted, in the source unit. */
  rawValue: number;
  /** Value in the canonical stored unit. */
  value: number;
  sourceUnit: string | null;
  canonicalUnit: string;
  converted: boolean;
  factor: number | null;
  /** True when no source unit is known → do not assume, ask the user. */
  ambiguous: boolean;
}

/** factor multiplies a source-unit value to produce the canonical value. */
const FACTORS: Array<{ fields: string[]; from: string; to: string; factor: number }> = [
  { fields: ["creatinine"], from: "µmol/L", to: "mg/dL", factor: 1 / 88.4 },
  { fields: ["total_bilirubin", "direct_bilirubin"], from: "µmol/L", to: "mg/dL", factor: 1 / 17.1 },
  { fields: ["urea"], from: "mmol/L", to: "mg/dL", factor: 6 },
  { fields: ["hb"], from: "g/L", to: "g/dL", factor: 0.1 },
  { fields: ["tlc", "platelets"], from: "cells/µL", to: "x10³/µL", factor: 0.001 },
];

function normalizeUnit(u: string | null | undefined): string {
  if (!u) return "";
  return u.trim().toLowerCase().replace(/μ|µ/g, "u").replace(/³/g, "3").replace(/\s+/g, "");
}

function round(v: number, decimals = 2): number {
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
}

/**
 * Normalize one field from its explicit source unit to the canonical unit.
 * `sourceUnit` null/empty ⇒ ambiguous pass-through (no guessing).
 */
export function normalizeField(
  fieldKey: string,
  rawValue: number,
  sourceUnit: string | null,
): NormalizedField {
  const canonicalUnit = STANDARD_UNITS[fieldKey] ?? "";
  const base: NormalizedField = {
    fieldKey,
    rawValue,
    value: rawValue,
    sourceUnit: sourceUnit || null,
    canonicalUnit,
    converted: false,
    factor: null,
    ambiguous: false,
  };

  if (!Number.isFinite(rawValue)) return base;

  const src = normalizeUnit(sourceUnit);
  if (!src) {
    // No printed/profile unit at all → ambiguous unless the field is unitless.
    return { ...base, ambiguous: canonicalUnit !== "" };
  }
  if (src === normalizeUnit(canonicalUnit)) return base;

  const rule = FACTORS.find(
    (r) =>
      r.fields.includes(fieldKey) &&
      normalizeUnit(r.from) === src &&
      normalizeUnit(r.to) === normalizeUnit(canonicalUnit),
  );
  if (!rule) {
    // Known-but-unmapped unit: never silently scale. Flag for confirmation.
    return { ...base, ambiguous: true };
  }

  return {
    ...base,
    value: round(rawValue * rule.factor),
    converted: true,
    factor: rule.factor,
  };
}

/**
 * Normalize a whole form/extraction payload.
 * `unitFor` resolves the explicit source unit for each field key.
 */
export function normalizeFields(
  values: Record<string, string | number | null | undefined>,
  unitFor: (fieldKey: string) => string | null,
): { fields: Record<string, NormalizedField>; ambiguous: string[] } {
  const fields: Record<string, NormalizedField> = {};
  const ambiguous: string[] = [];

  for (const [key, rawInput] of Object.entries(values)) {
    if (rawInput === null || rawInput === undefined || rawInput === "") continue;
    const raw = typeof rawInput === "number" ? rawInput : parseFloat(rawInput);
    if (!Number.isFinite(raw)) continue;
    const nf = normalizeField(key, raw, unitFor(key));
    fields[key] = nf;
    if (nf.ambiguous) ambiguous.push(key);
  }

  return { fields, ambiguous };
}

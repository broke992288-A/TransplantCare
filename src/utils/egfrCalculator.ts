/**
 * CKD-EPI (2021) eGFR Calculator
 * Based on: Inker LA, et al. New Creatinine- and Cystatin C-Based Equations to Estimate GFR
 * Reference: KDIGO 2024, N Engl J Med 2021; 385:1737-1749
 *
 * Formula (2021 CKD-EPI, race-free):
 *   Female: 142 × min(Scr/0.7, 1)^(-0.241) × max(Scr/0.7, 1)^(-1.200) × 0.9938^Age × 1.012
 *   Male:   142 × min(Scr/0.9, 1)^(-0.302) × max(Scr/0.9, 1)^(-1.200) × 0.9938^Age
 */

export interface EgfrInput {
  creatinine: number;    // mg/dL
  age: number;           // years
  sex: "male" | "female";
}

/**
 * Calculate eGFR using the 2021 CKD-EPI equation (race-free).
 * Returns eGFR in mL/min/1.73m²
 */
export function calculateEgfr({ creatinine, age, sex }: EgfrInput): number {
  if (creatinine <= 0 || age <= 0) return 0;

  const isFemale = sex === "female";
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const sexCoeff = isFemale ? 1.012 : 1.0;

  const scrOverKappa = creatinine / kappa;
  const minTerm = Math.pow(Math.min(scrOverKappa, 1), alpha);
  const maxTerm = Math.pow(Math.max(scrOverKappa, 1), -1.200);
  const ageTerm = Math.pow(0.9938, age);

  const egfr = 142 * minTerm * maxTerm * ageTerm * sexCoeff;

  return Math.round(egfr);
}

/**
 * Get the age in years from a date of birth string.
 */
export function getAgeFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

/**
 * Determine if eGFR should be auto-calculated and return the value.
 * Returns null if insufficient data.
 */
export function autoCalculateEgfr(
  creatinine: number | null | undefined,
  dateOfBirth: string | null | undefined,
  gender: string | null | undefined
): number | null {
  if (!creatinine || creatinine <= 0) return null;
  const age = getAgeFromDob(dateOfBirth);
  if (!age) return null;
  const sex = gender === "female" ? "female" : "male";
  return calculateEgfr({ creatinine, age, sex });
}

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Regression test for LabUploadDialog.
 *
 * Lab values must be saved AS-IS in the patient's country-specific units
 * (e.g. Uzbekistan creatinine 82 µmol/L stays 82 — NOT converted to 0.93 mg/dL).
 * Country-specific reference profiles define the matching normal ranges, and the
 * risk engine compares against those profiles. Calling convertToStandard()
 * inside handleConfirm corrupts the stored values and breaks risk scoring.
 *
 * This test guards against accidental reintroduction of unit conversion at save time.
 */
describe("LabUploadDialog — raw country-unit save (regression)", () => {
  const filePath = resolve(__dirname, "../components/features/LabUploadDialog.tsx");
  const source = readFileSync(filePath, "utf8");

  // Isolate the handleConfirm function body
  const handleConfirmMatch = source.match(/const handleConfirm\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n  \};/);
  const handleConfirmBody = handleConfirmMatch?.[1] ?? "";

  it("locates the handleConfirm function", () => {
    expect(handleConfirmBody.length).toBeGreaterThan(0);
  });

  it("does NOT call convertToStandard() inside handleConfirm", () => {
    expect(handleConfirmBody).not.toMatch(/convertToStandard\s*\(/);
  });

  it("does NOT call normalizeLabValues() inside handleConfirm", () => {
    expect(handleConfirmBody).not.toMatch(/normalizeLabValues\s*\(/);
  });

  it("does NOT call detectAndConvert() inside handleConfirm", () => {
    expect(handleConfirmBody).not.toMatch(/detectAndConvert\s*\(/);
  });

  it("assigns the raw parsed value directly to labData[field.key]", () => {
    // Must contain the raw assignment — no transformation between parseFloat and assignment.
    expect(handleConfirmBody).toMatch(/labData\[field\.key\]\s*=\s*v\s*;/);
  });

  it("does not import STANDARD_UNITS from unitConversion", () => {
    // STANDARD_UNITS was previously used to drive convertToStandard at save time.
    expect(source).not.toMatch(/import\s*\{[^}]*\bSTANDARD_UNITS\b[^}]*\}\s*from\s*["']@\/utils\/unitConversion["']/);
  });
});

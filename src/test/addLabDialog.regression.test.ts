import { describe, it, expect } from "vitest";
import source from "@/components/features/AddLabDialog.tsx?raw";
import labFieldSource from "@/components/features/LabField.tsx?raw";

/**
 * Regression tests for the two AddLabDialog P0 bugs:
 *
 * 1. Cursor/focus loss: `LabField` used to be declared INSIDE the
 *    AddLabDialog render scope, so React created a new component type on every
 *    keystroke, remounting the <input> and killing the caret (typing "1.4" was
 *    impossible). It must live in its own module.
 *
 * 2. Unit normalization order: validation used to run on raw source-unit values
 *    (µmol/L), rejecting legitimate Uzbek values. Normalization must run first.
 */
describe("AddLabDialog — stable input identity (regression)", () => {
  it("does not declare LabField inside the component", () => {
    expect(source).not.toMatch(/const\s+LabField\s*=\s*\(/);
  });

  it("imports LabField from its own module", () => {
    expect(source).toMatch(/import\s+LabField\s+from\s+["']@\/components\/features\/LabField["']/);
  });

  it("LabField is a memoized top-level component", () => {
    expect(labFieldSource).toMatch(/memo\(function LabField/);
    expect(labFieldSource).toMatch(/export default LabField/);
  });

  it("LabField is a controlled input driven by onValueChange", () => {
    expect(labFieldSource).toMatch(/onChange=\{\(e\) => onValueChange\(fieldKey, e\.target\.value\)\}/);
    expect(labFieldSource).toMatch(/inputMode="decimal"/);
  });
});

describe("AddLabDialog — normalize before validate (regression)", () => {
  const handleSubmit = source.match(/const handleSubmit\s*=\s*async\s*\(e[\s\S]*?\n  \};/)?.[0] ?? "";

  it("locates handleSubmit", () => {
    expect(handleSubmit.length).toBeGreaterThan(0);
  });

  it("calls normalizeForm() before validateCanonical()", () => {
    const normIdx = handleSubmit.indexOf("normalizeForm(");
    const valIdx = handleSubmit.indexOf("validateCanonical(");
    expect(normIdx).toBeGreaterThan(-1);
    expect(valIdx).toBeGreaterThan(-1);
    expect(normIdx).toBeLessThan(valIdx);
  });

  it("no longer validates raw form values up front", () => {
    expect(handleSubmit).not.toMatch(/if\s*\(!validate\(\)\)\s*return;/);
  });

  it("does not use magnitude-based heuristic conversion", () => {
    expect(source).not.toMatch(/normalizeLabValues/);
    expect(source).not.toMatch(/detectAndConvert/);
  });

  it("blocks saving when the source unit is ambiguous", () => {
    expect(handleSubmit).toMatch(/ambiguous\.length > 0/);
  });
});

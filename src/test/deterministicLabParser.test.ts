import { describe, it, expect } from "vitest";
import { parseLabText } from "@/services/ocr/deterministicLabParser";
import { matchCanonicalKey } from "@/services/ocr/labAliases";

describe("matchCanonicalKey", () => {
  it("matches English aliases", () => {
    expect(matchCanonicalKey("Creatinine 1.2 mg/dL")).toBe("creatinine");
    expect(matchCanonicalKey("Hemoglobin: 13.5")).toBe("hb");
    expect(matchCanonicalKey("ALT (SGPT)  35 U/L")).toBe("alt");
  });

  it("matches Russian aliases", () => {
    expect(matchCanonicalKey("Креатинин: 92 мкмоль/л")).toBe("creatinine");
    expect(matchCanonicalKey("Гемоглобин 135 г/л")).toBe("hb");
    expect(matchCanonicalKey("АЛТ 40")).toBe("alt");
    expect(matchCanonicalKey("Общий билирубин 14")).toBe("total_bilirubin");
  });

  it("matches Uzbek aliases", () => {
    expect(matchCanonicalKey("Умумий билирубин 14 мкмоль/л")).toBe("total_bilirubin");
  });

  it("prefers longer alias (total bilirubin over bilirubin)", () => {
    expect(matchCanonicalKey("Total Bilirubin 1.4")).toBe("total_bilirubin");
    expect(matchCanonicalKey("Direct Bilirubin 0.3")).toBe("direct_bilirubin");
  });

  it("returns null for unrelated lines", () => {
    expect(matchCanonicalKey("Patient name: John Doe")).toBeNull();
    expect(matchCanonicalKey("Page 1 of 3")).toBeNull();
  });
});

describe("parseLabText", () => {
  it("extracts a basic English report", () => {
    const text = `
      Lab report 12.05.2025
      Creatinine    1.2 mg/dL
      ALT 35 U/L
      AST 28 U/L
      Hemoglobin 13.5 g/dL
    `;
    const r = parseLabText(text);
    expect(r.sufficient).toBe(true);
    expect(r.dateGroups).toHaveLength(1);
    expect(r.dateGroups[0].date).toBe("2025-05-12");
    expect(r.dateGroups[0].data.creatinine).toBe(1.2);
    expect(r.dateGroups[0].data.alt).toBe(35);
    expect(r.dateGroups[0].data.hb).toBe(13.5);
  });

  it("extracts a Russian report with comma decimals", () => {
    const text = `
      Дата: 03.06.2025
      Креатинин 92 мкмоль/л
      АЛТ 40 ед/л
      Гемоглобин 135 г/л
      Общий белок 72,5 г/л
    `;
    const r = parseLabText(text);
    expect(r.sufficient).toBe(true);
    expect(r.dateGroups[0].date).toBe("2025-06-03");
    expect(r.dateGroups[0].data.creatinine).toBe(92);
    expect(r.dateGroups[0].data.total_protein).toBe(72.5);
  });

  it("ignores 4-digit year-like integers", () => {
    const text = `
      Report year 2024
      Creatinine 1.1
      Year 2024 reference
    `;
    const r = parseLabText(text);
    // creatinine must be 1.1, not 2024
    expect(r.dateGroups[0].data.creatinine).toBe(1.1);
  });

  it("returns 'unknown' date when none found", () => {
    const text = `Creatinine 1.2\nALT 30\nAST 25`;
    const r = parseLabText(text);
    expect(r.dateGroups[0].date).toBe("unknown");
    expect(r.sufficient).toBe(true);
  });

  it("flags insufficient when too few markers", () => {
    const r = parseLabText("Creatinine 1.2");
    expect(r.sufficient).toBe(false);
    expect(r.markerCount).toBe(1);
  });

  it("does not overwrite first occurrence", () => {
    const text = `Creatinine 1.0\nALT 30\nAST 25\nCreatinine 9.9`;
    const r = parseLabText(text);
    expect(r.dateGroups[0].data.creatinine).toBe(1.0);
  });

  it("groups by date when multiple dates present", () => {
    const text = `
      Date 01.01.2025
      Creatinine 1.0
      ALT 30
      AST 25
      Date 15.01.2025
      Creatinine 1.5
      ALT 40
      AST 35
    `;
    const r = parseLabText(text);
    expect(r.dateGroups).toHaveLength(2);
    const g1 = r.dateGroups.find((g) => g.date === "2025-01-01")!;
    const g2 = r.dateGroups.find((g) => g.date === "2025-01-15")!;
    expect(g1.data.creatinine).toBe(1.0);
    expect(g2.data.creatinine).toBe(1.5);
  });

  it("assigns deterministic confidence of 95", () => {
    const r = parseLabText("Creatinine 1.2\nALT 30\nAST 25");
    expect(r.dateGroups[0].confidence.creatinine).toBe(95);
  });
});

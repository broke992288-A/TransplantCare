import { describe, it, expect } from "vitest";
import { detectLang, decodeSourceLang, encodeSourceLang } from "@/utils/langPrefix";

describe("detectLang", () => {
  it("returns undefined for empty/whitespace input", () => {
    expect(detectLang("")).toBeUndefined();
    expect(detectLang("   ")).toBeUndefined();
  });

  it("detects Uzbek by Uzbek-specific Cyrillic letters (ўғқҳ)", () => {
    expect(detectLang("Бемор яхши ҳолатда")).toBe("uz");
    expect(detectLang("Ўзгариш йўқ")).toBe("uz");
    expect(detectLang("Қон тахлили")).toBe("uz");
    expect(detectLang("Жигар фаолияти")).toBe("uz"); // contains қ-class? no — fallback test below
  });

  it("detects Russian for general Cyrillic without Uzbek markers", () => {
    expect(detectLang("Пациент в стабильном состоянии")).toBe("ru");
    expect(detectLang("Анализ крови в норме")).toBe("ru");
  });

  it("detects Uzbek Latin via common medical/everyday words", () => {
    expect(detectLang("Bemor yaxshi")).toBe("uz");
    expect(detectLang("Shifokor qabul qildi")).toBe("uz");
    expect(detectLang("Tahlil natijasi yaxshi")).toBe("uz");
    expect(detectLang("Rahmat doktor")).toBe("uz");
  });

  it("falls back to English for plain Latin text", () => {
    expect(detectLang("Patient is stable, continue current therapy")).toBe("en");
    expect(detectLang("Repeat labs in 48 hours")).toBe("en");
  });

  it("returns undefined when no detectable script is present", () => {
    expect(detectLang("12345 !!! ???")).toBeUndefined();
  });
});

describe("decodeSourceLang", () => {
  it("returns empty for null/undefined", () => {
    expect(decodeSourceLang(null)).toEqual({ lang: undefined, text: "" });
    expect(decodeSourceLang(undefined)).toEqual({ lang: undefined, text: "" });
  });

  it("parses explicit [en]/[ru]/[uz] prefixes and strips them", () => {
    expect(decodeSourceLang("[en]Stable graft function")).toEqual({
      lang: "en",
      text: "Stable graft function",
    });
    expect(decodeSourceLang("[ru]Пациент стабилен")).toEqual({
      lang: "ru",
      text: "Пациент стабилен",
    });
    expect(decodeSourceLang("[uz]Bemor yaxshi")).toEqual({
      lang: "uz",
      text: "Bemor yaxshi",
    });
  });

  it("supports multi-line content after prefix", () => {
    const raw = "[en]Line 1\nLine 2\nLine 3";
    expect(decodeSourceLang(raw)).toEqual({
      lang: "en",
      text: "Line 1\nLine 2\nLine 3",
    });
  });

  it("auto-detects language when prefix is missing (legacy notes)", () => {
    expect(decodeSourceLang("Пациент стабилен").lang).toBe("ru");
    expect(decodeSourceLang("Bemor yaxshi holatda").lang).toBe("uz");
    expect(decodeSourceLang("Continue current immunosuppression").lang).toBe("en");
    expect(decodeSourceLang("Бемор ҳолати яхши").lang).toBe("uz");
  });

  it("preserves original text when no prefix", () => {
    expect(decodeSourceLang("Plain note").text).toBe("Plain note");
  });

  it("ignores unknown bracket prefixes", () => {
    expect(decodeSourceLang("[fr]Bonjour").text).toBe("[fr]Bonjour");
  });
});

describe("encodeSourceLang ↔ decodeSourceLang round-trip", () => {
  it.each([
    ["en", "Repeat labs in 48 hours"],
    ["ru", "Повторить анализы через 48 часов"],
    ["uz", "48 soatdan keyin tahlilni qaytaring"],
  ])("round-trips %s correctly", (lang, text) => {
    const encoded = encodeSourceLang(text, lang);
    const decoded = decodeSourceLang(encoded);
    expect(decoded.lang).toBe(lang);
    expect(decoded.text).toBe(text);
  });

  it("returns text as-is if input is empty", () => {
    expect(encodeSourceLang("", "en")).toBe("");
    expect(encodeSourceLang("   ", "en")).toBe("   ");
  });
});

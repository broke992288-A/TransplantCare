import { describe, it, expect } from "vitest";
import { translateUi } from "./uiText";

describe("translateUi", () => {
  it("translates English source to RU/UZ", () => {
    expect(translateUi("Patient Portal", "uz")).toBe("Bemor portali");
    expect(translateUi("Patient Portal", "ru")).toBe("Портал пациента");
  });
  it("translates Uzbek source to EN", () => {
    expect(translateUi("Bekor qilish", "en")).toBe("Cancel");
  });
  it("returns unknown text unchanged", () => {
    expect(translateUi("xyz-unknown", "ru")).toBe("xyz-unknown");
  });
});

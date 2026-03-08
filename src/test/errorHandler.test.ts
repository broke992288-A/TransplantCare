import { describe, it, expect } from "vitest";
import { getReadableError } from "@/utils/errorHandler";

describe("getReadableError", () => {
  it("maps JWT expired", () => {
    expect(getReadableError(new Error("JWT expired or invalid"))).toBe("error.sessionExpired");
  });

  it("maps invalid credentials", () => {
    expect(getReadableError(new Error("Invalid login credentials"))).toBe("error.invalidCredentials");
  });

  it("maps RLS violation", () => {
    expect(getReadableError(new Error("new row violates row-level security policy"))).toBe("error.noPermission");
  });

  it("maps network errors", () => {
    expect(getReadableError(new Error("Failed to fetch"))).toBe("error.noInternet");
  });

  it("maps duplicate key", () => {
    expect(getReadableError(new Error("duplicate key value violates unique constraint"))).toBe("error.duplicateKey");
  });

  it("returns original message for unknown errors", () => {
    expect(getReadableError(new Error("Something weird"))).toBe("Something weird");
  });

  it("truncates long messages", () => {
    const longMsg = "A".repeat(201);
    expect(getReadableError(new Error(longMsg))).toBe("error.unexpected");
  });

  it("handles null/undefined", () => {
    expect(getReadableError(null)).toBe("error.unknown");
    expect(getReadableError(undefined)).toBe("error.unknown");
  });

  it("uses translator function when provided", () => {
    const t = (key: string) => `translated:${key}`;
    expect(getReadableError(new Error("JWT expired"), t)).toBe("translated:error.sessionExpired");
  });
});

import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "@/lib/oauth-return-path";
describe("OAuth return paths", () => {
  it("preserves the full consent request", () => expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc#decision")).toBe("/.lovable/oauth/consent?authorization_id=abc#decision"));
  for (const value of ["//evil.example", "/\\evil.example", "https://evil.example", "/\n/evil.example", null]) {
    it(`rejects external or malformed path ${JSON.stringify(value)}`, () => expect(oauthReturnPath(value)).toBe("/"));
  }
});

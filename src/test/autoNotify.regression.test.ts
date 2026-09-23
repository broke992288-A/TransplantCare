import { describe, it, expect } from "vitest";
import source from "../../supabase/functions/auto-notify/index.ts?raw";

/**
 * Regression tests for the auto-notify 503 root cause and reliability rules.
 *
 * The 503 was caused by AUTO_NOTIFY_SECRET not being configured in the
 * function environment while pg_cron already sent a bearer token. The secret
 * must come from the environment (never hardcoded), the misconfiguration must
 * be diagnosable through a health check, and every push must be idempotent.
 */
describe("auto-notify — configuration and auth", () => {
  it("reads the shared secret from the environment", () => {
    expect(source).toMatch(/Deno\.env\.get\("AUTO_NOTIFY_SECRET"\)/);
  });

  it("does not hardcode any long hex secret literal", () => {
    expect(source).not.toMatch(/["'][0-9a-f]{32,}["']/);
  });

  it("exposes a config health check that reports booleans only", () => {
    expect(source).toMatch(/health.*===\s*"1"/);
    expect(source).toMatch(/auto_notify_secret_configured:\s*Boolean\(expectedSecret\)/);
    expect(source).not.toMatch(/secret:\s*expectedSecret/);
  });

  it("rejects unauthorized callers with 401", () => {
    expect(source).toMatch(/incoming !== expectedSecret/);
    expect(source).toMatch(/status:\s*401/);
  });

  it("validates the notification type", () => {
    expect(source).toMatch(/invalid_type/);
  });
});

describe("auto-notify — idempotency and cleanup", () => {
  it("claims a dedupe key before sending", () => {
    expect(source).toMatch(/dedupe_key:\s*dedupeKey/);
    expect(source).toMatch(/23505/);
  });

  it("dedupes daily reminders per user per day", () => {
    expect(source).toMatch(/lab_reminders:\$\{userId\}:\$\{day\}/);
    expect(source).toMatch(/med_reminders:\$\{userId\}:\$\{day\}/);
  });

  it("keeps 404/410 push endpoint cleanup", () => {
    expect(source).toMatch(/status === 404 \|\| status === 410/);
    expect(source).toMatch(/from\("push_subscriptions"\)\s*\.delete\(\)/);
  });

  it("retries at most once for transient failures", () => {
    const retries = source.match(/Bounded retry/g) ?? [];
    expect(retries.length).toBe(1);
  });
});

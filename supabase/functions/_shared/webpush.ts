import webpush from "npm:web-push@3.6.7";

/**
 * Shared Web Push sender. web-push builds the VAPID JWT per request with
 * `aud` = origin of each subscription endpoint (FCM, Mozilla, Apple, WNS),
 * and encrypts the payload (aes128gcm) as every browser requires.
 * V2 secrets hold the regenerated, verified key pair; legacy names are fallback.
 */
export const VAPID_PUBLIC_KEY =
  Deno.env.get("VAPID_PUBLIC_KEY_V2") ?? Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY =
  Deno.env.get("VAPID_PRIVATE_KEY_V2") ?? Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
// https: subject is valid per RFC 8292 and does not depend on a mailbox working.
export const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT_V2") ?? Deno.env.get("VAPID_SUBJECT") ?? "https://transplantcare.uz";

export const vapidConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (vapidConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export type BrowserFamily = "chrome" | "firefox" | "safari" | "edge" | "other";

export function browserFromEndpoint(endpoint: string): BrowserFamily {
  let host = "";
  try { host = new URL(endpoint).host; } catch { return "other"; }
  if (host.endsWith("fcm.googleapis.com") || host.endsWith("android.googleapis.com")) return "chrome";
  if (host.endsWith("push.services.mozilla.com")) return "firefox";
  if (host.endsWith("push.apple.com")) return "safari";
  if (host.endsWith("notify.windows.com")) return "edge";
  return "other";
}

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface SendResult {
  ok: boolean;
  status?: number;
  browser: BrowserFamily;
  host: string;
  message?: string;
  gone: boolean;
}

export async function sendWebPush(
  sub: StoredSubscription,
  payload: string,
  retryTransient = false,
): Promise<SendResult> {
  const browser = browserFromEndpoint(sub.endpoint);
  let host = "invalid";
  try { host = new URL(sub.endpoint).host; } catch { /* keep */ }
  const attempt = async (): Promise<SendResult> => {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 86400, urgency: "high" });
      return { ok: true, browser, host, gone: false };
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      const body = String((err as { body?: string }).body ?? "").slice(0, 300);
      return {
        ok: false, status, browser, host, gone: status === 404 || status === 410,
        message: `${err instanceof Error ? err.message : String(err)} | body=${body}`,
      };
    }
  };
  let res = await attempt();
  if (retryTransient && !res.ok && (!res.status || res.status >= 500 || res.status === 429)) {
    await new Promise((r) => setTimeout(r, 500));
    res = await attempt();
  }
  return res;
}

export type BrowserCounts = Record<BrowserFamily, { sent: number; failed: number }>;
export function emptyCounts(): BrowserCounts {
  return {
    chrome: { sent: 0, failed: 0 }, firefox: { sent: 0, failed: 0 },
    safari: { sent: 0, failed: 0 }, edge: { sent: 0, failed: 0 }, other: { sent: 0, failed: 0 },
  };
}

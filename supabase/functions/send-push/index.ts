import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { VAPID_PUBLIC_KEY as SHARED_PUB, VAPID_SUBJECT as SHARED_SUB, emptyCounts, sendWebPush } from "../_shared/webpush.ts";

const corsHeaders = (req: Request) => getCorsHeaders(req, "GET, POST, OPTIONS");

/**
 * Push notification dispatcher.
 *
 * - Authenticates the caller (any logged-in user can trigger; RLS-equivalent
 *   gating is enforced at the calling site / cron).
 * - Loads matching subscriptions from `push_subscriptions` via service role.
 * - Sends each notification through the standard Web Push protocol using
 *   `web-push` (handles VAPID JWT, payload encryption, TTL headers).
 * - Cleans up dead subscriptions (404/410).
 *
 * Required secrets:
 *   - VAPID_PUBLIC_KEY    (must match the public key embedded in the client)
 *   - VAPID_PRIVATE_KEY
 *   - VAPID_SUBJECT       (e.g. mailto:admin@transplantcare.uz)
 */

const VAPID_PUBLIC_KEY = SHARED_PUB;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY_V2") ?? Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = SHARED_SUB;

function base64UrlToBytes(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function validateVapidKeyPair() {
  try {
    const publicBytes = base64UrlToBytes(VAPID_PUBLIC_KEY);
    const privateBytes = base64UrlToBytes(VAPID_PRIVATE_KEY);
    if (publicBytes.length !== 65 || publicBytes[0] !== 4 || privateBytes.length !== 32) {
      return false;
    }

    const x = bytesToBase64Url(publicBytes.slice(1, 33));
    const y = bytesToBase64Url(publicBytes.slice(33, 65));
    const d = bytesToBase64Url(privateBytes);
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", x, y, d },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
    const publicKey = await crypto.subtle.importKey(
      "raw",
      publicBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const message = new TextEncoder().encode("vapid-key-check");
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      message,
    );
    return crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature,
      message,
    );
  } catch {
    return false;
  }
}

interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    expirationTime?: number | null;
  };
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        publicKey: VAPID_PUBLIC_KEY,
        keyPairValid: await validateVapidKeyPair(),
        // The VAPID "sub" claim is sent in every push JWT, so it is not secret.
        vapidSubject: VAPID_SUBJECT,
        vapidSubjectFromSecret: Boolean(Deno.env.get("VAPID_SUBJECT")),
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured on server" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { user_ids, title, body: messageBody, data: notifData, url } = await req.json();

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !title) {
      return new Response(
        JSON.stringify({ error: "user_ids (non-empty array) and title required" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Authorization: doctor/admin/support may target any user; patients only themselves.
    const { data: rolesData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const roles = (rolesData ?? []).map((r: { role: string }) => r.role);
    const isPrivileged = roles.some((r) => ["doctor", "admin", "support"].includes(r));
    if (!isPrivileged) {
      const onlySelf = user_ids.every((uid: string) => uid === userData.user.id);
      if (!onlySelf) {
        return new Response(
          JSON.stringify({ error: "Forbidden: insufficient role to send notifications to other users" }),
          { status: 403, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
    }

    const { data: subs, error: subError } = await serviceClient
      .from("push_subscriptions")
      .select("id, user_id, subscription")
      .in("user_id", user_ids);

    if (subError) {
      return new Response(
        JSON.stringify({ error: subError.message }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const payload = JSON.stringify({
      title,
      body: messageBody ?? "",
      data: { ...(notifData ?? {}), url: url ?? "/" },
      timestamp: new Date().toISOString(),
    });

    const rows = (subs ?? []) as PushSubscriptionRecord[];
    const total = rows.length;
    const wantsStream = req.headers.get("accept")?.includes("text/event-stream");

    // Helper that performs one delivery and returns its result.
    const byBrowser = emptyCounts();
    const deliverOne = async (row: PushSubscriptionRecord) => {
      const res = await sendWebPush(row.subscription, payload);
      if (res.ok) {
        byBrowser[res.browser].sent++;
        return { ok: true as const, id: row.id, host: res.host, browser: res.browser };
      }
      byBrowser[res.browser].failed++;
      if (res.gone) await serviceClient.from("push_subscriptions").delete().eq("id", row.id);
      const message = `${res.message ?? "unknown"} | host=${res.host}`;
      console.warn("[send-push] delivery failed", { id: row.id, status: res.status, message });
      return { ok: false as const, id: row.id, status: res.status, message, browser: res.browser };
    };


    // ---- Streaming (SSE) branch ----------------------------------------
    if (wantsStream) {
      const stream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder();
          const send = (event: string, data: unknown) => {
            controller.enqueue(
              enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
            );
          };

          send("start", { total });
          let sent = 0;
          let failed = 0;
          const errors: Array<{ id: string; status?: number; message: string }> = [];

          for (let i = 0; i < rows.length; i++) {
            const res = await deliverOne(rows[i]);
            if (res.ok) {
              sent++;
            } else {
              failed++;
              errors.push({ id: res.id, status: res.status, message: res.message });
            }
            send("progress", {
              index: i + 1,
              total,
              sent,
              failed,
              last: res,
            });
          }

          send("done", { total, sent, failed, errors, byBrowser });
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // ---- Standard JSON branch (backward compatible) --------------------
    let sent = 0;
    let failed = 0;
    const errors: Array<{ id: string; status?: number; message: string }> = [];

    for (const row of rows) {
      const res = await deliverOne(row);
      if (res.ok) sent++;
      else {
        failed++;
        errors.push({ id: res.id, status: res.status, message: res.message });
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total, errors, byBrowser }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-push] fatal", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }
});

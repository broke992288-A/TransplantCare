import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = (req: Request) => getCorsHeaders(req, "POST, OPTIONS");

// Web Push crypto helpers
async function generateJWT(
  aud: string,
  sub: string,
  privateKeyBase64url: string,
): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud, exp: now + 86400, sub, iat: now };

  const enc = new TextEncoder();
  const b64url = (buf: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(buf instanceof ArrayBuffer ? buf : buf)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const headerB64 = b64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  // Import private key
  const rawKey = Uint8Array.from(atob(privateKeyBase64url.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    rawKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(unsigned),
  );

  return `${unsigned}.${b64url(sig)}`;
}

// Simpler approach: use fetch with VAPID headers
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<Response> {
  // For web push, we need the web-push protocol
  // Since Deno doesn't have a native web-push lib, we'll use a simplified approach
  // by sending to the push service endpoint
  
  const body = new TextEncoder().encode(payload);
  
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": body.length.toString(),
      "TTL": "86400",
    },
    body,
  });

  return response;
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const { user_ids, title, body: messageBody, data: notifData } = await req.json();

    if (!user_ids?.length || !title) {
      return new Response(JSON.stringify({ error: "user_ids and title required" }), { status: 400, headers });
    }

    // Get subscriptions for target users using service role
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: subs, error: subError } = await serviceClient
      .from("push_subscriptions")
      .select("*")
      .in("user_id", user_ids);

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), { status: 500, headers });
    }

    const payload = JSON.stringify({
      title,
      body: messageBody || "",
      data: notifData || {},
      timestamp: new Date().toISOString(),
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subs || []) {
      try {
        const subscription = sub.subscription as { endpoint: string; keys: { p256dh: string; auth: string } };
        
        const res = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
          },
          body: payload,
        });

        if (res.ok || res.status === 201) {
          sent++;
        } else if (res.status === 410 || res.status === 404) {
          // Subscription expired, remove it
          await serviceClient.from("push_subscriptions").delete().eq("id", sub.id);
          failed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total: (subs || []).length }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }
});

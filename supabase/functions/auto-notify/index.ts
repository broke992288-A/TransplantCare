import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Auto-notify edge function — called by pg_cron or a trusted caller.
 *
 * Handlers:
 *  1. "critical_alerts" — notify assigned doctor about unread critical alerts
 *  2. "lab_reminders"   — notify patients with labs due
 *  3. "med_reminders"   — daily medication reminder
 *
 * Reliability contract:
 *  - Auth: shared secret in AUTO_NOTIFY_SECRET (never hardcoded here).
 *  - Diagnostics: GET /auto-notify?health=1 reports configuration health
 *    (booleans only, never secret values) so a missing secret is visible
 *    instead of failing silently.
 *  - Idempotency: every push is keyed in public.notification_log; a duplicate
 *    dedupe_key (unique index) means "already sent" and is skipped.
 *  - Bounded retry: one retry per endpoint on a transient (5xx/network) error.
 *  - 404/410 endpoints are deleted (subscription cleanup preserved).
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function getServiceClient() {
  return createClient(supabaseUrl, serviceRoleKey);
}

type SC = SupabaseClient;

const jsonHeaders = { "Content-Type": "application/json" };

/** UTC day stamp used inside dedupe keys for daily reminders. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Claim a dedupe key. Returns true when this caller is the first to claim it
 * (i.e. the notification should be sent). Relies on the UNIQUE constraint.
 */
async function claim(
  supabase: SC,
  dedupeKey: string,
  notificationType: string,
  targetUserId: string | null,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await supabase.from("notification_log").insert({
    dedupe_key: dedupeKey,
    notification_type: notificationType,
    target_user_id: targetUserId,
    payload,
  });
  if (!error) return true;
  // 23505 = unique violation → already sent.
  if ((error as { code?: string }).code === "23505") return false;
  console.error("notification_log claim failed", error.message);
  // Fail closed: do not send when we cannot guarantee idempotency.
  return false;
}

async function recordResult(
  supabase: SC,
  dedupeKey: string,
  sent: number,
  failed: number,
) {
  const { error } = await supabase
    .from("notification_log")
    .update({ sent_count: sent, failed_count: failed })
    .eq("dedupe_key", dedupeKey);
  if (error) console.error("notification_log update failed", error.message);
}

async function postOnce(endpoint: string, payload: string): Promise<number> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", TTL: "86400" },
    body: payload,
  });
  return res.status;
}

/** Send push to a list of user IDs with bounded (single) retry. */
async function sendPush(
  supabase: SC,
  userIds: string[],
  title: string,
  body: string,
) {
  if (userIds.length === 0) return { sent: 0, failed: 0, endpoints: 0 };

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .in("user_id", userIds);

  if (error) {
    console.error("push_subscriptions read failed", error.message);
    return { sent: 0, failed: 0, endpoints: 0 };
  }
  if (!subs || subs.length === 0) return { sent: 0, failed: 0, endpoints: 0 };

  const payload = JSON.stringify({
    title,
    body,
    data: {},
    timestamp: new Date().toISOString(),
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const subscription = sub.subscription as { endpoint?: string } | null;
    const endpoint = subscription?.endpoint;
    if (!endpoint) { failed++; continue; }

    let status = 0;
    try {
      status = await postOnce(endpoint, payload);
    } catch (e) {
      console.error("push transport error", String(e));
      status = 0;
    }

    // Bounded retry: exactly one retry for transient failures.
    if (status === 0 || status >= 500) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        status = await postOnce(endpoint, payload);
      } catch {
        status = 0;
      }
    }

    if (status === 200 || status === 201 || status === 202 || status === 204) {
      sent++;
    } else if (status === 404 || status === 410) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id as string);
      failed++;
    } else {
      failed++;
    }
  }

  return { sent, failed, endpoints: subs.length };
}

// ── Handler: Critical alerts → notify assigned doctor ──
async function handleCriticalAlerts(supabase: SC) {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: alerts, error } = await supabase
    .from("patient_alerts")
    .select("id, patient_id, title, severity")
    .eq("is_read", false)
    .eq("severity", "critical")
    .gte("created_at", thirtyMinAgo);

  if (error) throw new Error(`patient_alerts read failed: ${error.message}`);
  if (!alerts || alerts.length === 0) {
    return { type: "critical_alerts", sent: 0, skipped: 0, alerts_count: 0 };
  }

  const patientIds = [...new Set(alerts.map((a) => a.patient_id as string))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, assigned_doctor_id")
    .in("id", patientIds)
    .not("assigned_doctor_id", "is", null);

  if (!patients || patients.length === 0) {
    return { type: "critical_alerts", sent: 0, skipped: 0, alerts_count: alerts.length };
  }

  const byDoctor = new Map<string, { alertIds: string[]; messages: string[] }>();
  for (const patient of patients) {
    const doctorId = patient.assigned_doctor_id as string;
    const mine = alerts.filter((a) => a.patient_id === patient.id);
    if (!byDoctor.has(doctorId)) byDoctor.set(doctorId, { alertIds: [], messages: [] });
    const bucket = byDoctor.get(doctorId)!;
    for (const alert of mine) {
      bucket.alertIds.push(alert.id as string);
      bucket.messages.push(`${patient.full_name}: ${alert.title}`);
    }
  }

  let totalSent = 0;
  let skipped = 0;
  for (const [doctorId, bucket] of byDoctor) {
    // One notification per (doctor, exact alert set) — never repeated.
    const dedupeKey = `critical_alerts:${doctorId}:${bucket.alertIds.slice().sort().join(",")}`;
    const ok = await claim(supabase, dedupeKey, "critical_alerts", doctorId, {
      alert_ids: bucket.alertIds,
    });
    if (!ok) { skipped++; continue; }

    const result = await sendPush(
      supabase,
      [doctorId],
      `🔴 Критик огоҳлантириш (${bucket.messages.length})`,
      bucket.messages.slice(0, 3).join("\n"),
    );
    await recordResult(supabase, dedupeKey, result.sent, result.failed);
    totalSent += result.sent;
  }

  return { type: "critical_alerts", sent: totalSent, skipped, alerts_count: alerts.length };
}

// ── Handler: Lab reminders → notify patients ──
async function handleLabReminders(supabase: SC) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: schedules, error } = await supabase
    .from("lab_schedules")
    .select("patient_id, scheduled_date, status")
    .in("status", ["upcoming", "due_soon", "overdue"])
    .lte("scheduled_date", tomorrowStr);

  if (error) throw new Error(`lab_schedules read failed: ${error.message}`);
  if (!schedules || schedules.length === 0) {
    return { type: "lab_reminders", sent: 0, skipped: 0, patients: 0 };
  }

  const patientIds = [...new Set(schedules.map((s) => s.patient_id as string))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, linked_user_id")
    .in("id", patientIds)
    .not("linked_user_id", "is", null);

  if (!patients || patients.length === 0) {
    return { type: "lab_reminders", sent: 0, skipped: 0, patients: 0 };
  }

  const day = todayKey();
  let sent = 0;
  let skipped = 0;
  for (const p of patients) {
    const userId = p.linked_user_id as string;
    if (!userId) continue;
    const dedupeKey = `lab_reminders:${userId}:${day}`;
    const ok = await claim(supabase, dedupeKey, "lab_reminders", userId, { patient_id: p.id });
    if (!ok) { skipped++; continue; }
    const result = await sendPush(
      supabase,
      [userId],
      "🔬 Таҳлил эслатмаси",
      "Сизда навбатдаги лаборатория таҳлили кутилмоқда. Илтимос, вақтида топширинг.",
    );
    await recordResult(supabase, dedupeKey, result.sent, result.failed);
    sent += result.sent;
  }

  return { type: "lab_reminders", sent, skipped, patients: patients.length };
}

// ── Handler: Medication reminders → notify patients ──
async function handleMedReminders(supabase: SC) {
  const { data: meds, error } = await supabase
    .from("medications")
    .select("patient_id")
    .eq("is_active", true);

  if (error) throw new Error(`medications read failed: ${error.message}`);
  if (!meds || meds.length === 0) {
    return { type: "med_reminders", sent: 0, skipped: 0, patients: 0 };
  }

  const patientIds = [...new Set(meds.map((m) => m.patient_id as string))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, linked_user_id")
    .in("id", patientIds)
    .not("linked_user_id", "is", null);

  if (!patients || patients.length === 0) {
    return { type: "med_reminders", sent: 0, skipped: 0, patients: 0 };
  }

  const day = todayKey();
  let sent = 0;
  let skipped = 0;
  for (const p of patients) {
    const userId = p.linked_user_id as string;
    if (!userId) continue;
    const dedupeKey = `med_reminders:${userId}:${day}`;
    const ok = await claim(supabase, dedupeKey, "med_reminders", userId, { patient_id: p.id });
    if (!ok) { skipped++; continue; }
    const result = await sendPush(
      supabase,
      [userId],
      "💊 Дори эслатмаси",
      "Бугунги дориларингизни қабул қилишни унутманг!",
    );
    await recordResult(supabase, dedupeKey, result.sent, result.failed);
    sent += result.sent;
  }

  return { type: "med_reminders", sent, skipped, patients: patients.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  const url = new URL(req.url);
  const expectedSecret = Deno.env.get("AUTO_NOTIFY_SECRET");

  // Configuration health check — booleans only, no secret values, no auth
  // needed so monitoring can see a misconfiguration instead of a blind 503.
  if (url.searchParams.get("health") === "1") {
    const config = {
      auto_notify_secret_configured: Boolean(expectedSecret),
      supabase_url_configured: Boolean(supabaseUrl),
      service_role_key_configured: Boolean(serviceRoleKey),
    };
    const healthy = Object.values(config).every(Boolean);
    console.log("auto-notify health", JSON.stringify({ healthy, config }));
    return new Response(JSON.stringify({ healthy, config }), {
      status: healthy ? 200 : 503,
      headers: jsonHeaders,
    });
  }

  if (!expectedSecret) {
    console.error(
      "auto-notify misconfigured",
      JSON.stringify({ reason: "AUTO_NOTIFY_SECRET missing", hint: "set it in project secrets" }),
    );
    return new Response(
      JSON.stringify({
        error: "not_configured",
        detail: "AUTO_NOTIFY_SECRET is not set for this environment",
      }),
      { status: 503, headers: jsonHeaders },
    );
  }
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("auto-notify misconfigured", JSON.stringify({ reason: "supabase env missing" }));
    return new Response(
      JSON.stringify({ error: "not_configured", detail: "Supabase environment missing" }),
      { status: 503, headers: jsonHeaders },
    );
  }

  const incoming = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!incoming || incoming !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const startedAt = Date.now();
  try {
    let notifType = "all";
    try {
      const body = await req.json();
      if (body && typeof body.type === "string") notifType = body.type;
    } catch {
      // No body → run all
    }

    const allowed = ["all", "critical_alerts", "lab_reminders", "med_reminders"];
    if (!allowed.includes(notifType)) {
      return new Response(
        JSON.stringify({ error: "invalid_type", allowed }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const supabase = getServiceClient();
    const results: Record<string, unknown>[] = [];

    if (notifType === "all" || notifType === "critical_alerts") {
      results.push(await handleCriticalAlerts(supabase));
    }
    if (notifType === "all" || notifType === "lab_reminders") {
      results.push(await handleLabReminders(supabase));
    }
    if (notifType === "all" || notifType === "med_reminders") {
      results.push(await handleMedReminders(supabase));
    }

    const duration_ms = Date.now() - startedAt;
    console.log("auto-notify done", JSON.stringify({ type: notifType, duration_ms, results }));

    return new Response(JSON.stringify({ ok: true, type: notifType, duration_ms, results }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("auto-notify error", JSON.stringify({ message, duration_ms: Date.now() - startedAt }));
    return new Response(JSON.stringify({ error: "handler_failed", detail: message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});

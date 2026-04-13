import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Auto-notify edge function — called by pg_cron or manually.
 * Handles:
 *  1. "critical_alerts" — notify assigned doctor when critical patient_alert exists unread
 *  2. "lab_reminders" — notify patients with labs due tomorrow
 *  3. "med_reminders" — daily medication reminder to all patients with active meds
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getServiceClient() {
  return createClient(supabaseUrl, serviceRoleKey);
}

type SC = SupabaseClient;

// Send push to a list of user IDs
async function sendPush(
  supabase: SC,
  userIds: string[],
  title: string,
  body: string,
) {
  if (userIds.length === 0) return { sent: 0, failed: 0 };

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  const payload = JSON.stringify({
    title,
    body,
    data: {},
    timestamp: new Date().toISOString(),
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      const subscription = sub.subscription as { endpoint: string };
      const res = await fetch(subscription.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", TTL: "86400" },
        body: payload,
      });

      if (res.ok || res.status === 201) {
        sent++;
      } else if (res.status === 410 || res.status === 404) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id as string);
        failed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

// ── Handler: Critical alerts → notify assigned doctor ──
async function handleCriticalAlerts(supabase: SC) {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: alerts } = await supabase
    .from("patient_alerts")
    .select("id, patient_id, title, message, severity")
    .eq("is_read", false)
    .eq("severity", "critical")
    .gte("created_at", thirtyMinAgo);

  if (!alerts || alerts.length === 0) return { type: "critical_alerts", sent: 0 };

  const patientIds = [...new Set(alerts.map((a: Record<string, unknown>) => a.patient_id as string))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, assigned_doctor_id")
    .in("id", patientIds)
    .not("assigned_doctor_id", "is", null);

  if (!patients || patients.length === 0) return { type: "critical_alerts", sent: 0 };

  const doctorAlerts = new Map<string, string[]>();
  for (const patient of patients) {
    const doctorId = patient.assigned_doctor_id as string;
    const patientAlerts = alerts.filter((a: Record<string, unknown>) => a.patient_id === patient.id);
    if (!doctorAlerts.has(doctorId)) {
      doctorAlerts.set(doctorId, []);
    }
    for (const alert of patientAlerts) {
      doctorAlerts.get(doctorId)!.push(
        `${patient.full_name}: ${alert.title}`
      );
    }
  }

  let totalSent = 0;
  for (const [doctorId, messages] of doctorAlerts) {
    const result = await sendPush(
      supabase,
      [doctorId],
      `🔴 Критик огоҳлантириш (${messages.length})`,
      messages.slice(0, 3).join("\n"),
    );
    totalSent += result.sent;
  }

  return { type: "critical_alerts", sent: totalSent, alerts_count: alerts.length };
}

// ── Handler: Lab reminders → notify patients ──
async function handleLabReminders(supabase: SC) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: schedules } = await supabase
    .from("lab_schedules")
    .select("patient_id, scheduled_date, status")
    .in("status", ["upcoming", "due_soon", "overdue"])
    .lte("scheduled_date", tomorrowStr);

  if (!schedules || schedules.length === 0) return { type: "lab_reminders", sent: 0 };

  const patientIds = [...new Set(schedules.map((s: Record<string, unknown>) => s.patient_id as string))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, linked_user_id")
    .in("id", patientIds)
    .not("linked_user_id", "is", null);

  if (!patients || patients.length === 0) return { type: "lab_reminders", sent: 0 };

  const userIds = patients.map((p: Record<string, unknown>) => p.linked_user_id as string).filter(Boolean);

  const result = await sendPush(
    supabase,
    userIds,
    "🔬 Таҳлил эслатмаси",
    "Сизда навбатдаги лаборатория таҳлили кутилмоқда. Илтимос, вақтида топширинг.",
  );

  return { type: "lab_reminders", sent: result.sent, patients: userIds.length };
}

// ── Handler: Medication reminders → notify patients ──
async function handleMedReminders(supabase: SC) {
  const { data: meds } = await supabase
    .from("medications")
    .select("patient_id, medication_name")
    .eq("is_active", true);

  if (!meds || meds.length === 0) return { type: "med_reminders", sent: 0 };

  const patientIds = [...new Set(meds.map((m: Record<string, unknown>) => m.patient_id as string))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, linked_user_id")
    .in("id", patientIds)
    .not("linked_user_id", "is", null);

  if (!patients || patients.length === 0) return { type: "med_reminders", sent: 0 };

  const userIds = patients.map((p: Record<string, unknown>) => p.linked_user_id as string).filter(Boolean);

  const result = await sendPush(
    supabase,
    userIds,
    "💊 Дори эслатмаси",
    "Бугунги дориларингизни қабул қилишни унутманг!",
  );

  return { type: "med_reminders", sent: result.sent, patients: userIds.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    let notifType = "all";
    try {
      const body = await req.json();
      notifType = body.type || "all";
    } catch {
      // No body or invalid JSON — run all
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

    console.log("Auto-notify results:", JSON.stringify(results));

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Auto-notify error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

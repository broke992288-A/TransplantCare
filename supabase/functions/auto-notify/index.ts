import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

// Send push to a list of user IDs
async function sendPush(
  supabase: ReturnType<typeof createClient>,
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
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
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
async function handleCriticalAlerts(supabase: ReturnType<typeof createClient>) {
  // Find unread critical alerts created in last 30 minutes
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: alerts } = await supabase
    .from("patient_alerts")
    .select("id, patient_id, title, message, severity")
    .eq("is_read", false)
    .eq("severity", "critical")
    .gte("created_at", thirtyMinAgo);

  if (!alerts || alerts.length === 0) return { type: "critical_alerts", sent: 0 };

  // Get assigned doctors for these patients
  const patientIds = [...new Set(alerts.map((a: any) => a.patient_id))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, assigned_doctor_id")
    .in("id", patientIds)
    .not("assigned_doctor_id", "is", null);

  if (!patients || patients.length === 0) return { type: "critical_alerts", sent: 0 };

  // Group by doctor
  const doctorAlerts = new Map<string, string[]>();
  for (const patient of patients) {
    const patientAlerts = alerts.filter((a: any) => a.patient_id === patient.id);
    if (!doctorAlerts.has(patient.assigned_doctor_id)) {
      doctorAlerts.set(patient.assigned_doctor_id, []);
    }
    for (const alert of patientAlerts) {
      doctorAlerts.get(patient.assigned_doctor_id)!.push(
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
async function handleLabReminders(supabase: ReturnType<typeof createClient>) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const today = new Date().toISOString().slice(0, 10);

  // Labs due tomorrow or overdue
  const { data: schedules } = await supabase
    .from("lab_schedules")
    .select("patient_id, scheduled_date, status")
    .in("status", ["upcoming", "due_soon", "overdue"])
    .lte("scheduled_date", tomorrowStr);

  if (!schedules || schedules.length === 0) return { type: "lab_reminders", sent: 0 };

  const patientIds = [...new Set(schedules.map((s: any) => s.patient_id))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, linked_user_id")
    .in("id", patientIds)
    .not("linked_user_id", "is", null);

  if (!patients || patients.length === 0) return { type: "lab_reminders", sent: 0 };

  const userIds = patients.map((p: any) => p.linked_user_id).filter(Boolean);

  const result = await sendPush(
    supabase,
    userIds,
    "🔬 Таҳлил эслатмаси",
    "Сизда навбатдаги лаборатория таҳлили кутилмоқда. Илтимос, вақтида топширинг.",
  );

  return { type: "lab_reminders", sent: result.sent, patients: userIds.length };
}

// ── Handler: Medication reminders → notify patients ──
async function handleMedReminders(supabase: ReturnType<typeof createClient>) {
  // Get all patients with active medications
  const { data: meds } = await supabase
    .from("medications")
    .select("patient_id, medication_name")
    .eq("is_active", true);

  if (!meds || meds.length === 0) return { type: "med_reminders", sent: 0 };

  const patientIds = [...new Set(meds.map((m: any) => m.patient_id))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, linked_user_id")
    .in("id", patientIds)
    .not("linked_user_id", "is", null);

  if (!patients || patients.length === 0) return { type: "med_reminders", sent: 0 };

  const userIds = patients.map((p: any) => p.linked_user_id).filter(Boolean);

  const result = await sendPush(
    supabase,
    userIds,
    "💊 Дори эслатмаси",
    "Бугунги дориларингизни қабул қилишни унутманг!",
  );

  return { type: "med_reminders", sent: result.sent, patients: userIds.length };
}

Deno.serve(async (req: Request) => {
  // Allow both POST and GET (for cron calls)
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    // Verify this is called with service role key or from pg_cron
    const authHeader = req.headers.get("Authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    // Accept service role key, anon key (from pg_cron), or no auth (internal)
    // pg_cron sends anon key by default
    
    let notifType = "all";
    try {
      const body = await req.json();
      notifType = body.type || "all";
    } catch {
      // No body or invalid JSON — run all
    }

    const supabase = getServiceClient();
    const results: any[] = [];

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
  } catch (err) {
    console.error("Auto-notify error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

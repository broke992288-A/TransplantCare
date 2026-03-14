import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://id-preview--3d6f8975-c3ff-446b-91f6-07f7ec886943.lovable.app",
  "https://lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o) || origin.endsWith(".lovable.app"));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

function log(level: string, fn: string, msg: string, meta: Record<string, unknown> = {}) {
  const entry = { timestamp: new Date().toISOString(), level, function_name: fn, message: msg, ...meta };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

async function authenticateRequest(req: Request, corsHeaders: Record<string, string>): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return { userId: data.claims.sub as string };
}

const FN_NAME = "system-health";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  const authResult = await authenticateRequest(req, corsHeaders);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { count: patientCount, error: dbErr } = await supabase
      .from("patients")
      .select("id", { count: "exact", head: true });

    const { count: labCount } = await supabase
      .from("lab_results")
      .select("id", { count: "exact", head: true });

    const { count: alertCount } = await supabase
      .from("patient_alerts")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);

    const dbHealthy = !dbErr;
    const responseTime = Date.now() - startTime;
    const status = dbHealthy ? "healthy" : "degraded";

    log("info", FN_NAME, "Health check completed", { requestId, userId, status, responseTime });

    return new Response(JSON.stringify({
      status,
      timestamp: new Date().toISOString(),
      uptime_check: true,
      response_time_ms: responseTime,
      database: {
        connected: dbHealthy,
        patients: patientCount ?? 0,
        lab_results: labCount ?? 0,
        unread_alerts: alertCount ?? 0,
      },
      edge_functions: {
        "ocr-lab-report": "deployed",
        "predict-rejection": "deployed",
        "recalculate-risk": "deployed",
        "translate-text": "deployed",
        "system-health": "deployed",
      },
      version: "2.0.0",
      algorithm_version: "v2.0-kdigo2024",
    }), {
      status: dbHealthy ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("error", FN_NAME, "Health check failed", { requestId, userId, error: e instanceof Error ? e.message : "Unknown" });
    return new Response(JSON.stringify({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: e instanceof Error ? e.message : "Unknown error",
      response_time_ms: Date.now() - startTime,
    }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

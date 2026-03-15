import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

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

const FN_NAME = "predict-rejection";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  const authResult = await authenticateRequest(req, corsHeaders);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  try {
    const { patient_id, organ_type, labs, language = "en", patient_data } = await req.json();

    log("info", FN_NAME, "Prediction requested", { requestId, userId, patient_id, organ_type });

    if (!patient_id || !organ_type || !labs || labs.length < 2) {
      return new Response(JSON.stringify({
        prediction_risk: "low", score: 0,
        message: "Insufficient lab data for prediction (need at least 3 results).",
        reasons: [], disclaimer: "This prediction is AI-assisted and should be reviewed by a healthcare professional.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const labSummary = labs.slice(0, 5).map((l: any, i: number) => {
      const date = l.recorded_at ? new Date(l.recorded_at).toLocaleDateString() : `Test ${i + 1}`;
      if (organ_type === "liver") {
        return `${date}: ALT=${l.alt ?? "N/A"}, AST=${l.ast ?? "N/A"}, Tacrolimus=${l.tacrolimus_level ?? "N/A"}, TotalBilirubin=${l.total_bilirubin ?? "N/A"}, DirectBilirubin=${l.direct_bilirubin ?? "N/A"}, GGT=${l.ggt ?? "N/A"}, ALP=${l.alp ?? "N/A"}`;
      } else {
        return `${date}: Creatinine=${l.creatinine ?? "N/A"}, eGFR=${l.egfr ?? "N/A"}, Proteinuria=${l.proteinuria ?? "N/A"}, Potassium=${l.potassium ?? "N/A"}`;
      }
    }).join("\n");

    let bloodContext = "";
    if (patient_data?.blood_type && patient_data?.donor_blood_type) {
      const mismatch = patient_data.blood_type !== patient_data.donor_blood_type;
      bloodContext = `\nPatient blood type: ${patient_data.blood_type}, Donor blood type: ${patient_data.donor_blood_type}.`;
      if (mismatch) {
        bloodContext += ` BLOOD TYPE INCOMPATIBILITY DETECTED.`;
        bloodContext += patient_data.titer_therapy
          ? ` Titer reduction therapy was performed. Consider residual AMR risk.`
          : ` NO titer reduction therapy. Significantly increases AMR risk.`;
      }
    }

    const systemPrompt = `You are a transplant rejection prediction system. Analyze laboratory trends for a ${organ_type} transplant patient and predict the risk of graft rejection in the next 7-14 days.

RULES:
- Analyze TRENDS across multiple lab results (not just single values)
- For LIVER: Watch for rising ALT/AST, rising bilirubin, GGT/ALP elevation, decreasing tacrolimus
- For KIDNEY: Watch for rising creatinine, declining eGFR, increasing proteinuria, abnormal potassium
- Consider rate of change, not just absolute values
- A consistent worsening trend across 3+ tests is more concerning than a single abnormal value
- If blood type incompatibility exists WITHOUT titer therapy, this is a MAJOR risk factor for AMR
- If blood type incompatibility exists WITH titer therapy, consider residual AMR risk as a moderate factor

IMPORTANT: ALWAYS write ALL text fields (message, reasons, timeframe) in English.

You MUST respond using the predict_rejection tool.`;

    const userPrompt = `Patient organ: ${organ_type} transplant${bloodContext}
Lab history (most recent first):
${labSummary}

Analyze the trend and predict rejection risk for the next 7-14 days.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "predict_rejection",
            description: "Return structured prediction result for transplant rejection risk.",
            parameters: {
              type: "object",
              properties: {
                prediction_risk: { type: "string", enum: ["low", "medium", "high"] },
                score: { type: "number", description: "Prediction confidence score 0-100" },
                message: { type: "string" },
                reasons: { type: "array", items: { type: "string" } },
                timeframe: { type: "string" },
              },
              required: ["prediction_risk", "score", "message", "reasons", "timeframe"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "predict_rejection" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      log("error", FN_NAME, "AI gateway error", { requestId, userId, status: response.status, errText });
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const prediction = JSON.parse(toolCall.function.arguments);
    prediction.disclaimer = "This prediction is AI-assisted and should be reviewed by a healthcare professional.";

    const duration = Date.now() - startTime;
    log("info", FN_NAME, "Prediction completed", { requestId, userId, patient_id, duration_ms: duration, risk: prediction.prediction_risk });

    return new Response(JSON.stringify(prediction), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const duration = Date.now() - startTime;
    log("error", FN_NAME, "Prediction error", { requestId, userId, duration_ms: duration, error: e instanceof Error ? e.message : "Unknown" });
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      prediction_risk: "low", score: 0, message: "Unable to generate prediction at this time.",
      reasons: [], disclaimer: "This prediction is AI-assisted and should be reviewed by a healthcare professional.",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

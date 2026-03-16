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

const FN_NAME = "translate-text";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ru: "Russian",
  uz: "Uzbek (Latin script)",
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();

  const authResult = await authenticateRequest(req, corsHeaders);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  // Rate limit: 50 translations per user per 5 minutes
  const rl = checkRateLimit(userId, { maxRequests: 50, windowMs: 5 * 60 * 1000, functionName: FN_NAME });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const { texts, targetLang, sourceLang } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0 || !targetLang) {
      return new Response(JSON.stringify({ error: "texts (array) and targetLang required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sourceLang && sourceLang === targetLang) {
      return new Response(JSON.stringify({ translations: texts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("info", FN_NAME, "Translation requested", { requestId, userId, targetLang, textCount: texts.length });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const targetName = LANG_NAMES[targetLang] || targetLang;
    const sourceHint = sourceLang ? `from ${LANG_NAMES[sourceLang] || sourceLang} ` : "";

    const prompt = texts.length === 1
      ? `Translate the following medical text ${sourceHint}to ${targetName}. Keep medical terminology accurate. Return ONLY the translated text, nothing else.\n\nText: ${texts[0]}`
      : `Translate each of the following medical texts ${sourceHint}to ${targetName}. Keep medical terminology accurate. Return a JSON array of translated strings, nothing else.\n\n${JSON.stringify(texts)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: "You are a medical translator. Translate accurately preserving medical terms. For single text, return only the translation. For multiple texts, return a JSON array of strings." },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      log("error", FN_NAME, "AI gateway error", { requestId, userId, status, error: t });
      throw new Error("AI translation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    let translations: string[];
    if (texts.length === 1) {
      translations = [content];
    } else {
      try {
        const cleaned = content.replace(/^```json\s*/, "").replace(/```$/, "").trim();
        translations = JSON.parse(cleaned);
        if (!Array.isArray(translations)) translations = texts;
      } catch { translations = texts; }
    }

    log("info", FN_NAME, "Translation completed", { requestId, userId, targetLang });

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("error", FN_NAME, "Translation error", { requestId, userId, error: e instanceof Error ? e.message : "Unknown" });
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

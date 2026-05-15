import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

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
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return { userId: data.user.id };
}

const FN_NAME = "translate-text";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ru: "Russian",
  uz: "Uzbek (Latin script)",
};

function fallbackTranslationResponse(
  texts: string[],
  corsHeaders: Record<string, string>,
  message: string,
  code: "PAYMENT_REQUIRED" | "RATE_LIMITED" | "SERVICE_UNAVAILABLE",
) {
  return new Response(
    JSON.stringify({ translations: texts, fallback: true, error: code, message }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

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
      const t = await response.text();
      log("error", FN_NAME, "AI gateway error", { requestId, userId, status, error: t });

      if (status === 402) {
        return fallbackTranslationResponse(texts, corsHeaders, "AI credits are exhausted. Showing original text.", "PAYMENT_REQUIRED");
      }
      if (status === 429) {
        return fallbackTranslationResponse(texts, corsHeaders, "AI translation is rate limited. Showing original text.", "RATE_LIMITED");
      }
      if (status >= 500) {
        return fallbackTranslationResponse(texts, corsHeaders, "AI translation is temporarily unavailable. Showing original text.", "SERVICE_UNAVAILABLE");
      }

      return new Response(JSON.stringify({ error: "AI translation failed" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      JSON.stringify({ translations: [], fallback: true, error: "SERVICE_UNAVAILABLE", message: "Translation is temporarily unavailable." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

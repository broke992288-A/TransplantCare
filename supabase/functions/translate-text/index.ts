import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ru: "Russian",
  uz: "Uzbek (Latin script)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { texts, targetLang, sourceLang } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0 || !targetLang) {
      return new Response(JSON.stringify({ error: "texts (array) and targetLang required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if source and target are the same
    if (sourceLang && sourceLang === targetLang) {
      return new Response(JSON.stringify({ translations: texts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const targetName = LANG_NAMES[targetLang] || targetLang;
    const sourceHint = sourceLang ? `from ${LANG_NAMES[sourceLang] || sourceLang} ` : "";

    const prompt = texts.length === 1
      ? `Translate the following medical text ${sourceHint}to ${targetName}. Keep medical terminology accurate. Return ONLY the translated text, nothing else.\n\nText: ${texts[0]}`
      : `Translate each of the following medical texts ${sourceHint}to ${targetName}. Keep medical terminology accurate. Return a JSON array of translated strings, nothing else.\n\n${JSON.stringify(texts)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are a medical translator. Translate accurately preserving medical terms. For single text, return only the translation. For multiple texts, return a JSON array of strings.",
          },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI translation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    let translations: string[];
    if (texts.length === 1) {
      translations = [content];
    } else {
      try {
        // Try to parse as JSON array
        const cleaned = content.replace(/^```json\s*/, "").replace(/```$/, "").trim();
        translations = JSON.parse(cleaned);
        if (!Array.isArray(translations)) translations = texts;
      } catch {
        translations = texts; // fallback to originals
      }
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

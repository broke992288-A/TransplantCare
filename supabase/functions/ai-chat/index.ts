// AI chat streaming via Lovable AI Gateway (authenticated, rate-limited, CORS-restricted)
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, "POST, OPTIONS");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Authenticate caller via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return json(401, { error: "Unauthorized" });
    }

    // Per-user rate limit: 20 requests / minute
    const rl = checkRateLimit(userData.user.id, {
      maxRequests: 20,
      windowMs: 60_000,
      functionName: "ai-chat",
    });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return json(400, { error: "messages must be a non-empty array" });
    }

    const systemPrompt =
      "You are a helpful AI assistant inside the TransplantCare clinical app. " +
      "Answer clearly and concisely using markdown. " +
      "If asked clinical questions, provide educational information only and remind users that clinical decisions must be made by a qualified physician. " +
      "Reply in the same language as the user's message (English, Russian, or Uzbek).";

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) return json(429, { error: "Rate limits exceeded. Please try again later." });
      if (upstream.status === 402) return json(402, { error: "AI credits exhausted. Please add credits in Lovable workspace settings." });
      const t = await upstream.text();
      console.error("AI gateway error:", upstream.status, t);
      return json(500, { error: "AI gateway error" });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

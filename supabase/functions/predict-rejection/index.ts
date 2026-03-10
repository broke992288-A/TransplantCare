import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { patient_id, organ_type, labs, language = "en", patient_data } = await req.json();

    if (!patient_id || !organ_type || !labs || labs.length < 2) {
      return new Response(JSON.stringify({
        prediction_risk: "low",
        score: 0,
        message: "Insufficient lab data for prediction (need at least 3 results).",
        reasons: [],
        disclaimer: "This prediction is AI-assisted and should be reviewed by a healthcare professional.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build structured lab history for the AI
    const labSummary = labs.slice(0, 5).map((l: any, i: number) => {
      const date = l.recorded_at ? new Date(l.recorded_at).toLocaleDateString() : `Test ${i + 1}`;
      if (organ_type === "liver") {
        return `${date}: ALT=${l.alt ?? "N/A"}, AST=${l.ast ?? "N/A"}, Tacrolimus=${l.tacrolimus_level ?? "N/A"}, TotalBilirubin=${l.total_bilirubin ?? "N/A"}, DirectBilirubin=${l.direct_bilirubin ?? "N/A"}`;
      } else {
        return `${date}: Creatinine=${l.creatinine ?? "N/A"}, eGFR=${l.egfr ?? "N/A"}, Proteinuria=${l.proteinuria ?? "N/A"}, Potassium=${l.potassium ?? "N/A"}`;
      }
    }).join("\n");

    // Build blood type context
    let bloodContext = "";
    if (patient_data?.blood_type && patient_data?.donor_blood_type) {
      const mismatch = patient_data.blood_type !== patient_data.donor_blood_type;
      bloodContext = `\nPatient blood type: ${patient_data.blood_type}, Donor blood type: ${patient_data.donor_blood_type}.`;
      if (mismatch) {
        bloodContext += ` BLOOD TYPE INCOMPATIBILITY DETECTED.`;
        if (patient_data.titer_therapy) {
          bloodContext += ` Titer reduction therapy was performed. Consider residual antibody-mediated rejection (AMR) risk.`;
        } else {
          bloodContext += ` NO titer reduction therapy was performed. This significantly increases the risk of antibody-mediated rejection (AMR).`;
        }
      }
    }

    const systemPrompt = `You are a transplant rejection prediction system. Analyze laboratory trends for a ${organ_type} transplant patient and predict the risk of graft rejection in the next 7-14 days.

RULES:
- Analyze TRENDS across multiple lab results (not just single values)
- For LIVER: Watch for rising ALT/AST, rising bilirubin, decreasing tacrolimus
- For KIDNEY: Watch for rising creatinine, declining eGFR, increasing proteinuria, abnormal potassium
- Consider rate of change, not just absolute values
- A consistent worsening trend across 3+ tests is more concerning than a single abnormal value
- If blood type incompatibility exists WITHOUT titer therapy, this is a MAJOR risk factor for AMR
- If blood type incompatibility exists WITH titer therapy, consider residual AMR risk as a moderate factor

IMPORTANT: ALWAYS write ALL text fields (message, reasons, timeframe) in English. This ensures consistency across translations.

You MUST respond using the predict_rejection tool.`;

    const userPrompt = `Patient organ: ${organ_type} transplant${bloodContext}
Lab history (most recent first):
${labSummary}

Analyze the trend and predict rejection risk for the next 7-14 days.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "predict_rejection",
              description: "Return structured prediction result for transplant rejection risk.",
              parameters: {
                type: "object",
                properties: {
                  prediction_risk: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Predicted rejection risk level for the next 7-14 days",
                  },
                  score: {
                    type: "number",
                    description: "Prediction confidence score 0-100",
                  },
                  message: {
                    type: "string",
                    description: "Brief prediction message for the doctor, e.g. 'Possible early graft rejection risk within the next 7-14 days based on ALT trend and Tacrolimus decrease.'",
                  },
                  reasons: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of reasons explaining the prediction, e.g. ['ALT rising trend across last 3 tests', 'Tacrolimus level decreasing']",
                  },
                  timeframe: {
                    type: "string",
                    description: "Estimated timeframe, e.g. '7-10 days' or '10-14 days'",
                  },
                },
                required: ["prediction_risk", "score", "message", "reasons", "timeframe"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "predict_rejection" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const prediction = JSON.parse(toolCall.function.arguments);
    prediction.disclaimer = "This prediction is AI-assisted and should be reviewed by a healthcare professional.";

    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("predict-rejection error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      prediction_risk: "low",
      score: 0,
      message: "Unable to generate prediction at this time.",
      reasons: [],
      disclaimer: "This prediction is AI-assisted and should be reviewed by a healthcare professional.",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

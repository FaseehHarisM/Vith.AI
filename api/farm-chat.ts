// AUTO-GENERATED from supabase/functions/<name>/index.ts by scripts/gen-vercel-api.mjs
// Do not edit directly - edit the Supabase function and re-run the generator.
export const config = { runtime: "edge" };

type Handler = (req: Request) => Response | Promise<Response>;
let _handler: Handler = () => new Response("not ready", { status: 500 });
const serve = (fn: Handler) => {
  _handler = fn;
};
// Deno.env shim -> Vercel Environment Variables
const Deno = {
  env: {
    get: (key: string): string | undefined => (process.env as Record<string, string | undefined>)[key],
  },
};
void Deno;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, farmContext, responseLanguage } = await req.json();

    const FALLBACK_AI_KEY = Deno.env.get("AI_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? (FALLBACK_AI_KEY?.startsWith("gsk_") ? FALLBACK_AI_KEY : undefined);
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");
    const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-120b";
    const AI_URL = "https://api.groq.com/openai/v1/chat/completions";

    const systemPrompt = `You are VITH.AI, a contextual AI assistant for farmers in Kerala/India.
You are helping the farmer with this specific farm:
${farmContext}

Always respond directly to the user's questions based on the provided farm context.
If they ask what to do, refer to "Today's Actions" or "Risk Radar".
Do not invent information that is not in the context. If uncertain, clearly state it.
Keep answers concise, actionable, and friendly.

CRITICAL INSTRUCTION: Your response will be read aloud via Text-to-Speech. DO NOT use markdown tables, bolding, bullet points, or complex formatting. Write ONLY in simple, conversational paragraphs.

CRITICAL INSTRUCTION: Always respond in the language the user is speaking to you. If the user asks in Malayalam, reply in Malayalam. If they ask in English, reply in English. The user's preferred language is ${responseLanguage}. Use simple vocabulary that a farmer would understand.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []).map((m: any) => ({
        role: m.role,
        content: String(m.content)
      }))
    ];

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: aiMessages,
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: `AI provider error: ${response.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "I couldn't process that.";

    return new Response(JSON.stringify({ reply: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("farm-chat error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

export default function handler(req: Request) {
  return _handler(req);
}

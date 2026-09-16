export const config = { runtime: "edge" };

type Handler = (req: Request) => Response | Promise<Response>;
let _handler: Handler = () => new Response("not ready", { status: 500 });
const serve = (fn: Handler) => { _handler = fn; };
const Deno = {
  env: { get: (key: string): string | undefined => (process.env as Record<string, string | undefined>)[key] },
};
void Deno;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url, "http://localhost");
    const text = url.searchParams.get("text") || "";
    const lang = url.searchParams.get("lang") || "en";

    if (!text) {
      return new Response("Missing text", { status: 400, headers: corsHeaders });
    }

    // Proxy to Google Translate TTS
    // client=tw-ob is the standard unauthenticated client for small chunks
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    if (!response.ok) {
      throw new Error(`Google TTS returned ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000"
      }
    });

  } catch (error: any) {
    console.error("TTS error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});

// Polyfill for local dev
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  (globalThis as any).Deno = Deno;
}
export default _handler;

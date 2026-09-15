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
    const body = await req.json();
    const { fieldName, crop, area, location, lat, lon, ndviData, soilData, responseLanguage = "English" } = body;

    if (!lat || !lon) return new Response(JSON.stringify({ error: "lat and lon required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Parallel fetch: weather + AQI
    const [weatherRes, aqiRes, soilMoistRes] = await Promise.allSettled([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,rain&forecast_days=1&timezone=auto`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,european_aqi`),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_moisture_0_to_7cm&forecast_days=1&timezone=auto`),
    ]);

    const weather = weatherRes.status === "fulfilled" && weatherRes.value.ok ? (await weatherRes.value.json()).current : null;
    const aqiRaw = aqiRes.status === "fulfilled" && aqiRes.value.ok ? (await aqiRes.value.json()).current : null;
    const soilMoistRaw = soilMoistRes.status === "fulfilled" && soilMoistRes.value.ok ? await soilMoistRes.value.json() : null;
    const soilMoisture = soilMoistRaw?.hourly?.soil_moisture_0_to_7cm?.filter((v: any) => v != null)?.slice(-1)[0];
    const soilMoisturePct = soilMoisture != null ? Math.round(soilMoisture * 1000) / 10 : null;

    // Build AI context
    const ndvi = ndviData?.mean_ndvi;
    const ndviScore = ndviData?.vegetation_health_score;
    let context = `Farm: ${fieldName || 'Unknown'} | Crop: ${crop || 'Unknown'} | Area: ${area || '?'} acres | Location: ${location || `${lat},${lon}`}\n`;
    if (weather) context += `Weather: ${weather.temperature_2m}°C, humidity ${weather.relative_humidity_2m}%, wind ${weather.wind_speed_10m} km/h\n`;
    if (soilMoisturePct != null) context += `Soil Moisture: ${soilMoisturePct}%\n`;
    if (ndvi != null) context += `NDVI (Vegetation Health Index): ${ndvi} (Score: ${ndviScore}/100)\n`;
    if (soilData?.metrics) {
      const m = soilData.metrics;
      context += `Soil pH: ${m.ph || 'N/A'}, Organic Carbon: ${m.soc_g_per_kg || 'N/A'} g/kg, Nitrogen: ${m.nitrogen_g_per_kg || 'N/A'} g/kg\n`;
    }
    if (aqiRaw) context += `Air Quality Index: ${aqiRaw.european_aqi}, PM2.5: ${aqiRaw.pm2_5} µg/m³\n`;

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";
    const AI_URL = "https://api.groq.com/openai/v1/chat/completions";

    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    const prompt = `You are VITH.AI analyzing a farm in Kerala, India. Use the data below and respond in ${responseLanguage} for all human-facing text.

FARM DATA:
${context}

Return ONLY valid JSON in this exact structure:
{
  "health_score": <0-100, computed from vegetation+soil+moisture+weather>,
  "health_status": "<one word: Excellent/Good/Fair/Poor in ${responseLanguage}>",
  "risk_level": "<Low/Medium/High>",
  "main_concern": "<1-line most important issue in ${responseLanguage}>",
  "today_actions": [
    {"title": "<action title>", "description": "<why + how>", "icon": "💧"},
    {"title": "<action title>", "description": "<why + how>", "icon": "🌿"},
    {"title": "<action title>", "description": "<why + how>", "icon": "🔍"}
  ],
  "risk_radar": {
    "water_stress": "<Low/Medium/High>",
    "waterlogging": "<Low/Medium/High>",
    "heat_stress": "<Low/Medium/High>",
    "disease_risk": "<Low/Medium/High>"
  },
  "expert_analysis": "<2-3 paragraph technical markdown analysis for agricultural officers>",
  "confidence_pct": <60-95>
}

Kerala context: High rainfall region, monsoon June-September, crops like Coconut, Rubber, Pepper, Paddy, Banana typical. Account for waterlogging risk during heavy monsoon. Never invent sensor data not provided above. Express uncertainty where data is missing.`;

    let analysis: any = null;
    try {
      const aiRes = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: "You are VITH.AI, a Kerala-first farm intelligence assistant. Return ONLY valid JSON. No markdown, no code blocks." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        }),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        let content = aiData.choices?.[0]?.message?.content || "{}";
        content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
        try { analysis = JSON.parse(content); } catch { analysis = { health_score: 70, health_status: "Fair", risk_level: "Unknown", main_concern: "AI analysis temporarily unavailable", today_actions: [], risk_radar: { water_stress: "Unknown", waterlogging: "Unknown", heat_stress: "Unknown", disease_risk: "Unknown" }, expert_analysis: content, confidence_pct: 50 }; }
      }
    } catch (aiError) {
      console.error("AI call failed:", aiError);
    }

    // Fallback rule-based analysis if AI fails
    if (!analysis) {
      const sm = soilMoisturePct || 35;
      const temp = weather?.temperature_2m || 28;
      const humidity = weather?.relative_humidity_2m || 75;
      const waterStress = sm < 20 ? "High" : sm < 30 ? "Medium" : "Low";
      const waterlogging = sm > 45 ? "High" : sm > 38 ? "Medium" : "Low";
      const heatStress = temp > 38 ? "High" : temp > 35 ? "Medium" : "Low";
      const diseaseRisk = humidity > 85 && temp > 25 ? "High" : humidity > 75 ? "Medium" : "Low";
      const score = Math.round((ndviScore || 70) * 0.4 + Math.min(100, sm * 2) * 0.3 + (100 - Math.max(0, (temp - 28) * 5)) * 0.3);
      analysis = {
        health_score: Math.min(100, Math.max(0, score)),
        health_status: score > 80 ? "Good" : score > 60 ? "Fair" : "Poor",
        risk_level: waterStress === "High" || diseaseRisk === "High" ? "High" : "Medium",
        main_concern: waterStress === "High" ? "Low soil moisture — irrigation needed" : diseaseRisk === "High" ? "High humidity — monitor for disease" : "Farm conditions are moderate",
        today_actions: [
          { title: "Check Irrigation", description: `Soil moisture is ${sm}% — ${waterStress === 'High' ? 'irrigation recommended' : 'levels acceptable'}`, icon: "💧" },
          { title: "Monitor Crops", description: humidity > 80 ? "High humidity detected — inspect for fungal signs" : "Conditions are favorable for field work", icon: "🌿" },
          { title: "Weather Check", description: `Temperature ${temp}°C, humidity ${humidity}% — plan activities accordingly`, icon: "☀️" },
        ],
        risk_radar: { water_stress: waterStress, waterlogging, heat_stress: heatStress, disease_risk: diseaseRisk },
        expert_analysis: `**Field Analysis**\n\nVegetation index: ${ndvi || 'N/A'}. Soil moisture: ${sm}%. Temperature: ${temp}°C, humidity: ${humidity}%. Conditions are analyzed using available sensor data. Field verification recommended for crop-specific observations.`,
        confidence_pct: 65,
      };
    }

    return new Response(JSON.stringify({
      weather,
      aqi: aqiRaw,
      soil_moisture: soilMoisturePct,
      analysis,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("farm-intelligence error:", e);
    return new Response(JSON.stringify({ error: "SERVICE_UNAVAILABLE", fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

export default function handler(req: Request) { return _handler(req); }

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

    // DETERMINISTIC ENGINE
    const sm = soilMoisturePct || 35;
    const temp = weather?.temperature_2m || 28;
    const humidity = weather?.relative_humidity_2m || 75;
    const rain = weather?.rain || 0;
    const wind = weather?.wind_speed_10m || 5;
    const ndviScore = ndviData?.vegetation_health_score || 70;
    const ph = soilData?.metrics?.ph || 6.5;
    const nitrogen = soilData?.metrics?.nitrogen_g_per_kg || 1.5;

    // Risk Radar (Deterministic)
    const waterStress = sm < 20 ? "High" : sm < 30 ? "Medium" : "Low";
    const waterlogging = sm > 45 || rain > 20 ? "High" : sm > 38 ? "Medium" : "Low";
    const heatStress = temp > 36 ? "High" : temp > 33 ? "Medium" : "Low";
    const diseaseRisk = humidity > 85 && temp > 25 ? "High" : humidity > 75 ? "Medium" : "Low";

    // Farm Health Score (Deterministic)
    const moistureScore = Math.max(0, 100 - Math.abs(sm - 35) * 2.5);
    const climateScore = Math.max(0, 100 - Math.max(0, temp - 28) * 5 - (diseaseRisk === "High" ? 20 : 0));
    const vegetationScore = ndviScore;
    const soilScore = Math.max(0, 100 - Math.abs(ph - 6.5) * 15 - Math.max(0, 1.5 - nitrogen) * 30);
    const finalScore = Math.round((vegetationScore * 0.3) + (soilScore * 0.2) + (moistureScore * 0.25) + (climateScore * 0.25));
    const healthStatus = finalScore >= 80 ? "Excellent" : finalScore >= 60 ? "Good" : finalScore >= 40 ? "Fair" : "Poor";

    const components = {
      vegetation: Math.round(vegetationScore),
      soil: Math.round(soilScore),
      water: Math.round(moistureScore),
      climate: Math.round(climateScore),
    };

    // Generate Agronomy Actions deterministically
    const actions: any[] = [];
    
    // 1. Irrigation Advisor
    if (waterStress === "High") {
      actions.push({ title: "Irrigate Now", reason: `Soil moisture critically low (${sm}%). Water stress detected.`, type: "irrigation" });
    } else if (waterlogging === "High") {
      actions.push({ title: "Improve Drainage", reason: `Soil moisture high (${sm}%). Avoid watering to prevent root rot.`, type: "irrigation" });
    } else if (rain > 0) {
      actions.push({ title: "Rain Expected", reason: `Natural precipitation today (${rain}mm). Pause manual irrigation.`, type: "irrigation" });
    } else {
      actions.push({ title: "Wait to Irrigate", reason: `Moisture levels are optimal (${sm}%). Conserve water.`, type: "irrigation" });
    }

    // 2. Smart Fertilizer / Soil Advisor
    const targetCrop = (crop || "").toLowerCase();
    
    // Soil Amendment
    if (ph < 5.5) {
      actions.push({ title: "Apply Dolomite / Lime", reason: `Soil is highly acidic (pH ${ph}). Apply lime as per KAU guidelines to improve nutrient uptake.`, type: "soil" });
    }
    
    // Crop Specific Fertilizer
    // Rough estimates: 1 acre = ~70 coconut palms, ~150 rubber trees, ~1000 banana plants
    const acres = area || 1;
    
    if (targetCrop.includes("rubber") && nitrogen < 1.0) {
      const urea = Math.round(acres * 150 * 0.2); // ~200g per tree
      actions.push({ title: "Apply Nitrogen", reason: `Rubber demands nitrogen. Apply ~${urea}kg Urea across ${acres} acres during pre-monsoon.`, type: "fertilizer" });
    } else if (targetCrop.includes("coconut")) {
      const complex = Math.round(acres * 70 * 1.5); // ~1.5kg NPK per palm
      actions.push({ title: "Apply NPK (Coconut Mix)", reason: `For bearing palms, apply ~${complex}kg NPK mixture across ${acres} acres in split doses as per KAU schedule.`, type: "fertilizer" });
    } else if (targetCrop.includes("paddy") || targetCrop.includes("rice")) {
      const urea = Math.round(acres * 35); // ~35kg per acre for top dressing
      actions.push({ title: "Top-dress Fertilizer", reason: `Monitor tillering stage. Apply ~${urea}kg Urea across ${acres} acres if foliage shows yellowing.`, type: "fertilizer" });
    } else if (targetCrop.includes("pepper")) {
      const fym = Math.round(acres * 400 * 10); // 10kg per vine, 400 vines/acre
      actions.push({ title: "Apply Organic Manure", reason: `Apply ~${fym}kg FYM/compost across ${acres} acres. Supplement with NPK as per KAU schedule.`, type: "fertilizer" });
    } else if (targetCrop.includes("banana")) {
      const urea = Math.round(acres * 1000 * 0.1); // 100g per plant
      actions.push({ title: "Banana Fertilizer Split", reason: `Apply split dose of ~${urea}kg Urea across ${acres} acres at 2nd, 4th, and 6th month.`, type: "fertilizer" });
    } else {
      actions.push({ title: "Monitor Soil Nutrients", reason: `Current pH is ${ph}. Ensure crop-specific organic manure application.`, type: "soil" });
    }

    // 3. Spray Window Advisor
    if (rain > 0 || wind > 15) {
      actions.push({ title: "Delay Spraying", reason: `Not ideal for spraying. Rain (${rain}mm) or Wind (${wind}km/h) will cause chemical runoff/drift.`, type: "spray" });
    } else if (diseaseRisk === "High") {
      actions.push({ title: "Fungicide Window", reason: `High humidity (${humidity}%) elevates fungal risk. Weather is clear for prophylactic spraying.`, type: "spray" });
    }

    const topActions = actions.slice(0, 3);
    const mainConcern = waterStress === "High" ? "Critical water stress" : waterlogging === "High" ? "Waterlogging risk" : diseaseRisk === "High" ? "Elevated fungal disease risk" : "Farm conditions are stable";

    // AI EXPLANATION
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";
    const AI_URL = "https://api.groq.com/openai/v1/chat/completions";

    let finalAnalysis: any = {
      health_score: finalScore,
      health_status: healthStatus,
      components,
      risk_level: waterStress === "High" || waterlogging === "High" || diseaseRisk === "High" ? "High" : "Low",
      main_concern: mainConcern,
      today_actions: topActions.map(a => ({ title: a.title, description: a.reason, icon: "📋" })),
      risk_radar: { water_stress: waterStress, waterlogging, heat_stress: heatStress, disease_risk: diseaseRisk },
      expert_analysis: `**Deterministic Farm Analysis**\n\nScore computed from Vegetation (${ndviScore}), Moisture (${sm}%), Temp (${temp}°C).`,
      confidence_pct: 85
    };

    if (GROQ_API_KEY) {
      const prompt = `You are VITH.AI. I have deterministically calculated the farm health and top actions for a farm in Kerala.

DETERMINISTIC DATA:
- Crop: ${crop}
- Farm Health Score: ${finalScore}/100 (${healthStatus})
- Water Stress: ${waterStress}
- Waterlogging: ${waterlogging}
- Heat Stress: ${heatStress}
- Disease Risk: ${diseaseRisk}
- Main Concern: ${mainConcern}

ACTIONS TO EXPLAIN:
${JSON.stringify(topActions, null, 2)}

TASK:
Return ONLY valid JSON with no markdown formatting.
Translate and explain these deterministic findings into ${responseLanguage}. Do NOT invent new scores or new actions. Simply explain the ones provided above.

JSON STRUCTURE:
{
  "health_score": ${finalScore},
  "health_status": "<translated health_status>",
  "risk_level": "<translated risk_level>",
  "main_concern": "<translated and explained main_concern>",
  "today_actions": [
    {"title": "<translated title>", "description": "<translated reason with brief AI agronomy explanation>", "icon": "💧/🌱/🛡️/⚠️"}
  ],
  "risk_radar": {
    "water_stress": "<translated risk>",
    "waterlogging": "<translated risk>",
    "heat_stress": "<translated risk>",
    "disease_risk": "<translated risk>"
  },
  "expert_analysis": "<2 paragraph technical summary for agricultural officers in ${responseLanguage}. Include sensor data points.>",
  "confidence_pct": 85
}`;

      try {
        const aiRes = await fetch(AI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: "system", content: "You are VITH.AI. Strictly adhere to the deterministic values provided. Return ONLY JSON." },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 1500,
            response_format: { type: "json_object" }
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          let content = aiData.choices?.[0]?.message?.content || "{}";
          content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
          const parsed = JSON.parse(content);
          parsed.health_score = finalScore;
          parsed.components = components;
          parsed.confidence_pct = 85;
          finalAnalysis = parsed;
        }
      } catch (aiError) {
        console.error("AI translation failed, using deterministic fallback:", aiError);
      }
    }

    return new Response(JSON.stringify({
      weather,
      aqi: aqiRaw,
      soil_moisture: soilMoisturePct,
      analysis: finalAnalysis,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("farm-intelligence error:", e);
    return new Response(JSON.stringify({ error: "SERVICE_UNAVAILABLE", fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

export default function handler(req: Request) { return _handler(req); }

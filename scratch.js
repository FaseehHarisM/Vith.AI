import fs from 'fs';
let code = fs.readFileSync('api/analyze-field.ts', 'utf8');

const regex = /:\s*\`You are a concise precision agriculture expert[\s\S]*?\}\),\s*\}\);/g;

const replacement = `: \`You are a precision agriculture AI assistant for farmers in Kerala/India. Give a data-driven analysis for this field. Use simple, actionable language.
  
  **Field:** \${fieldName} | **Crop:** \${crop} | **Area:** \${area} acres | **Location:** \${location}
  **Weather:** \${temperature}°C, \${humidity}% humidity, \${windSpeed} km/h wind
  **Soil Moisture:** \${soilMoisture || "N/A"}% | **NDVI Estimate:** \${ndviEstimate || "0.55"}\${soilContext}\${aqiContext}
  
  Respond in EXACTLY this JSON structure. Provide all human-facing text in \${responseLanguage} (Malayalam if requested):
  {
    "health_score": 85,
    "health_status": "നല്ലത്",
    "risk_level": "Low/Medium/High",
    "main_concern": "A short 1-line phrase about the main issue to watch",
    "today_actions": [
      { "title": "Action title", "description": "Why to do this action today", "icon": "💧" },
      { "title": "Action title", "description": "Why to do this action today", "icon": "🌿" },
      { "title": "Action title", "description": "Why to do this action today", "icon": "🔍" }
    ],
    "risk_radar": {
      "water_stress": "Low/Medium/High",
      "heat_stress": "Low/Medium/High",
      "disease_risk": "Low/Medium/High",
      "soil_decline": "Low/Medium/High"
    },
    "expert_analysis": "Write a 3-paragraph markdown report for agricultural experts containing: Vegetation Health, Soil Health Analysis, Land Suitability, and Carbon Sustainability."
  }\`;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${GROQ_API_KEY}\`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are a precision agriculture expert. Return ONLY valid JSON if agricultural, or markdown if urban." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 3000,
        response_format: isUrban ? undefined : { type: "json_object" }
      }),
    });`;

if (!code.match(regex)) {
  console.log("Failed to match regex");
  process.exit(1);
}

code = code.replace(regex, replacement);

code = code.replace('const content = aiData.choices?.[0]?.message?.content || "";', 
`let content = aiData.choices?.[0]?.message?.content || "";
    if (!isUrban) {
      content = content.replace(/\`\`\`json\\s*/gi, "").replace(/\`\`\`\\s*/gi, "").trim();
      try { JSON.parse(content); } catch { throw new Error("AI returned invalid JSON"); }
    }`);

fs.writeFileSync('api/analyze-field.ts', code);
console.log('Success');

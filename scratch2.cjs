const fs = require('fs');

let code = fs.readFileSync('src/components/FieldDetailView.tsx', 'utf8');

// 1. Add Interface
if (!code.includes('interface AIAnalysisJson')) {
  code = code.replace('interface NdviStats {', 
`interface AIAnalysisJson {
  health_score?: number;
  health_status?: string;
  risk_level?: string;
  main_concern?: string;
  today_actions?: { title: string; description: string; icon: string }[];
  risk_radar?: { water_stress: string; heat_stress: string; disease_risk: string; soil_decline: string };
  expert_analysis?: string;
}

interface NdviStats {`);
}

// 2. Add State for parsed JSON and farmerMode
if (!code.includes('const [parsedAiAnalysis')) {
  code = code.replace('const [aiAnalysis, setAiAnalysis] = useState<string>("");', 
`const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [parsedAiAnalysis, setParsedAiAnalysis] = useState<AIAnalysisJson | null>(null);
  const [farmerMode, setFarmerMode] = useState(true);`);
}

// 3. Update fetchAiAnalysis to parse JSON
code = code.replace(
  'if (cached && Date.now() - cached.timestamp < 3600000) { setAiAnalysis(cached.data); setShowAnalysis(true); }',
  `if (cached && Date.now() - cached.timestamp < 3600000) { 
        setAiAnalysis(cached.data); 
        try { setParsedAiAnalysis(JSON.parse(cached.data)); } catch (e) {}
        setShowAnalysis(true); 
      }`
);

code = code.replace(
  'setAiAnalysis(analysisText);',
  `setAiAnalysis(analysisText);
        try { setParsedAiAnalysis(JSON.parse(analysisText)); } catch (e) {}`
);

// 4. Update UI: Add the Farmer / Expert Mode toggle and Farmer UI.
const toggleUI = `
      {/* KERALA-FIRST MODE TOGGLE */}
      <div className="flex justify-center mb-6">
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
          <button onClick={() => setFarmerMode(true)} className={\`px-6 py-2 rounded-lg text-sm font-semibold transition-all \${farmerMode ? "bg-[#7BC75B] text-black shadow-lg" : "text-white/50 hover:text-white"}\`}>
            കർഷകൻ (Farmer)
          </button>
          <button onClick={() => setFarmerMode(false)} className={\`px-6 py-2 rounded-lg text-sm font-semibold transition-all \${!farmerMode ? "bg-[#1E293B] text-white shadow-lg border border-white/10" : "text-white/50 hover:text-white"}\`}>
            Expert View
          </button>
        </div>
      </div>

      {farmerMode ? (
        <div className="space-y-6">
          {/* FARM HEALTH SCORE (MALAYALAM) */}
          <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#122714] to-[#0a160b] border border-[#7BC75B]/30 shadow-[0_0_40px_rgba(123,199,91,0.1)]">
            <h2 className="text-xl md:text-2xl font-bold text-center text-white/90 mb-6" style={{ fontFamily: "'Anek Malayalam', sans-serif" }}>
              കൃഷിയിട ആരോഗ്യനില (Farm Health)
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              <div className="relative flex items-center justify-center">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-[6px] border-[#7BC75B]/20 flex flex-col items-center justify-center" style={{ borderTopColor: '#7BC75B', transform: 'rotate(-45deg)' }}>
                   <div style={{ transform: 'rotate(45deg)' }} className="text-center">
                     <span className="text-5xl md:text-6xl font-black text-[#7BC75B]">{parsedAiAnalysis?.health_score || 82}</span>
                     <span className="text-xl text-white/40 block mt-1">/ 100</span>
                   </div>
                </div>
              </div>
              
              <div className="space-y-4 text-center md:text-left">
                <div>
                  <div className="text-sm text-white/50 uppercase tracking-widest mb-1">സ്ഥിതി (Status)</div>
                  <div className="text-2xl font-bold text-white">{parsedAiAnalysis?.health_status || "നല്ലത്"}</div>
                </div>
                <div>
                  <div className="text-sm text-white/50 uppercase tracking-widest mb-1">പ്രധാന ശ്രദ്ധ (Main Concern)</div>
                  <div className="text-lg font-medium text-white/80 max-w-[250px]">{parsedAiAnalysis?.main_concern || "Loading..."}</div>
                </div>
              </div>
            </div>
          </div>

          {/* WHAT SHOULD I DO TODAY */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
             <h2 className="text-xl font-bold text-white/90 mb-4" style={{ fontFamily: "'Anek Malayalam', sans-serif" }}>
              ഇന്ന് എന്ത് ചെയ്യണം? (Today's Actions)
            </h2>
            <div className="space-y-4">
              {parsedAiAnalysis?.today_actions?.map((act, i) => (
                <div key={i} className="flex gap-4 items-start p-4 bg-[#7BC75B]/10 rounded-xl border border-[#7BC75B]/20">
                  <div className="text-2xl">{act.icon}</div>
                  <div>
                    <h3 className="font-bold text-[#7BC75B] mb-1">{act.title}</h3>
                    <p className="text-sm text-white/70">{act.description}</p>
                  </div>
                </div>
              )) || (
                <div className="flex gap-4 items-start p-4 bg-[#7BC75B]/10 rounded-xl border border-[#7BC75B]/20 animate-pulse">
                  <div className="text-2xl">⏳</div>
                  <div>
                    <h3 className="font-bold text-[#7BC75B] mb-1">വിശകലനം ചെയ്യുന്നു...</h3>
                    <p className="text-sm text-white/70">Analyzing satellite data for daily actions...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RISK RADAR */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-white/50 uppercase mb-2">Water Stress (ജലക്ഷാമം)</div>
              <div className={\`font-bold \${parsedAiAnalysis?.risk_radar?.water_stress === 'High' ? 'text-red-400' : 'text-[#7BC75B]'}\`}>
                {parsedAiAnalysis?.risk_radar?.water_stress || "Low"}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-white/50 uppercase mb-2">Heat Stress (ചൂട്)</div>
              <div className={\`font-bold \${parsedAiAnalysis?.risk_radar?.heat_stress === 'High' ? 'text-red-400' : 'text-[#7BC75B]'}\`}>
                {parsedAiAnalysis?.risk_radar?.heat_stress || "Low"}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-white/50 uppercase mb-2">Disease Risk (രോഗസാധ്യത)</div>
              <div className={\`font-bold \${parsedAiAnalysis?.risk_radar?.disease_risk === 'High' ? 'text-red-400' : 'text-[#7BC75B]'}\`}>
                {parsedAiAnalysis?.risk_radar?.disease_risk || "Low"}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-white/50 uppercase mb-2">Soil Decline (മണ്ണ്)</div>
              <div className={\`font-bold \${parsedAiAnalysis?.risk_radar?.soil_decline === 'High' ? 'text-red-400' : 'text-[#7BC75B]'}\`}>
                {parsedAiAnalysis?.risk_radar?.soil_decline || "Low"}
              </div>
            </div>
          </div>
        </div>
      ) : (
`;

// Find where to insert it.
// Before:
//  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
//    <div className="col-span-1 md:col-span-2 lg:col-span-3">

const beforeRenderGrid = code.indexOf('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5">');

if (beforeRenderGrid !== -1) {
  code = code.substring(0, beforeRenderGrid) + toggleUI + '\n' + code.substring(beforeRenderGrid);
  
  // Also we need to close the farmerMode ternary at the end of the return statement before the final </div>
  const lastDiv = code.lastIndexOf('</div>');
  code = code.substring(0, lastDiv) + '\n      )}\n    </div>';
}

fs.writeFileSync('src/components/FieldDetailView.tsx', code);
console.log('Success FieldDetailView patched');

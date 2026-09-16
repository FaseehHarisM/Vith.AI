/* eslint-disable react-refresh/only-export-components */
import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguageCode = "en" | "ml";

export const APP_LANGUAGES: Array<{ code: AppLanguageCode; label: string; nativeLabel: string; aiName: string }> = [
  { code: "en", label: "English", nativeLabel: "English", aiName: "English" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം", aiName: "Malayalam (മലയാളം)" },
];

const LANGUAGE_STORAGE_KEY = "virdis-language";

interface LanguageContextValue {
  language: AppLanguageCode;
  languageName: string;
  setLanguage: (language: AppLanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readStoredLanguage(): AppLanguageCode {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return APP_LANGUAGES.some((language) => language.code === saved) ? (saved as AppLanguageCode) : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguageCode>(readStoredLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    languageName: APP_LANGUAGES.find((option) => option.code === language)?.aiName ?? "English",
    setLanguage,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

const DICTIONARY: Record<string, Record<string, string>> = {
  "Farm Health": { ml: "കൃഷിയിടത്തിന്റെ ആരോഗ്യം" },
  "What Changed?": { ml: "മാറ്റങ്ങൾ" },
  "Farm Risk Radar": { ml: "അപകടസാധ്യതകൾ" },
  "Today's Actions": { ml: "ഇന്നത്തെ നിർദ്ദേശങ്ങൾ" },
  "Planning & Insights": { ml: "ആസൂത്രണവും വിവരങ്ങളും" },
  "Expert View": { ml: "സാങ്കേതിക വിവരങ്ങൾ" },
  "Farmer View": { ml: "കർഷകർക്കുള്ള വിവരങ്ങൾ" },
  "Farm Map": { ml: "മാപ്പ്" },
  "Farms": { ml: "കൃഷിയിടങ്ങൾ" },
  "Current Weather": { ml: "കാലാവസ്ഥ" },
  "Refresh All Analysis": { ml: "വിവരങ്ങൾ പുതുക്കുക" },
  "AI Confidence": { ml: "AI ഉറപ്പ്" },
  "Satellite": { ml: "ഉപഗ്രഹം" },
  "Moisture": { ml: "ഈർപ്പം" },
  "Risk Level": { ml: "അപകടസാധ്യത" },
  "Vegetation": { ml: "വിളകൾ" },
  "Water Stress": { ml: "ജലക്ഷാമം" },
  "Heat Stress": { ml: "ചൂട്" },
  "Disease Risk": { ml: "രോഗസാധ്യത" },
  "Waterlogging": { ml: "വെള്ളക്കെട്ട്" },
  "Farm Analytics": { ml: "ഫാം അനലിറ്റിക്സ്" },
  "Crop Planning": { ml: "വിള ആസൂത്രണം" },
  "Mainly clear": { ml: "തെളിഞ്ഞ ആകാശം" },
  "Feels like": { ml: "അനുഭവപ്പെടുന്നത്" },
  "Start": { ml: "ആരംഭം" },
  "End": { ml: "അവസാനം" },
  "Compare": { ml: "താരതമ്യം ചെയ്യുക" },
  "Data may not always be accurate": { ml: "വിവരങ്ങൾ എപ്പോഴും കൃത്യമാകണമെന്നില്ല" },
  "All": { ml: "എല്ലാം" },
  "Ask in Malayalam or English...": { ml: "മലയാളത്തിലോ ഇംഗ്ലീഷിലോ ചോദിക്കുക..." },
  "My Farms": { ml: "എന്റെ കൃഷിയിടങ്ങൾ" },
  "farms": { ml: "കൃഷിയിടങ്ങൾ" },
  "Region Details": { ml: "പ്രാദേശിക വിവരങ്ങൾ" },
  "Area": { ml: "വിസ്തീർണ്ണം" },
  "Crop": { ml: "വിള" },
  "Location": { ml: "സ്ഥലം" },
  "Temperature": { ml: "താപനില" },
  "Humidity": { ml: "ഈർപ്പം" },
  "Wind": { ml: "കാറ്റ്" },
  "Condition": { ml: "അവസ്ഥ" },
  "Soil Moisture": { ml: "മണ്ണിലെ ഈർപ്പം" },
  "Soil Carbon Stock": { ml: "മണ്ണിലെ കാർബൺ" },
  "Erosion Risk": { ml: "മണ്ണൊലിപ്പ് സാധ്യത" },
  "Analyzing field data...": { ml: "വിവരങ്ങൾ വിശകലനം ചെയ്യുന്നു..." },
  "Using NDVI, soil, weather, water access, and terrain signals": { ml: "NDVI, മണ്ണ്, കാലാവസ്ഥ, ജലം, ഭൂപ്രകൃതി എന്നിവ ഉപയോഗിക്കുന്നു" },
  "Water Saved": { ml: "ലാഭിച്ച ജലം" },
  "Revenue Boost": { ml: "വരുമാന വർദ്ധനവ്" },
  "Zone Allocation": { ml: "മേഖലാ വിഭജനം" },
  "Soil Match": { ml: "മണ്ണുമായുള്ള അനുയോജ്യത" },
  "Climate Fit": { ml: "കാലാവസ്ഥാ അനുയോജ്യത" },
  "Water Demand": { ml: "ജലത്തിന്റെ ആവശ്യം" },
  "Estimated Input Cost": { ml: "പ്രതീക്ഷിക്കുന്ന ചിലവ്" },
  "Estimated Revenue": { ml: "പ്രതീക്ഷിക്കുന്ന വരുമാനം" },
  "Net Margin": { ml: "അറ്റാദായം" },
  "Spacing": { ml: "അകലം" },
  "Season": { ml: "സീസൺ" },
  "Intercropping": { ml: "ഇടവിള കൃഷി" },
  "Crop Rotation Plan": { ml: "വിള പരിക്രമണം" },
  "Download Plan": { ml: "പ്ലാൻ ഡൗൺലോഡ് ചെയ്യുക" },
  "Today": { ml: "ഇന്ന്" },
  "Lat": { ml: "അക്ഷാംശം" },
  "Lon": { ml: "രേഖാംശം" },
  "Based on organic carbon": { ml: "ജൈവ കാർബൺ അടിസ്ഥാനമാക്കി" },
  "Search farms...": { ml: "കൃഷിയിടങ്ങൾ തിരയുക..." },
  "Filter": { ml: "ഫിൽട്ടർ" },
  "Name": { ml: "പേര്" },
  "NDVI": { ml: "NDVI" },
  "No farms yet": { ml: "കൃഷിയിടങ്ങളൊന്നുമില്ല" },
  "No farms match": { ml: "കൃഷിയിടങ്ങൾ ലഭ്യമല്ല" },
  "All types": { ml: "എല്ലാം" },
  "farm": { ml: "കൃഷിയിടം" },
  "Clear sky": { ml: "തെളിഞ്ഞ ആകാശം" },
  "Partly cloudy": { ml: "ഭാഗികമായി മേഘാവൃതം" },
  "Overcast": { ml: "മേഘാവൃതം" },
  "Fog": { ml: "മൂടൽമഞ്ഞ്" },
  "Rime fog": { ml: "കനത്ത മൂടൽമഞ്ഞ്" },
  "Light drizzle": { ml: "ചെറിയ ചാറ്റൽ മഴ" },
  "Drizzle": { ml: "ചാറ്റൽ മഴ" },
  "Heavy drizzle": { ml: "ശക്തമായ ചാറ്റൽ മഴ" },
  "Slight rain": { ml: "ചെറിയ മഴ" },
  "Moderate rain": { ml: "മിതമായ മഴ" },
  "Heavy rain": { ml: "ശക്തമായ മഴ" },
  "Slight snow": { ml: "ചെറിയ മഞ്ഞുവീഴ്ച" },
  "Moderate snow": { ml: "മിതമായ മഞ്ഞുവീഴ്ച" },
  "Heavy snow": { ml: "ശക്തമായ മഞ്ഞുവീഴ്ച" },
  "Slight showers": { ml: "ചെറിയ മഴ" },
  "Moderate showers": { ml: "മിതമായ മഴ" },
  "Violent showers": { ml: "അതിശക്തമായ മഴ" },
  "Thunderstorm": { ml: "ഇടിമിന്നലോടു കൂടിയ മഴ" },
  "Unknown": { ml: "അജ്ഞാതം" },
  "Urban Region Analytics": { ml: "നഗര പ്രദേശ വിശകലനം" },
  "Live AI analysis completed and updated this crop plan.": { ml: "തത്സമയ AI വിശകലനം പൂർത്തിയായി വിള ആസൂത്രണം പുതുക്കി." },
  "Regional crop layout generated from NDVI, soil, rainfall, and water signals while live AI refinement runs in the background.": { ml: "തത്സമയ AI വിശകലനം പശ്ചാത്തലത്തിൽ നടക്കുന്നതിനിടെ NDVI, മണ്ണ്, മഴ, ജലം എന്നിവയിൽ നിന്ന് പ്രാദേശിക വിള ആസൂത്രണം തയ്യാറാക്കി." },
  "Live planner is unavailable right now, so this view is using the regional agronomy model with NDVI, soil, rainfall, and water signals.": { ml: "തത്സമയ പ്ലാനർ ഇപ്പോൾ ലഭ്യമല്ല, അതിനാൽ NDVI, മണ്ണ്, മഴ, ജലം എന്നിവ ഉപയോഗിച്ചുള്ള പ്രാദേശിക കൃഷി മാതൃകയാണ് ഇവിടെ ഉപയോഗിച്ചിരിക്കുന്നത്." },
  "Showing a cached regional agronomy plan for this field.": { ml: "ഈ കൃഷിയിടത്തിനായി മുമ്പ് തയ്യാറാക്കിയ പ്രാദേശിക വിള പ്ലാൻ കാണിക്കുന്നു." },
  "acres": { ml: "ഏക്കർ" },
  "Rain expected": { ml: "മഴ പ്രതീക്ഷിക്കുന്നു" },
  "Hot day": { ml: "ചൂടുള്ള ദിവസം" },
  "Good growing day": { ml: "നല്ല വളർച്ചാ ദിവസം" },
  "Avoid irrigation today — save water.": { ml: "ഇന്ന് നനയ്ക്കേണ്ടതില്ല - ജലം ലാഭിക്കുക." },
  "Inspect crops for fungal disease — high humidity.": { ml: "ഉയർന്ന ഈർപ്പം - കുമിൾ രോഗങ്ങൾ ഉണ്ടോയെന്ന് പരിശോധിക്കുക." },
  "Good conditions for field work and spraying.": { ml: "കൃഷിയിടത്തിലെ ജോലികൾക്കും മരുന്ന് തളിക്കുന്നതിനും അനുകൂലമായ സാഹചര്യം." },
  "Air & Water Quality": { ml: "വായു, ജല ഗുണനിലവാരം" },
  "Urban Environment Quality": { ml: "നഗര പരിസ്ഥിതി ഗുണനിലവാരം" },
  "EU AQI": { ml: "EU AQI" },
  "PM2.5": { ml: "PM2.5" },
  "Temp": { ml: "താപനില" },
  "Rain": { ml: "മഴ" },
  "Detailed Charts & Data": { ml: "വിശദമായ ചാർട്ടുകളും വിവരങ്ങളും" },
  "Loading live conditions...": { ml: "തത്സമയ വിവരങ്ങൾ ശേഖരിക്കുന്നു..." },
  "Weather unavailable": { ml: "കാലാവസ്ഥ ലഭ്യമല്ല" },
  "No farms to analyze": { ml: "വിശകലനം ചെയ്യാൻ കൃഷിയിടങ്ങളില്ല" },
  "Annual Rain": { ml: "വാർഷിക മഴ" },
  "Water Access": { ml: "ജല ലഭ്യത" },
  "Suitability score": { ml: "അനുയോജ്യത സ്കോർ" },
  "Regional Land Use": { ml: "പ്രാദേശിക ഭൂവിനിയോഗം" },
  "Precipitation": { ml: "മഴ" },
  "Max": { ml: "കൂടിയത്" },
  "Min": { ml: "കുറഞ്ഞത്" },
  "Crop Growth Indicators": { ml: "വിള വളർച്ചാ സൂചകങ്ങൾ" },
  "Select region to compare": { ml: "താരതമ്യം ചെയ്യാൻ പ്രദേശം തിരഞ്ഞെടുക്കുക" },
  "Urban": { ml: "നഗരം" },
  "Fair": { ml: "ശരാശരി" },
  "Good": { ml: "നല്ലത്" },
  "Poor": { ml: "മോശം" },
  "Very Poor": { ml: "വളരെ മോശം" },
  "Excellent": { ml: "മികച്ച" },
  "Rice": { ml: "നെല്ല്" },
  "Black Pepper": { ml: "കുരുമുളക്" },
  "Rubber": { ml: "റബർ" },
  "Coconut": { ml: "തെങ്ങ്" },
  "Tapioca": { ml: "കപ്പ" },
  "Cassava": { ml: "കപ്പ" },
  "Cardamom": { ml: "ഏലം" },
  "Residential": { ml: "വാസസ്ഥലം" },
  "Quick questions:": { ml: "ചോദ്യങ്ങൾ:" },
  "What is wrong with my farm?": { ml: "എന്റെ കൃഷിയിടത്തിന് എന്ത് പ്രശ്നമാണുള്ളത്?" },
  "Should I irrigate today?": { ml: "ഇന്ന് ഞാൻ നനയ്ക്കേണ്ടതുണ്ടോ?" },
  "What is the best crop for this soil?": { ml: "ഈ മണ്ണിന് ഏറ്റവും അനുയോജ്യമായ വിള ഏതാണ്?" },
  "Projected Economics (Per Year)": { ml: "പ്രതീക്ഷിക്കുന്ന സാമ്പത്തികം (പ്രതിവർഷം)" },
  "Urban Value": { ml: "നഗര മൂല്യം" },
  "Commercial yield and revenue estimates are not applicable for residential or urban zones.": { ml: "വാസസ്ഥലങ്ങൾക്കോ നഗര പ്രദേശങ്ങൾക്കോ വ്യാവസായിക വരുമാന കണക്കുകൾ ബാധകമല്ല." },
  "Based on local market rates &": { ml: "പ്രാദേശിക വിപണി വിലയെ അടിസ്ഥാനമാക്കി &" },
  "yield": { ml: "വിളവ്" },
  "Soil": { ml: "മണ്ണ്" },
  "Water": { ml: "വെള്ളം" },
  "Climate": { ml: "കാലാവസ്ഥ" },
};

export function useTranslation() {
  const { language } = useLanguage();
  const t = (text: string) => {
    if (language === "en") return text;
    return DICTIONARY[text]?.[language] || text;
  };
  return { t, language };
}

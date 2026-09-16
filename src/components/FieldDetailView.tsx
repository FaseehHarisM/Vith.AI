import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft, Droplets, Wind, Sprout, MapPin,
  Leaf, Brain, Loader2, Satellite, Building2,
  AlertTriangle, Layers, Share2, Shield, Activity,
} from "lucide-react";
import html2canvas from "html2canvas";
import { Field, haToAcres } from "@/data/fields";
import ReactMarkdown from "react-markdown";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { getFreshLocalCacheValue, hasSoilPayload, setLocalCache } from "@/lib/query-cache";
import { invokeWithRetry } from "@/lib/invoke-with-retry";
import { callBackend } from "@/lib/call-backend";
import { useLanguage } from "@/lib/language";
import MalayalamCopilot from "./MalayalamCopilot";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────────────
const URBAN_CROPS = ["Residential", "Commercial", "Park / Garden", "Industrial", "Mixed Use", "Rooftop / Terrace", "Community Garden"];
const SOIL_CACHE_KEY = "region-soil-cache";
const NDVI_CACHE_KEY = "region-ndvi-cache";
const CACHE_TTL = 60 * 60 * 1000;
const TEXTURE_COLORS = { sand: "#EAB947", silt: "#A0785A", clay: "#854F0B" };
const weatherCodes: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  80: "Slight showers", 81: "Moderate showers", 82: "Violent showers", 95: "Thunderstorm",
};

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface FieldDetailViewProps {
  field: Field;
  onBack: () => void;
  onEditBoundary?: () => void;
}

interface NdviStats {
  mean_ndvi: number;
  min_ndvi: number;
  max_ndvi: number;
  vegetation_health_score: number;
  acquisition_date: string;
  pixel_count: number;
}

interface SoilData {
  classification: { soil_class: string; wrb_name: string; icon: string; description: string; color: string };
  metrics: {
    ph: number | null; ph_rating: string;
    soc_g_per_kg: number | null; soc_rating: string;
    bulk_density: number | null;
    nitrogen_g_per_kg: number | null; nitrogen_rating: string;
    cec: number | null; coarse_fragments_pct: number | null;
  };
  texture: { sand_pct: number | null; silt_pct: number | null; clay_pct: number | null; usda_class: string | null };
  water_retention: { field_capacity_pct: number | null; wilting_point_pct: number | null; available_water_pct: number | null };
}

interface RiskRadar {
  water_stress: string;
  waterlogging: string;
  heat_stress: string;
  disease_risk: string;
}

interface TodayAction {
  title: string;
  description: string;
  icon: string;
}

interface FarmAnalysis {
  health_score: number;
  health_status: string;
  risk_level: string;
  main_concern: string;
  today_actions: TodayAction[];
  risk_radar: RiskRadar;
  expert_analysis: string;
  confidence_pct: number;
}

interface FarmWeather {
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  weather_code: number;
  precipitation?: number;
}

interface FarmIntelligence {
  weather: FarmWeather | null;
  aqi: { pm2_5: number; pm10: number; european_aqi: number } | null;
  soil_moisture: number | null;
  analysis: FarmAnalysis | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isUrbanField(field: Field) { return URBAN_CROPS.includes(field.crop); }

function riskColor(level: string): string {
  const l = (level || "").toLowerCase();
  if (l === "high") return "#ef4444";
  if (l === "medium") return "#f59e0b";
  if (l === "low") return "#22c55e";
  return "#6b7280";
}

function healthBadge(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "#22c55e" };
  if (score >= 65) return { label: "Good", color: "#7BC75B" };
  if (score >= 45) return { label: "Fair", color: "#f59e0b" };
  return { label: "Poor", color: "#ef4444" };
}

function getIntelCacheKey(fieldId: string, language: string) {
  return `vith-intel-v2-${fieldId}-${language}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FieldDetailView({ field, onBack, onEditBoundary }: FieldDetailViewProps) {
  const { language, languageName } = useLanguage();
  const [farmerMode, setFarmerMode] = useState(true);

  const [ndviStats, setNdviStats] = useState<NdviStats | null>(null);
  const [ndviLoading, setNdviLoading] = useState(false);

  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [soilLoading, setSoilLoading] = useState(false);

  const [intel, setIntel] = useState<FarmIntelligence | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);

  const [timeseries, setTimeseries] = useState<any>(null);
  const [timeseriesLoading, setTimeseriesLoading] = useState(false);

  const areaAcres = haToAcres(field.area);
  const urban = isUrbanField(field);

  const fieldCenter = useMemo(() => {
    const coords = field.coordinates[0];
    return {
      lat: coords.reduce((s, c) => s + c[1], 0) / coords.length,
      lng: coords.reduce((s, c) => s + c[0], 0) / coords.length,
    };
  }, [field]);

  // ── Fetch NDVI ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = getFreshLocalCacheValue<NdviStats>(NDVI_CACHE_KEY, field.id, CACHE_TTL);
    if (cached) { setNdviStats(cached); return; }
    setNdviLoading(true);
    invokeWithRetry<NdviStats>(
      "analyze-field",
      { polygon: field.coordinates[0] },
      { retries: 3, isEmpty: (d: any) => d?.mean_ndvi === undefined }
    ).then(data => {
      if (data?.mean_ndvi !== undefined) {
        setNdviStats(data as NdviStats);
        setLocalCache(NDVI_CACHE_KEY, field.id, data);
      }
    }).catch(e => console.error("NDVI error:", e))
      .finally(() => setNdviLoading(false));
  }, [field.id]);

  // ── Fetch Timeseries ─────────────────────────────────────────────────────────
  useEffect(() => {
    const cacheKey = "region-timeseries-v2-" + field.id;
    const cached = getFreshLocalCacheValue<any>(cacheKey, field.id, CACHE_TTL);
    if (cached) { setTimeseries(cached); return; }
    if (urban) return;
    
    setTimeseriesLoading(true);
    invokeWithRetry<any>(
      "ndvi-timeseries",
      { polygon: field.coordinates[0] },
      { retries: 2, isEmpty: (d: any) => !d?.timeseries?.length }
    ).then(data => {
      if (data?.timeseries?.length) {
        setTimeseries(data);
        setLocalCache(cacheKey, field.id, data);
      }
    }).catch(e => console.error("Timeseries error:", e))
      .finally(() => setTimeseriesLoading(false));
  }, [field.id, urban]);

  // ── Fetch Soil ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = getFreshLocalCacheValue<SoilData>(SOIL_CACHE_KEY, field.id, CACHE_TTL);
    if (cached) { setSoilData(cached); return; }
    setSoilLoading(true);
    invokeWithRetry<SoilData>(
      "soil-data",
      { lat: fieldCenter.lat, lon: fieldCenter.lng },
      { retries: 3, isEmpty: (d) => !hasSoilPayload(d) }
    ).then(data => {
      if (hasSoilPayload(data)) {
        setSoilData(data as SoilData);
        setLocalCache(SOIL_CACHE_KEY, field.id, data);
      }
    }).catch(e => console.error("Soil error:", e))
      .finally(() => setSoilLoading(false));
  }, [field.id, fieldCenter]);

  // ── Fetch Farm Intelligence ─────────────────────────────────────────────────
  const fetchIntelligence = useCallback(async (ndvi?: NdviStats | null, soil?: SoilData | null) => {
    setIntelLoading(true);
    setIntelError(null);
    try {
      const { data, error } = await callBackend<FarmIntelligence>("farm-intelligence", {
        fieldName: field.name,
        crop: field.crop,
        area: areaAcres,
        location: field.location,
        lat: fieldCenter.lat,
        lon: fieldCenter.lng,
        ndviData: ndvi ?? ndviStats,
        soilData: soil ?? soilData,
        responseLanguage: languageName,
      });
      if (error) throw new Error(String(error));
      if (data && !("error" in (data as object))) {
        setIntel(data);
        try {
          localStorage.setItem(getIntelCacheKey(field.id, language), JSON.stringify({ data, ts: Date.now() }));
        } catch { /* ignore quota errors */ }
      }
    } catch {
      setIntelError("Farm intelligence temporarily unavailable. Showing local estimate.");
    } finally {
      setIntelLoading(false);
    }
  }, [field, areaAcres, fieldCenter, languageName, language, ndviStats, soilData]);

  // Auto-load intelligence on mount (try cache first, then fetch)
  useEffect(() => {
    const cacheKey = getIntelCacheKey(field.id, language);
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.data && Date.now() - cached.ts < CACHE_TTL) {
          setIntel(cached.data);
          return;
        }
      }
    } catch { /* ignore */ }

    // Slight delay so NDVI/soil fetches can fire first
    const timer = setTimeout(() => fetchIntelligence(), 1200);
    return () => clearTimeout(timer);
  }, [field.id, language]);

  // ── Computed values ─────────────────────────────────────────────────────────
  const localScore = Math.round(
    (ndviStats?.vegetation_health_score || 65) * 0.4 +
    Math.min(100, (intel?.soil_moisture || 35) * 2) * 0.3 +
    (intel?.weather ? 80 : 60) * 0.3
  );
  const healthScore = intel?.analysis?.health_score ?? localScore;
  const badge = healthBadge(healthScore);

  const voiceText = intel?.analysis?.main_concern
    || intel?.analysis?.today_actions?.[0]?.description
    || "Farm analysis complete.";

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const el = document.getElementById("farm-report-card");
    if (!el) return;
    try {
      toast.info("Generating report...");
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#09090b" });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.download = `VITH_AI_${field.name.replace(/\s+/g, "_")}_Report.jpg`;
      link.click();
      toast.success("Report saved! Ready to share.");
    } catch { toast.error("Failed to generate report."); }
  };

  const soilTexture = soilData?.texture?.sand_pct != null ? [
    { name: "Sand", value: soilData.texture.sand_pct, color: TEXTURE_COLORS.sand },
    { name: "Silt", value: soilData.texture.silt_pct!, color: TEXTURE_COLORS.silt },
    { name: "Clay", value: soilData.texture.clay_pct!, color: TEXTURE_COLORS.clay },
  ] : null;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-card/95">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: field.color + "20", border: `1.5px solid ${field.color}40` }}>
            {urban
              ? <Building2 className="w-4 h-4" style={{ color: field.color }} />
              : <Sprout className="w-4 h-4" style={{ color: field.color }} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{field.name}</h2>
            <p className="text-xs text-muted-foreground">{field.crop} · {areaAcres} acres</p>
          </div>
        </div>
        <button onClick={handleExport}
          className="p-2 text-muted-foreground hover:text-[#7BC75B] transition-colors shrink-0"
          title="Share report">
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* ── MODE TOGGLE ────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="flex p-0.5 bg-muted/30 rounded-lg border border-border">
          <button
            onClick={() => setFarmerMode(true)}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${farmerMode
              ? "bg-[#7BC75B] text-black shadow-sm"
              : "text-muted-foreground hover:text-foreground"
            }`}>
            കർഷകൻ (Farmer)
          </button>
          <button
            onClick={() => setFarmerMode(false)}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${!farmerMode
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
            }`}>
            Expert View
          </button>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="farm-report-card">
        {farmerMode ? (
          /* ════════════════ FARMER MODE ════════════════ */
          <>
            {/* FARM HEALTH SCORE */}
            <div className="p-5 rounded-2xl border"
              style={{
                background: "linear-gradient(145deg, hsl(150 18% 11%), hsl(150 20% 9%))",
                borderColor: badge.color + "30",
              }}>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
                കൃഷിയിട ആരോഗ്യം (Farm Health)
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-5xl font-light tabular-nums" style={{ color: badge.color }}>
                    {healthScore}
                    <span className="text-lg text-muted-foreground ml-1">/100</span>
                  </div>
                  <div className="mt-1 text-sm font-medium" style={{ color: badge.color }}>
                    {intel?.analysis?.health_status || badge.label}
                  </div>
                  {intel?.analysis?.main_concern && (
                    <div className="mt-1.5 text-xs text-muted-foreground max-w-[175px] leading-relaxed">
                      {intel.analysis.main_concern}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {intel?.analysis?.confidence_pct && (
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground">AI Confidence</div>
                      <div className="text-sm font-semibold text-foreground">{intel.analysis.confidence_pct}%</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Deterministic Health Components */}
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[10px]">
                {[
                  { label: t("Vegetation"), val: intel?.analysis?.components?.vegetation ?? "?", color: "#66bd63" },
                  { label: t("Soil"), val: intel?.analysis?.components?.soil ?? "?", color: "#f59e0b" },
                  { label: t("Water"), val: intel?.analysis?.components?.water ?? "?", color: "#61AFEF" },
                  { label: t("Climate"), val: intel?.analysis?.components?.climate ?? "?", color: "#EAB947" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-black/20 rounded-md p-1.5 border border-white/5">
                    <div className="text-muted-foreground">{label}</div>
                    <div className="font-semibold text-xs mt-0.5" style={{ color }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* TODAY'S ACTIONS */}
            <div className="rounded-2xl border border-[#7BC75B]/20 bg-[#7BC75B]/5 p-4">
              <div className="text-[10px] font-medium text-[#7BC75B] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5" />
                ഇന്ന് എന്ത് ചെയ്യണം? (What To Do Today)
              </div>

              {intelLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing satellite + weather data…
                </div>
              ) : intel?.analysis?.today_actions?.length ? (
                <div className="space-y-3">
                  {intel.analysis.today_actions.slice(0, 3).map((action, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-[#7BC75B]/15 flex items-center justify-center shrink-0 text-base">
                        {action.icon}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{action.title}</div>
                        <div className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{action.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Rule-based fallback */
                <div className="space-y-3">
                  {[
                    { icon: "💧", title: "Check Irrigation", desc: (intel?.soil_moisture || 35) < 25 ? "Soil moisture is low — schedule irrigation soon." : "Soil moisture is adequate. Monitor over next 2 days." },
                    { icon: "🔍", title: "Inspect Crops", desc: "Walk the field and check for any visible disease, pest, or stress signs." },
                    { icon: "📅", title: "Plan Next Check", desc: "Schedule next satellite analysis in 5–7 days to detect trends." },
                  ].map((a, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-[#7BC75B]/15 flex items-center justify-center shrink-0 text-base">{a.icon}</div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{a.title}</div>
                        <div className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {intelError && (
                <div className="mt-2 text-[10px] text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {intelError}
                </div>
              )}

              {!intelLoading && (
                <button
                  onClick={() => fetchIntelligence()}
                  className="mt-3 text-[10px] text-muted-foreground hover:text-[#7BC75B] transition-colors underline">
                  Refresh AI analysis
                </button>
              )}
            </div>

            {/* WHAT CHANGED (Temporal Intelligence) */}
            {!urban && (
              <div className="rounded-2xl border border-border p-4 bg-accent/5">
                <div className="text-[10px] font-medium text-[#61AFEF] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5" />
                  മാറ്റങ്ങൾ (What Changed?)
                </div>
                {timeseriesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing 90-day satellite history…
                  </div>
                ) : timeseries?.timeseries?.length > 1 ? (
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">30 days ago</div>
                        <div className="text-lg font-medium">
                          {timeseries.timeseries[Math.max(0, timeseries.timeseries.length - 4)]?.ndvi.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex-1 px-4 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-muted-foreground/30 rotate-180" />
                        <div className="h-px bg-border flex-1 mx-2" />
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (timeseries.growth_rate || 0) < -0.001 ? "bg-red-500/20 text-red-400" :
                          (timeseries.growth_rate || 0) > 0.001 ? "bg-green-500/20 text-green-400" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {((timeseries.growth_rate || 0) * 30).toFixed(2)}
                        </div>
                        <div className="h-px bg-border flex-1 mx-2" />
                        <ArrowLeft className="w-4 h-4 text-muted-foreground/30 rotate-180" />
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">Today</div>
                        <div className="text-lg font-medium">
                          {timeseries.timeseries[timeseries.timeseries.length - 1]?.ndvi.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs leading-relaxed text-muted-foreground bg-background/50 p-3 rounded-xl border border-border">
                      {(timeseries.growth_rate || 0) < -0.001 
                        ? "Vegetation health has declined over the last month. This could indicate water stress, disease, or harvesting." 
                        : (timeseries.growth_rate || 0) > 0.001 
                        ? "Vegetation health is improving. Crop canopy is actively expanding." 
                        : "Vegetation health is stable. No significant stress detected in the last 30 days."}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Historical satellite data not available for this region.</div>
                )}
              </div>
            )}

            {/* RISK RADAR */}
            {!urban && (
              <div className="rounded-2xl border border-border p-4">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Farm Risk Radar
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: "Water Stress", key: "water_stress" as const, icon: "💧" },
                    { label: "Waterlogging", key: "waterlogging" as const, icon: "🌊" },
                    { label: "Heat Stress", key: "heat_stress" as const, icon: "🌡️" },
                    { label: "Disease Risk", key: "disease_risk" as const, icon: "🦠" },
                  ] as const).map(({ label, key, icon }) => {
                    const radar = intel?.analysis?.risk_radar as RiskRadar | undefined;
                    const level = radar?.[key] || (intelLoading ? "…" : "Unknown");
                    const color = riskColor(level);
                    return (
                      <div key={key} className="p-3 rounded-xl bg-muted/20 border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">{icon}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color, backgroundColor: color + "20" }}>
                            {level}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">{label}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Based on satellite, weather & soil data
                </div>
              </div>
            )}
          </>
        ) : (
          /* ════════════════ EXPERT MODE ════════════════ */
          <div className="space-y-4">

            {/* REGION INFO */}
            <div className="p-4 rounded-xl border border-border bg-accent/10">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Region Details</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground block">Area</span><span className="font-medium">{areaAcres} acres ({field.area.toFixed(2)} ha)</span></div>
                <div><span className="text-muted-foreground block">Crop</span><span className="font-medium">{field.crop}</span></div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Location</span>
                  <span className="font-medium flex items-center gap-1 mt-0.5 text-xs">
                    <MapPin className="w-3 h-3 shrink-0" />{field.location}
                  </span>
                </div>
                <div><span className="text-muted-foreground block">Lat</span><span className="font-medium">{fieldCenter.lat.toFixed(5)}</span></div>
                <div><span className="text-muted-foreground block">Lon</span><span className="font-medium">{fieldCenter.lng.toFixed(5)}</span></div>
              </div>
              {onEditBoundary && (
                <button onClick={onEditBoundary}
                  className="mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  Edit boundary
                </button>
              )}
            </div>

            {/* CURRENT CONDITIONS */}
            <div className="p-4 rounded-xl border border-border bg-accent/10">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Wind className="w-3 h-3" /> Current Conditions
              </div>
              {intel?.weather ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground block">Temperature</span><span className="font-medium">{Math.round(intel.weather.temperature_2m)}°C</span></div>
                  <div><span className="text-muted-foreground block">Humidity</span><span className="font-medium">{intel.weather.relative_humidity_2m}%</span></div>
                  <div><span className="text-muted-foreground block">Wind</span><span className="font-medium">{Math.round(intel.weather.wind_speed_10m)} km/h</span></div>
                  <div><span className="text-muted-foreground block">Condition</span><span className="font-medium">{weatherCodes[intel.weather.weather_code] || "Unknown"}</span></div>
                  {intel.soil_moisture != null && (
                    <div><span className="text-muted-foreground block">Soil Moisture</span><span className="font-medium">{intel.soil_moisture}%</span></div>
                  )}
                  {intel.aqi && (
                    <div><span className="text-muted-foreground block">Air Quality (EU AQI)</span><span className="font-medium">{intel.aqi.european_aqi}</span></div>
                  )}
                </div>
              ) : intelLoading ? (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading conditions…
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Weather data unavailable. Check connection.</div>
              )}
            </div>

            {/* SATELLITE NDVI */}
            <div className="p-4 rounded-xl border border-border bg-accent/10">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Satellite className="w-3 h-3" /> Vegetation Index (NDVI · Sentinel-2)
                </div>
                <button
                  onClick={() => {
                    setNdviLoading(true);
                    invokeWithRetry<NdviStats>("analyze-field", { polygon: field.coordinates[0] }, { retries: 2, isEmpty: (d: any) => d?.mean_ndvi === undefined })
                      .then(d => { if ((d as NdviStats)?.mean_ndvi !== undefined) { setNdviStats(d as NdviStats); setLocalCache(NDVI_CACHE_KEY, field.id, d); } })
                      .finally(() => setNdviLoading(false));
                  }}
                  disabled={ndviLoading}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline disabled:opacity-50">
                  {ndviLoading ? "Loading…" : "Refresh"}
                </button>
              </div>
              {ndviStats ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-light">{ndviStats.vegetation_health_score}<span className="text-xs text-muted-foreground">/100</span></span>
                    <span className="text-xs text-muted-foreground">NDVI Mean: {ndviStats.mean_ndvi.toFixed(3)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${ndviStats.vegetation_health_score}%`, background: "linear-gradient(90deg, #d73027, #fee08b, #66bd63, #006837)" }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    {[["Min", ndviStats.min_ndvi], ["Mean", ndviStats.mean_ndvi], ["Max", ndviStats.max_ndvi]].map(([k, v]) => (
                      <div key={k as string} className="p-2 rounded-lg bg-muted/20">
                        <div className="text-muted-foreground">{k as string}</div>
                        <div className="font-medium">{(v as number).toFixed(3)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>{ndviStats.acquisition_date}</span>
                    <span>{ndviStats.pixel_count} px</span>
                  </div>
                </div>
              ) : ndviLoading ? (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Querying Sentinel-2 imagery…
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No satellite data. Click Refresh.</div>
              )}
            </div>

            {/* SOIL HEALTH */}
            {soilLoading && (
              <div className="p-4 rounded-xl border border-border bg-accent/10 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching SoilGrids data…
              </div>
            )}
            {soilData && (
              <div className="p-4 rounded-xl border border-border bg-accent/10 space-y-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Soil Health (ISRIC SoilGrids)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{soilData.classification.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{soilData.classification.soil_class}</div>
                    <div className="text-[10px] text-muted-foreground">{soilData.classification.description}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Acidity (pH)", value: soilData.metrics.ph?.toFixed(1) || "N/A", sub: soilData.metrics.ph_rating },
                    { label: "Organic Carbon", value: soilData.metrics.soc_g_per_kg != null ? `${soilData.metrics.soc_g_per_kg} g/kg` : "N/A", sub: soilData.metrics.soc_rating },
                    { label: "Nitrogen", value: soilData.metrics.nitrogen_g_per_kg != null ? `${soilData.metrics.nitrogen_g_per_kg} g/kg` : "N/A", sub: soilData.metrics.nitrogen_rating },
                    { label: "Soil Texture", value: soilData.texture.usda_class || "N/A", sub: "" },
                    { label: "Compactness", value: soilData.metrics.bulk_density != null ? `${soilData.metrics.bulk_density} kg/dm³` : "N/A", sub: soilData.metrics.bulk_density != null ? (soilData.metrics.bulk_density > 1.6 ? "Too compact" : "Good structure") : "" },
                    { label: "Water Capacity", value: soilData.water_retention.available_water_pct != null ? `${soilData.water_retention.available_water_pct}%` : "N/A", sub: "Plant-available water" },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="p-2 rounded-lg bg-muted/20 text-xs">
                      <div className="text-muted-foreground text-[10px]">{label}</div>
                      <div className="font-medium mt-0.5">{value}</div>
                      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
                    </div>
                  ))}
                </div>
                {soilTexture && (
                  <div className="flex items-center gap-4 pt-1">
                    <ResponsiveContainer width={80} height={80}>
                      <PieChart>
                        <Pie data={soilTexture} dataKey="value" cx="50%" cy="50%" innerRadius={18} outerRadius={36} strokeWidth={0}>
                          {soilTexture.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1">
                      {soilTexture.map(e => (
                        <div key={e.name} className="flex items-center gap-2 text-[10px]">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: e.color }} />
                          <span className="text-muted-foreground">{e.name}</span>
                          <span className="ml-auto font-medium">{e.value?.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CARBON SUSTAINABILITY */}
            {soilData && !urban && (
              <div className="p-4 rounded-xl border border-border bg-accent/10 space-y-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Carbon & Sustainability
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground text-[10px]">Soil Carbon Stock</div>
                    <div className="font-medium">
                      {soilData.metrics.soc_g_per_kg != null
                        ? `${(soilData.metrics.soc_g_per_kg * 0.3 * (soilData.metrics.bulk_density || 1.3) * 10).toFixed(1)} t/ha`
                        : "N/A"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Top 30cm estimate</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Erosion Risk</div>
                    <div className="font-medium" style={{
                      color: soilData.metrics.soc_g_per_kg != null && soilData.metrics.soc_g_per_kg < 5 ? "#ef4444" : "#22c55e"
                    }}>
                      {soilData.metrics.soc_g_per_kg != null
                        ? (soilData.metrics.soc_g_per_kg < 5 ? "High" : soilData.metrics.soc_g_per_kg < 7.5 ? "Moderate" : "Low")
                        : "N/A"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Based on organic carbon</div>
                  </div>
                </div>
                {soilData.metrics.ph != null && (soilData.metrics.ph < 5.5 || soilData.metrics.ph > 8.0) && (
                  <div className="text-[10px] text-amber-400 flex items-start gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    pH {soilData.metrics.ph < 5.5 ? "is acidic" : "is alkaline"} — nutrient availability may be limited. Consider lime or soil amendments.
                  </div>
                )}
              </div>
            )}

            {/* AI EXPERT ANALYSIS */}
            {intel?.analysis?.expert_analysis ? (
              <div className="p-4 rounded-xl border border-border bg-accent/10">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Brain className="w-3 h-3" /> AI Technical Analysis (Groq · {intel.analysis.confidence_pct || 75}% confidence)
                </div>
                <div className="prose prose-sm prose-invert max-w-none
                  [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1
                  [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-2 [&_h3]:mb-1
                  [&_p]:text-[11px] [&_p]:text-muted-foreground [&_p]:leading-relaxed
                  [&_strong]:text-foreground [&_li]:text-[11px] [&_li]:text-muted-foreground">
                  <ReactMarkdown>{intel.analysis.expert_analysis}</ReactMarkdown>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  AI analysis — always verify critical decisions in field
                </div>
              </div>
            ) : intelLoading ? (
              <div className="p-4 rounded-xl border border-border bg-accent/10 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating AI analysis…
              </div>
            ) : null}

            {!intelLoading && (
              <button
                onClick={() => fetchIntelligence()}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors hover:bg-accent/20">
                Refresh All Analysis
              </button>
            )}
          </div>
        )}
      </div>

      {/* MALAYALAM COPILOT */}
      <MalayalamCopilot 
        field={field} 
        farmIntelligence={intel?.analysis} 
        weatherSummary={intel?.weather ? `${Math.round(intel.weather.temperature_2m)}°C, ${intel.weather.relative_humidity_2m}% humidity, ${weatherCodes[intel.weather.weather_code]}` : undefined}
      />
    </div>
  );
}

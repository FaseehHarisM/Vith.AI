import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sprout, Users, Landmark, Handshake, FlaskConical, Tractor, Building, Satellite, Brain, Activity, ShieldAlert, BadgeDollarSign, GitMerge, Map, Smartphone, ArrowRight } from "lucide-react";

const STAKEHOLDERS = [
  { icon: Users, label: "Farmers" },
  { icon: Landmark, label: "Krishi Bhavan" },
  { icon: Handshake, label: "FPOs" },
  { icon: FlaskConical, label: "KAU / KVK" },
  { icon: Tractor, label: "Agri-Tech" },
  { icon: Building, label: "NABARD" },
];

const FEATURES = [
  { icon: Satellite, title: "Satellite Intelligence", desc: "Real-time vegetation & land health from satellite imagery — no hardware needed" },
  { icon: Brain, title: "AI Crop Planner", desc: "Zone-level planting, intercropping & rotation plans powered by Groq LLM" },
  { icon: Activity, title: "Farm Health Score", desc: "0–100 score combining NDVI, soil, moisture & weather into one number" },
  { icon: ShieldAlert, title: "FPO / Officer Mode", desc: "District-level risk dashboard — monitor every farm at a glance" },
  { icon: BadgeDollarSign, title: "ROI Economics", desc: "Projected input cost, revenue & margin for every crop zone" },
  { icon: GitMerge, title: "Intercropping & Rotation", desc: "AI-optimized companion planting — Coconut + Pepper, Rubber + Cardamom" },
  { icon: Map, title: "Draw-to-Analyze", desc: "Draw any boundary on the map — get instant soil, climate & crop analysis" },
  { icon: Smartphone, title: "Works Everywhere", desc: "Mobile-first responsive design — works on any phone, tablet or desktop" },
];

const TECH = [
  "Google Earth Engine", "Sentinel-2", "SoilGrids", "Groq LLM",
  "Open-Meteo", "Mapbox GL", "React", "TypeScript",
  "Supabase", "Tailwind CSS"
];

export default function Landing() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [seedPulse, setSeedPulse] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 100);
    const t2 = setTimeout(() => setSeedPulse(true), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="min-h-screen bg-[#050f08] text-white overflow-x-hidden">
      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(123,199,91,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(123,199,91,0.04) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center top, rgba(123,199,91,0.12) 0%, transparent 70%)" }} />

      {/* ── NAV ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7BC75B]/20 border border-[#7BC75B]/40 flex items-center justify-center text-[#7BC75B]">
            <Sprout className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">VITH<span className="text-[#7BC75B]">.AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-[10px] text-white/30 border border-white/10 rounded-full px-3 py-1">AI Conclave 2026</span>
          <button onClick={() => navigate("/app")} className="text-sm text-[#7BC75B] border border-[#7BC75B]/40 px-4 py-2 rounded-lg hover:bg-[#7BC75B]/10 transition-all flex items-center gap-2">
            Open App <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 md:pt-20 pb-12">
        {/* Seed logo with pulse */}
        <div className="relative mb-8 flex items-center justify-center">
          {seedPulse && (
            <>
              <div className="absolute w-32 h-32 rounded-full border border-[#7BC75B]/20 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute w-24 h-24 rounded-full border border-[#7BC75B]/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
            </>
          )}
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7BC75B]/30 to-[#16A34A]/10 border border-[#7BC75B]/50 flex items-center justify-center text-[#7BC75B] shadow-xl shadow-[#7BC75B]/10">
            <Sprout className="w-10 h-10" />
          </div>
        </div>

        <div className={`mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#7BC75B]/30 bg-[#7BC75B]/10 text-[#7BC75B] text-xs font-medium transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#7BC75B] animate-pulse" />
          Satellite-Powered Agricultural Decision Support System
        </div>

        <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 transition-all duration-700 delay-100 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Every seed<br />
          <span className="text-[#7BC75B]">deserves intelligence.</span>
        </h1>

        <div className={`mb-6 transition-all duration-1000 delay-300 ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
          <h2 className="text-2xl md:text-3xl text-white/90 font-light" style={{ fontFamily: "'Anek Malayalam', sans-serif" }}>
            "<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7BC75B] to-[#b3e099] font-medium drop-shadow-[0_0_8px_rgba(123,199,91,0.5)]">വിത്തുഗുണം പത്തുഗുണം</span>"
          </h2>
          <p className="text-xs text-white/30 tracking-widest uppercase mt-2">Good seed, tenfold yield</p>
        </div>

        <p className={`text-base md:text-lg text-white/50 max-w-2xl mb-8 leading-relaxed transition-all duration-700 delay-200 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          VITH.AI translates satellite imagery, soil science & live weather into{" "}
          <strong className="text-white/80">simple daily actions</strong> — for farmers, FPOs, agricultural officers & agri-tech innovators.
        </p>

        <div className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-300 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <button onClick={() => navigate("/app")}
            className="group flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#7BC75B] text-[#050f08] font-bold text-base hover:bg-[#90d96e] transition-all shadow-[0_0_20px_rgba(123,199,91,0.3)] hover:shadow-[0_0_30px_rgba(123,199,91,0.5)] hover:scale-105">
            <Map className="w-5 h-5" /> Open My Farm
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-4 rounded-xl border border-white/10 text-white/70 font-medium text-base hover:border-white/30 hover:text-white transition-all bg-white/[0.02]">
            How It Works ↓
          </button>
        </div>
      </section>

      {/* ── WHO IS IT FOR ── */}
      <section className={`relative z-10 px-6 md:px-12 pb-14 transition-all duration-700 delay-400 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <p className="text-center text-xs text-white/30 uppercase tracking-widest mb-5">Built for the entire agricultural ecosystem</p>
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-3">
          {STAKEHOLDERS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 bg-white/[0.025] text-xs text-white/60">
                <Icon className="w-4 h-4 text-white/40" />{s.label}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 px-6 md:px-12 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">One platform. Every decision.</h2>
          <p className="text-white/40 text-center mb-10 text-sm">From satellite to soil to your next action — zero hardware required.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx}
                  className="p-5 rounded-xl border border-white/5 bg-white/[0.025] hover:border-[#7BC75B]/30 hover:bg-[#7BC75B]/5 transition-all group cursor-default">
                  <div className="mb-4 text-white/50 group-hover:text-[#7BC75B] transition-colors"><Icon className="w-6 h-6" /></div>
                  <div className="font-semibold text-sm text-white mb-2 group-hover:text-[#7BC75B] transition-colors">{f.title}</div>
                  <div className="text-[11px] text-white/40 leading-relaxed">{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section className="relative z-10 px-6 md:px-12 pb-16">
        <p className="text-center text-xs text-white/30 uppercase tracking-widest mb-5">Technology Stack</p>
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-2">
          {TECH.map(t => (
            <span key={t} className="px-3 py-1.5 rounded-lg border border-white/8 bg-white/[0.02] text-[11px] text-white/40 font-mono">{t}</span>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="relative z-10 px-6 md:px-12 pb-16 text-center">
        <div className="max-w-2xl mx-auto p-8 md:p-10 rounded-2xl border border-[#7BC75B]/20 bg-[#7BC75B]/5">
          <div className="flex justify-center mb-4 text-[#7BC75B]"><Sprout className="w-8 h-8" /></div>
          <h2 className="text-xl md:text-2xl font-bold mb-3">Ready to grow smarter?</h2>
          <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">Draw your farm boundary on the satellite map. Get instant analysis, AI crop planning & your Farm Health Score — in seconds.</p>
          <button onClick={() => navigate("/app")}
            className="flex items-center justify-center gap-2 mx-auto px-10 py-4 rounded-xl bg-[#7BC75B] text-[#050f08] font-bold text-sm hover:bg-[#90d96e] transition-all shadow-lg shadow-[#7BC75B]/20">
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-white/20">
        <span>VITH.AI · Satellite-Powered Agricultural Decision Support · AI Conclave 2026</span>
        <span className="italic">"വിത്തുഗുണം പത്തുഗുണം"</span>
      </footer>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Mic, Volume2, Square, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language";

interface VoiceAssistantProps {
  actionTextEn: string;
  farmName: string;
}

const TRANSLATIONS: Record<string, string> = {
  "Avoid irrigation today — save water.": "ഇന്ന് നനയ്ക്കുന്നത് ഒഴിവാക്കുക, വെള്ളം ലാഭിക്കുക.",
  "Inspect crops for fungal disease — high humidity.": "ഉയർന്ന ഈർപ്പം കാരണം ഫംഗസ് രോഗങ്ങൾ ഉണ്ടോ എന്ന് പരിശോധിക്കുക.",
  "Good conditions for field work and spraying.": "കൃഷിപ്പണികൾക്കും വളം ഇടുന്നതിനും ഇന്ന് നല്ല ദിവസമാണ്.",
};

export default function VoiceAssistant({ actionTextEn, farmName }: VoiceAssistantProps) {
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const synth = window.speechSynthesis;
  
  useEffect(() => {
    const loadVoices = () => setVoicesLoaded(true);
    synth.addEventListener("voiceschanged", loadVoices);
    if (synth.getVoices().length > 0) setVoicesLoaded(true);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, [synth]);

  const handleSpeak = () => {
    if (isPlaying) {
      synth.cancel();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    
    // Choose text based on language
    let textToSpeak = `${farmName}. ${actionTextEn}`;
    let langCode = "en-US";
    
    if (language === "ml") {
      const mlText = TRANSLATIONS[actionTextEn] || actionTextEn;
      textToSpeak = `${farmName} എന്ന കൃഷിയിടത്തിൽ, ${mlText}`;
      langCode = "ml-IN";
    } else if (language === "hi") {
      langCode = "hi-IN";
      textToSpeak = `${farmName}. ${actionTextEn}`; // Simplified fallback
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langCode;
    utterance.rate = 0.9; // Slightly slower for clarity
    
    // Try to find a native voice
    const voices = synth.getVoices();
    const voice = voices.find(v => v.lang.includes(langCode) || v.lang.includes(langCode.split('-')[0]));
    if (voice) utterance.voice = voice;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    synth.speak(utterance);
  };

  return (
    <button 
      onClick={handleSpeak}
      className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
        isPlaying 
          ? "bg-primary text-primary-foreground shadow-primary/40" 
          : "bg-accent hover:bg-accent/80 text-foreground border border-border"
      }`}
      title="Play audio summary"
    >
      {isPlaying ? (
        <Square className="w-4 h-4 fill-current" />
      ) : (
        <Volume2 className="w-5 h-5" />
      )}
      
      {/* Waveform ripple effect when playing */}
      {isPlaying && (
        <>
          <span className="absolute inset-0 rounded-full border border-primary animate-ping" style={{ animationDuration: "1.5s" }} />
          <span className="absolute inset-0 rounded-full border border-primary animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.5s" }} />
        </>
      )}
    </button>
  );
}

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Mic, MicOff, Send, X, Loader2, Sprout, StopCircle } from "lucide-react";
import { Field, haToAcres } from "@/data/fields";
import { callBackend } from "@/lib/call-backend";
import { useLanguage, useTranslation } from "@/lib/language";

interface MalayalamCopilotProps {
  field: Field;
  farmIntelligence?: {
    health_score?: number;
    risk_level?: string;
    main_concern?: string;
    today_actions?: { title: string; description: string }[];
    risk_radar?: { water_stress: string; waterlogging: string; heat_stress: string; disease_risk: string };
    expert_analysis?: string;
  } | null;
  weatherSummary?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const QUICK_QUESTIONS = [
  "What is wrong with my farm?",
  "Should I irrigate today?",
  "What is the best crop for this soil?"
];

export default function MalayalamCopilot({ field, farmIntelligence, weatherSummary }: MalayalamCopilotProps) {
  const { t } = useTranslation();
  const { languageName, language, setLanguage } = useLanguage();
  const [hasSelectedLang, setHasSelectedLang] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeech = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const areaAcres = haToAcres(field.area);

  // Check voice availability
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceAvailable(!!SpeechRecognition);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Build farm context for AI
  const buildFarmContext = () => {
    const parts = [
      `Farm: "${field.name}" | Crop: ${field.crop} | Area: ${areaAcres} acres | Location: ${field.location}`,
    ];
    if (farmIntelligence?.health_score) parts.push(`Farm Health Score: ${farmIntelligence.health_score}/100`);
    if (farmIntelligence?.risk_level) parts.push(`Risk Level: ${farmIntelligence.risk_level}`);
    if (farmIntelligence?.main_concern) parts.push(`Main Concern: ${farmIntelligence.main_concern}`);
    if (farmIntelligence?.risk_radar) {
      const r = farmIntelligence.risk_radar;
      parts.push(`Risk Radar — Water Stress: ${r.water_stress}, Waterlogging: ${r.waterlogging}, Heat: ${r.heat_stress}, Disease: ${r.disease_risk}`);
    }
    if (weatherSummary) parts.push(`Current Weather: ${weatherSummary}`);
    if (farmIntelligence?.today_actions?.length) {
      parts.push(`Today's Actions: ${farmIntelligence.today_actions.slice(0, 2).map(a => a.title).join(", ")}`);
    }
    return parts.join("\n");
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const GROQ_API_KEY = ""; // handled server-side
      const farmContext = buildFarmContext();

      const { data } = await callBackend<{ reply: string }>("farm-chat", {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        farmContext,
        responseLanguage: languageName,
      });

      const reply = (data as any)?.reply || "Sorry, I couldn't process that question. Please try again.";
      const assistantMsg: Message = { role: "assistant", content: reply, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);

      // Speak the response in Malayalam
      speakText(reply);
    } catch {
      const errMsg: Message = {
        role: "assistant",
        content: "Sorry, I'm temporarily unavailable. Please check your connection and try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string, forceLang?: string) => {
    // Stop any ongoing audio
    stopSpeech();
    setIsSpeaking(true);

    // Strip markdown formatting before speaking
    const spokenText = text.replace(/[#*|_-]/g, '').replace(/\n+/g, ' ');

    // Split text into chunks <= 100 chars to avoid Google TTS URI limits with Malayalam UTF-8 encoding
    const chunks: string[] = [];
    const words = spokenText.split(" ");
    let currentChunk = "";
    for (const word of words) {
      if ((currentChunk + " " + word).length > 100) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = word;
      } else {
        currentChunk = currentChunk ? currentChunk + " " + word : word;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    let currentIndex = 0;

    const playNextChunk = () => {
      if (currentIndex >= chunks.length) {
        setIsSpeaking(false);
        return;
      }
      const cText = chunks[currentIndex];
      const isMalayalam = /[\u0D00-\u0D7F]/.test(cText);
      const tl = forceLang || (isMalayalam ? "ml" : "en");

      const url = `/api/tts?lang=${tl}&text=${encodeURIComponent(cText)}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        currentIndex++;
        playNextChunk();
      };
      
      audio.play().catch(() => {
        // Fallback to browser speech if fetch fails
        if (currentIndex === 0 && window.speechSynthesis) {
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = tl === "ml" ? "ml-IN" : tl === "hi" ? "hi-IN" : "en-US";
          utter.onend = () => setIsSpeaking(false);
          utter.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utter);
        } else {
          setIsSpeaking(false);
        }
      });
    };

    playNextChunk();
  };

  const startListening = (langCode: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = langCode;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      // Try English fallback
      recognition.lang = "en-IN";
    };

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const openAndGreet = () => {
    setOpen(true);
    if (messages.length === 0) {
      const prompt = "Welcome! Please select your language / ദയവായി ഭാഷ തിരഞ്ഞെടുക്കുക";
      setMessages([{ role: "assistant", content: prompt, timestamp: Date.now() }]);
      speakText(prompt, "ml");
    }
  };

  const selectChatLanguage = (lang: "en" | "ml") => {
    setLanguage(lang);
    setHasSelectedLang(true);
    const greetingStr = lang === "ml" 
      ? `നമസ്കാരം! ഞാൻ VITH.AI ആണ്. "${field.name}" നെക്കുറിച്ച് ചോദിക്കൂ.` 
      : `Hello! I'm VITH.AI. Ask me anything about "${field.name}".`;
    setMessages([{ role: "assistant", content: greetingStr, timestamp: Date.now() }]);
    speakText(greetingStr, lang);
  };

  return (
    <>
      {/* FAB Trigger Button */}
      <button
        onClick={openAndGreet}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#7BC75B] text-black shadow-2xl shadow-[#7BC75B]/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        title="Ask VITH.AI"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed inset-x-4 bottom-24 md:inset-auto md:right-6 md:bottom-24 md:w-[360px] z-50 flex flex-col rounded-2xl border border-[#7BC75B]/20 shadow-2xl overflow-hidden"
          style={{ background: "hsl(150 20% 9%)", maxHeight: "70vh" }}>

          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border shrink-0"
            style={{ background: "hsl(150 18% 12%)" }}>
            <div className="w-8 h-8 rounded-full bg-[#7BC75B] flex items-center justify-center">
              <Sprout className="w-4 h-4 text-black" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground">VITH.AI കൃഷി സഹായി</div>
              <div className="text-[10px] text-muted-foreground">{field.name} • {field.crop}</div>
            </div>
            
            {isSpeaking && (
              <button onClick={stopSpeech} className="text-red-400 hover:text-red-300 transition-colors mr-1 flex items-center gap-1 text-[10px] bg-red-400/10 px-2 py-1 rounded-full">
                <StopCircle className="w-3.5 h-3.5" /> Stop
              </button>
            )}
            
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#7BC75B] text-black rounded-br-sm"
                      : "bg-muted/40 text-foreground rounded-bl-sm border border-border"
                  }`}
                  style={{ fontFamily: /[\u0D00-\u0D7F]/.test(msg.content) ? "'Anek Malayalam', sans-serif" : undefined }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/40 border border-border rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

                    {/* Language Selection or Quick questions */}
          {messages.length <= 1 && !hasSelectedLang ? (
            <div className="px-3 py-3 border-t border-border shrink-0">
              <div className="flex gap-2">
                <button onClick={() => selectChatLanguage('en')} className="flex-1 py-2 rounded-lg bg-[#7BC75B]/20 text-[#7BC75B] border border-[#7BC75B]/30 hover:bg-[#7BC75B]/30 text-sm font-medium transition-colors">English</button>
                <button onClick={() => selectChatLanguage('ml')} className="flex-1 py-2 rounded-lg bg-[#7BC75B]/20 text-[#7BC75B] border border-[#7BC75B]/30 hover:bg-[#7BC75B]/30 text-sm font-medium transition-colors">മലയാളം</button>
              </div>
            </div>
          ) : messages.length <= 1 && hasSelectedLang ? (
            <div className="px-3 py-2 border-t border-border shrink-0">
              <div className="text-[10px] text-muted-foreground mb-1.5">{t("Quick questions:")}</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground hover:bg-[#7BC75B]/20 hover:text-[#7BC75B] transition-colors text-left border border-border"
                  >
                    {t(q)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Input */}
          <div className="p-3 border-t border-border shrink-0 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder={t("Ask in Malayalam or English...")}
              className="flex-1 min-w-0 bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7BC75B]/50"
              disabled={loading}
            />
            {voiceAvailable && isListening && (
              <button
                onClick={stopListening}
                className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-red-500/20 text-red-400 border border-red-400/30"
              >
                <MicOff className="w-4 h-4" />
              </button>
            )}
            {voiceAvailable && !isListening && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startListening("ml-IN")} title="Speak in Malayalam" className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/30 text-muted-foreground border border-border hover:text-[#7BC75B] relative transition-colors">
                  <Mic className="w-4 h-4" />
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-[#7BC75B]">ML</span>
                </button>
                <button onClick={() => startListening("en-US")} title="Speak in English" className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/30 text-muted-foreground border border-border hover:text-[#61AFEF] relative transition-colors">
                  <Mic className="w-4 h-4" />
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-[#61AFEF]">EN</span>
                </button>
              </div>
            )}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-9 h-9 shrink-0 rounded-xl bg-[#7BC75B] text-black flex items-center justify-center disabled:opacity-40 transition-opacity hover:bg-[#6ab54d]"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

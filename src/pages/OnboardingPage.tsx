import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send } from "lucide-react";
import AuraAnimation from "@/components/onboarding/AuraAnimation";
import { LIFE_PRIORITIES, GUIDANCE_STYLES } from "@/lib/onboarding-constants";
import KundaliMark from "@/components/KundaliMark";
import LanguageSelector from "@/components/LanguageSelector";
import { LANGUAGE_STORAGE_KEY } from "@/i18n/languages";

interface OnboardingData {
  name: string;
  dateOfBirth: string;
  birthTime: string;
  birthplace: string;
  skipBirthTime: boolean;
  lifePriorities: string[];
  guidanceStyle: string;
}

type ChatMessage = {
  id: string;
  role: "app" | "user";
  content: string;
  widget?: "name-input" | "birth-form" | "priorities" | "guidance-style";
};

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const { user, session, isLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [languageChosen, setLanguageChosen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem(LANGUAGE_STORAGE_KEY);
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    dateOfBirth: "",
    birthTime: "",
    birthplace: "",
    skipBirthTime: false,
    lifePriorities: [],
    guidanceStyle: "balanced",
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Drip-feed pending messages with typing delay
  useEffect(() => {
    if (pendingMessages.length === 0) return;
    setIsTyping(true);
    const timer = setTimeout(() => {
      const [next, ...rest] = pendingMessages;
      setMessages((prev) => [...prev, next]);
      setPendingMessages(rest);
      setIsTyping(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [pendingMessages]);

  // Start chat on mount (after language is chosen)
  useEffect(() => {
    if (!languageChosen) return;
    setPendingMessages([
      { id: "welcome-1", role: "app", content: t("onboarding:welcome1", "Welcome to Kundali! 🙏") },
      { id: "welcome-2", role: "app", content: t("onboarding:welcome2", "Let's set up your personal cosmic engine. It takes about a minute.") },
      { id: "ask-name", role: "app", content: t("onboarding:askName", "What should I call you?"), widget: "name-input" },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageChosen]);

  const addMessages = useCallback((...msgs: ChatMessage[]) => {
    setPendingMessages((prev) => [...prev, ...msgs]);
  }, []);

  // Step handlers
  const handleNameSubmit = () => {
    if (!data.name.trim()) return;
    setStep(1);
    setMessages((prev) => [
      ...prev,
      { id: "user-name", role: "user", content: data.name.trim() },
    ]);
    addMessages(
      { id: "greet", role: "app", content: t("onboarding:greet", { name: data.name.trim() }) },
      { id: "ask-birth", role: "app", content: t("onboarding:askBirth"), widget: "birth-form" }
    );
  };

  const handleBirthSubmit = (skip: boolean) => {
    setStep(2);
    const summary = skip
      ? t("onboarding:skipBirthLabel")
      : `Born ${data.dateOfBirth}${data.birthTime && !data.skipBirthTime ? ` at ${data.birthTime}` : ""}${data.birthplace ? `, ${data.birthplace}` : ""}`;
    setMessages((prev) => [
      ...prev,
      { id: "user-birth", role: "user", content: summary },
    ]);
    addMessages(
      { id: "birth-ack", role: "app", content: skip ? t("onboarding:birthAckSkip") : t("onboarding:birthAckDone") },
      { id: "ask-priorities", role: "app", content: t("onboarding:askPriorities"), widget: "priorities" }
    );
  };

  const handlePrioritiesSubmit = () => {
    if (data.lifePriorities.length === 0) return;
    setStep(3);
    const labels = data.lifePriorities
      .map((id) => LIFE_PRIORITIES.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => `${p!.emoji} ${p!.label}`)
      .join(", ");
    setMessages((prev) => [
      ...prev,
      { id: "user-priorities", role: "user", content: labels },
    ]);
    addMessages(
      { id: "priorities-ack", role: "app", content: t("onboarding:prioritiesAck") },
      { id: "ask-style", role: "app", content: t("onboarding:askStyle"), widget: "guidance-style" }
    );
  };

  const handleStyleSubmit = () => {
    setStep(4);
    const style = GUIDANCE_STYLES.find((g) => g.id === data.guidanceStyle);
    setMessages((prev) => [
      ...prev,
      { id: "user-style", role: "user", content: style?.label || data.guidanceStyle },
    ]);
    addMessages(
      { id: "style-ack", role: "app", content: t("onboarding:styleAck") }
    );
    // Trigger save
    setTimeout(() => handleSave(), 800);
  };

  const togglePriority = (id: string) => {
    setData((prev) => {
      const current = prev.lifePriorities;
      if (current.includes(id)) {
        return { ...prev, lifePriorities: current.filter((p) => p !== id) };
      }
      if (current.length >= 3) return prev;
      return { ...prev, lifePriorities: [...current, id] };
    });
  };

  const handleSave = async () => {
    if (!user || !session) return;
    setIsSaving(true);
    setIsSynthesizing(true);

    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (data.birthplace) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.birthplace)}&limit=1`
          );
          const geo = await res.json();
          if (geo.length > 0) {
            latitude = parseFloat(geo[0].lat);
            longitude = parseFloat(geo[0].lon);
          }
        } catch { /* ignore geocoding errors */ }
      }

      const profileUpdate: Record<string, any> = {
        full_name: data.name || null,
        onboarding_completed: true,
        onboarding_preferences: {
          life_priorities: data.lifePriorities,
          current_state: "calm",
          guidance_style: data.guidanceStyle,
          dream_opt_in: true,
        },
      };

      if (data.dateOfBirth) profileUpdate.date_of_birth = data.dateOfBirth;
      if (data.birthTime && !data.skipBirthTime) profileUpdate.birth_time = data.birthTime;
      if (data.birthplace) profileUpdate.birthplace = data.birthplace;
      if (latitude != null) profileUpdate.latitude = latitude;
      if (longitude != null) profileUpdate.longitude = longitude;

      await supabase.from("profiles").update(profileUpdate).eq("user_id", user.id);

      // Small delay for the synthesis animation
      await new Promise((r) => setTimeout(r, 2000));
      navigate("/dashboard");
    } catch (e) {
      console.error("Onboarding save error:", e);
      navigate("/dashboard");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  // ── Language gate — must pick a language before the chat begins ──
  if (!languageChosen) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-6 animate-[fade-in-up_0.5s_ease-out]">
          <div className="flex flex-col items-center gap-3 text-center">
            <KundaliMark size={48} glow />
            <h1 className="font-serif text-2xl" style={{ color: "hsl(var(--gold))" }}>
              {t("onboarding:askLanguageTitle", "Which language feels like home?")}
            </h1>
            <p className="text-sm" style={{ color: "hsl(var(--text-secondary))" }}>
              {t("onboarding:askLanguageHelper", "Choose how Kundali should speak to you. You can change this anytime in your Profile.")}
            </p>
          </div>
          <LanguageSelector
            onChange={() => {
              // Mark explicit choice so we don't re-prompt
              try { localStorage.setItem(LANGUAGE_STORAGE_KEY + ".explicit", "1"); } catch {}
              setLanguageChosen(true);
            }}
          />
        </div>
      </div>
    );
  }


  // Synthesis screen
  if (isSynthesizing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-6">
        <AuraAnimation />
        <div className="text-center space-y-3">
          <p className="text-lg font-serif text-foreground">Setting up your cosmic engine…</p>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{ animation: "gentle-bounce 1s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Find the last widget message that's currently active (not yet answered)
  const activeWidget = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "app" && messages[i].widget) {
        // Check if there's a user response after this widget
        const hasResponse = messages.slice(i + 1).some((m) => m.role === "user");
        if (!hasResponse) return messages[i].widget;
      }
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-500 ${
              i < step ? "w-2 bg-primary" : i === step ? "w-6 bg-primary" : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "app" ? (
              <div className="flex gap-3 items-start" style={{ animation: "fade-in-up 0.4s ease-out forwards" }}>
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <KundaliMark size={20} />
                </div>
                <div className="glass-card rounded-2xl rounded-tl-sm p-3.5 max-w-[85%]">
                  <p className="text-sm text-foreground">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-end" style={{ animation: "fade-in-up 0.3s ease-out forwards" }}>
                <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm p-3.5 max-w-[85%]">
                  <p className="text-sm text-foreground">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <KundaliMark size={20} />
            </div>
            <div className="glass-card rounded-2xl rounded-tl-sm p-3.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                    style={{ animation: "gentle-bounce 1s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active widget inline */}
        {activeWidget === "name-input" && !isTyping && (
          <div className="flex justify-end" style={{ animation: "fade-in-up 0.4s ease-out forwards" }}>
            <div className="bg-primary/5 border border-primary/15 rounded-2xl rounded-tr-sm p-4 w-full max-w-[85%] space-y-3">
              <Input
                ref={nameInputRef}
                autoFocus
                placeholder="Your name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                className="bg-background/50 border-border/30 text-sm"
              />
              <Button size="sm" className="w-full gap-2" disabled={!data.name.trim()} onClick={handleNameSubmit}>
                <Send className="h-3.5 w-3.5" /> Continue
              </Button>
            </div>
          </div>
        )}

        {activeWidget === "birth-form" && !isTyping && (
          <div className="flex justify-end" style={{ animation: "fade-in-up 0.4s ease-out forwards" }}>
            <div className="bg-primary/5 border border-primary/15 rounded-2xl rounded-tr-sm p-4 w-full max-w-[85%] space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                <Input
                  type="date"
                  value={data.dateOfBirth}
                  onChange={(e) => setData({ ...data, dateOfBirth: e.target.value })}
                  className="bg-background/50 border-border/30 text-sm"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Time of Birth</Label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="text-[11px] text-muted-foreground">Don't know</span>
                    <Switch
                      checked={data.skipBirthTime}
                      onCheckedChange={(checked) => setData({ ...data, skipBirthTime: checked, birthTime: checked ? "" : data.birthTime })}
                    />
                  </label>
                </div>
                {!data.skipBirthTime && (
                  <Input
                    type="time"
                    value={data.birthTime}
                    onChange={(e) => setData({ ...data, birthTime: e.target.value })}
                    className="bg-background/50 border-border/30 text-sm"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("onboarding:labelBirthplace")}</Label>
                <Input
                  placeholder={t("onboarding:placeholderBirthplace")}
                  value={data.birthplace}
                  onChange={(e) => setData({ ...data, birthplace: e.target.value })}
                  className="bg-background/50 border-border/30 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground" onClick={() => handleBirthSubmit(true)}>
                  {t("onboarding:skipBtn")}
                </Button>
                <Button size="sm" className="flex-1 gap-2" onClick={() => handleBirthSubmit(false)}>
                  <Send className="h-3.5 w-3.5" /> {t("onboarding:continueBtn")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeWidget === "priorities" && !isTyping && (
          <div className="flex justify-end" style={{ animation: "fade-in-up 0.4s ease-out forwards" }}>
            <div className="bg-primary/5 border border-primary/15 rounded-2xl rounded-tr-sm p-4 w-full max-w-[85%] space-y-3">
              <div className="flex flex-wrap gap-2">
                {LIFE_PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePriority(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      data.lifePriorities.includes(p.id)
                        ? "bg-primary text-primary-foreground shadow-md"
                        : data.lifePriorities.length >= 3
                        ? "bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
                        : "bg-card border border-border/50 text-foreground hover:border-primary/40"
                    }`}
                    disabled={!data.lifePriorities.includes(p.id) && data.lifePriorities.length >= 3}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                {t("onboarding:selectedCount", { n: data.lifePriorities.length })}
              </p>
              <Button size="sm" className="w-full gap-2" disabled={data.lifePriorities.length === 0} onClick={handlePrioritiesSubmit}>
                <Send className="h-3.5 w-3.5" /> {t("onboarding:continueBtn")}
              </Button>
            </div>
          </div>
        )}

        {activeWidget === "guidance-style" && !isTyping && (
          <div className="flex justify-end" style={{ animation: "fade-in-up 0.4s ease-out forwards" }}>
            <div className="bg-primary/5 border border-primary/15 rounded-2xl rounded-tr-sm p-4 w-full max-w-[85%] space-y-3">
              {GUIDANCE_STYLES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setData({ ...data, guidanceStyle: g.id })}
                  className={`w-full p-3 rounded-xl border text-left transition-all text-sm ${
                    data.guidanceStyle === g.id
                      ? "border-primary bg-primary/10"
                      : "border-border/40 bg-card/50 hover:border-primary/30"
                  }`}
                >
                  <p className={`font-medium text-xs ${data.guidanceStyle === g.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {g.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">{g.desc}</p>
                </button>
              ))}
              <Button size="sm" className="w-full gap-2" onClick={handleStyleSubmit}>
                <Send className="h-3.5 w-3.5" /> {t("onboarding:letsGoBtn")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

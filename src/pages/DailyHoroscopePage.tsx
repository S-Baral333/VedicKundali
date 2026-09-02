import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import AstroText from "@/components/AstroText";
import { useAuth } from "@/hooks/useAuth";
import { useActiveChart } from "@/hooks/useActiveChart";
import ReadingAsChip from "@/components/ReadingAsChip";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentLanguage } from "@/lib/i18nClient";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sun, Moon, Compass, Star, ArrowRight, RefreshCw, Loader2, Copy, Clock,
  AlertTriangle, TrendingUp, Zap, CheckCircle2, Eye, BookOpen, Flower2,
  Calendar, CalendarDays, Sparkles, ChevronDown, CloudRain, Heart
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import PillTabs, { type PillTabItem } from "@/components/PillTabs";
import DailyHeroCard from "@/components/horoscope/DailyHeroCard";
import YesterdayShiftCard from "@/components/horoscope/YesterdayShiftCard";
import ReactionStrip from "@/components/horoscope/ReactionStrip";
import JournalPin from "@/components/horoscope/JournalPin";
import SacredPageShell from "@/components/layout/SacredPageShell";
import PageNavRail from "@/components/layout/PageNavRail";
import CosmicFieldCard from "@/components/layout/CosmicFieldCard";
import NextRefreshBadge from "@/components/horoscope/NextRefreshBadge";
import RishiGuruBadge from "@/components/RishiGuruBadge";
import ThreeActsStrip from "@/components/horoscope/ThreeActsStrip";
import IfThenStrip from "@/components/horoscope/IfThenStrip";
import MicroRitualCard from "@/components/horoscope/MicroRitualCard";
import PersonalCallbackBanner from "@/components/horoscope/PersonalCallbackBanner";
import GuruCitationsFooter from "@/components/horoscope/GuruCitationsFooter";
import CosmicLoadingSkeleton from "@/components/horoscope/CosmicLoadingSkeleton";

type Period = "daily" | "tomorrow" | "weekly" | "monthly" | "yearly";
type Mood = "solar" | "lunar" | "fiery" | "mystic" | "earthen";

interface KeyDate { date: string; description: string; }
interface QuarterOverview { quarter: string; theme: string; guidance: string; }

interface TransitPlanet {
  name: string;
  sign: string;
  degree?: number;
  is_retrograde?: boolean;
}

interface NakOfDay { name: string; deity: string; symbol: string; }

interface DashaMeta {
  maha_dasha?: string;
  antar_dasha?: string;
  pratyantar_dasha?: string;
  maha_dasha_end?: string;
}

interface HoroscopeMeta {
  transits?: TransitPlanet[];
  tithi?: string;
  paksha?: string;
  tithi_meaning?: string;
  nakshatra_of_day?: NakOfDay;
  mood?: Mood;
  voice?: string;
  voice_label?: string;
  dasha?: DashaMeta | null;
  dasha_days_remaining?: number | null;
}

interface HoroscopeData {
  cosmic_headline?: string;
  period_theme?: string;
  greeting: string;
  watch_for: string;
  guidance: string;
  planetary_story: string;
  emotional_forecast: string;
  energy_level: "high" | "moderate" | "low";
  best_hours?: string[];
  caution_hours?: string[];
  key_dates?: KeyDate[];
  quarterly_overview?: QuarterOverview[];
  action_items?: string[];
  mantra_of_the_day: string;
  remedial_tip: string;
  lucky_color: string;
  lucky_number: number;
  direction: string;
  risk_alerts?: string[];
  opportunity_flags?: string[];
  cosmic_advice: string;
  // embedded by edge function for resilience:
  transits?: TransitPlanet[];
  tithi?: string;
  paksha?: string;
  tithi_meaning?: string;
  nakshatra_of_day?: NakOfDay;
  mood?: Mood;
  voice_label?: string;
  mode?: "guru" | "standard";
  // Phase 4 upgrades:
  three_acts?: { morning?: string; afternoon?: string; evening?: string };
  micro_ritual?: string;
  if_then?: { when?: string; if?: string; then?: string }[];
  // Guru-mode exclusives:
  personal_callback?: string;
  life_area_lens?: { area: string; guidance: string }[];
  citations?: string[];
  dharmic_close?: string;
}

const PERIODS: Period[] = ["daily", "tomorrow", "weekly", "monthly", "yearly"];
const PERIOD_ICONS: Record<Period, typeof Sun> = { daily: Sun, tomorrow: Moon, weekly: Calendar, monthly: CalendarDays, yearly: Sparkles };

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

/* ─── Color name → hex map for lucky color swatches ─── */
const COLOR_MAP: Record<string, string> = {
  red: "#E05C3A", blue: "#4A90D9", green: "#4CAF50", yellow: "#FFD54F",
  gold: "#C9A84C", white: "#F0E6CE", orange: "#FF9800", pink: "#E91E63",
  purple: "#9C27B0", silver: "#C0C0C0", black: "#333333", brown: "#795548",
  indigo: "#3F51B5", violet: "#7B1FA2", cream: "#F5E8C0", maroon: "#880E4F",
  grey: "#9E9E9E", gray: "#9E9E9E", turquoise: "#26C6DA", coral: "#FF7043",
  saffron: "#FF9800", copper: "#B87333", bronze: "#CD7F32",
};

function getColorHex(colorName: string): string {
  const lower = colorName.toLowerCase().trim();
  return COLOR_MAP[lower] || "#C9A84C";
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeClientValidDate(p: Period): string {
  const now = new Date();
  if (p === "daily") return formatLocalDate(now);
  if (p === "tomorrow") { const t = new Date(now); t.setDate(t.getDate() + 1); return formatLocalDate(t); }
  if (p === "weekly") { const day = now.getDay(); const diff = day === 0 ? -6 : 1 - day; const mon = new Date(now); mon.setDate(mon.getDate() + diff); return formatLocalDate(mon); }
  if (p === "monthly") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return `${now.getFullYear()}-01-01`;
}

/* ─── Styled card wrapper with stagger ─── */
function GlassCard({ children, delay = 0, className = "", style = {} }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`horo-glass-card sacred-reveal ${className}`}
      style={{ animationDelay: `${delay}s`, ...style }}
    >
      {children}
    </div>
  );
}

/* ─── Section label ─── */
function SectionLabel({ icon: Icon, children, color }: { icon: typeof Sun; children: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3" style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: color || "hsl(var(--gold))" }}>
      <Icon className="h-3.5 w-3.5" />
      <span>{children}</span>
      <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color || "hsl(var(--gold))"} 30%, transparent)`, opacity: 0.4 }} />
    </div>
  );
}

export default function DailyHoroscopePage() {
  const { t } = useTranslation("pages");
  const { user, session, isLoading } = useAuth();
  const { activeChart } = useActiveChart();
  const [period, setPeriod] = useState<Period>("daily");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [horoscope, setHoroscope] = useState<HoroscopeData | null>(null);
  const [meta, setMeta] = useState<HoroscopeMeta | null>(null);
  const [sign, setSign] = useState("");
  const [validDate, setValidDate] = useState("");
  const [moonSign, setMoonSign] = useState<string | null>(null);
  const [moonSignReady, setMoonSignReady] = useState(false);

  // Race guard: every fetchHoroscope call captures its own id; only the latest may write state.
  const requestIdRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive moon sign from active chart instead of "first chart"
  useEffect(() => {
    if (!user) { setMoonSignReady(true); return; }
    if (!activeChart) { setMoonSignReady(true); return; }
    const cd = activeChart.chart_data as Record<string, unknown> | null;
    setMoonSign((cd as any)?.moon_sign || (cd as any)?.moonSign || null);
    setMoonSignReady(true);
  }, [user, activeChart?.id]);

  // Build meta from a parsed horoscope (used as fallback when network meta missing — e.g. cache hits from older payloads)
  const metaFromHoroscope = useCallback((h: HoroscopeData | null, dasha: DashaMeta | null | undefined): HoroscopeMeta | null => {
    if (!h) return null;
    let daysRemaining: number | null = null;
    if (dasha?.maha_dasha_end) {
      const end = new Date(dasha.maha_dasha_end);
      const now = new Date();
      daysRemaining = Math.max(0, Math.round((end.getTime() - now.getTime()) / 86400000));
    }
    return {
      transits: h.transits,
      tithi: h.tithi,
      paksha: h.paksha,
      tithi_meaning: h.tithi_meaning,
      nakshatra_of_day: h.nakshatra_of_day,
      mood: h.mood,
      voice_label: h.voice_label,
      dasha: dasha || null,
      dasha_days_remaining: daysRemaining,
    };
  }, []);

  const fetchHoroscope = useCallback(async (selectedPeriod: Period) => {
    if (!user || !session) return;

    // Cancel any pending poll from a previous request and claim a new id.
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
    const myId = ++requestIdRef.current;
    const isLatest = () => myId === requestIdRef.current;

    const localDate = formatLocalDate(new Date());
    const periodValidDate = computeClientValidDate(selectedPeriod);
    const chartScope = activeChart?.id || "default";
    const cacheKey = `horoscope-v3-${selectedPeriod}-${periodValidDate}-${chartScope}`;
    const dasha: DashaMeta | null = (activeChart?.chart_data as any)?.dasha || null;

    // Defensive: strip any legacy `u:<uuid>:<sign>` cache-key form that may
    // have leaked into the `sign` field from older edge-function responses
    // or stale localStorage payloads. We only want the human moon-sign label.
    const cleanSign = (s?: string | null): string => {
      if (!s) return "General";
      if (s.startsWith("u:") || s.startsWith("U:")) return s.split(":").pop() || "General";
      return s;
    };

    // Helper: hydrate state from a parsed horoscope JSON (guarded by request id)
    const hydrate = (signVal: string, dateVal: string, parsed: HoroscopeData, respMeta: HoroscopeMeta | null) => {
      const display = cleanSign(signVal);
      try { localStorage.setItem(cacheKey, JSON.stringify({ sign: display, valid_date: dateVal, horoscope: parsed, meta: respMeta })); } catch {}
      if (!isLatest()) return;
      setSign(display);
      setValidDate(dateVal);
      setHoroscope(parsed);
      setMeta(respMeta);
      setFetchError(false);
    };


    // 1) Local cache → render instantly (stale-while-revalidate baseline)
    let hasCached = false;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        if (cachedData.horoscope?.guidance) {
          hydrate(cachedData.sign || "General", cachedData.valid_date || localDate, cachedData.horoscope, cachedData.meta || metaFromHoroscope(cachedData.horoscope, dasha));
          if (isLatest()) setLoading(false);
          hasCached = true;
        } else localStorage.removeItem(cacheKey);
      } catch { localStorage.removeItem(cacheKey); }
    }

    // 2) DB fast-path: ready row
    if (moonSign) {
      const { data: dbRow } = await supabase
        .from("daily_horoscopes")
        .select("content, status")
        .eq("sign_name", moonSign)
        .eq("valid_date", periodValidDate)
        .eq("period", selectedPeriod)
        .eq("language", getCurrentLanguage())
        .maybeSingle();
      if (!isLatest()) return;
      if (dbRow?.content && (dbRow as any).status !== "processing" && (dbRow as any).status !== "failed") {
        try {
          const parsed = typeof dbRow.content === "string" ? JSON.parse(dbRow.content) : dbRow.content;
          if (parsed.guidance) {
            hydrate(moonSign, periodValidDate, parsed, metaFromHoroscope(parsed, dasha));
            if (isLatest()) setLoading(false);
            return;
          }
        } catch {}
      }
    }

    // 3) Trigger generation (may return 200 with horoscope, or 202 processing)
    if (isLatest()) {
      if (hasCached) setRefreshing(true); else setLoading(true);
    }

    let triggered = false;
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-horoscope`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ local_date: localDate, period: selectedPeriod, chart_id: activeChart?.id, language: getCurrentLanguage() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!isLatest()) return;

      if (res.status === 202 || data?.status === "processing") {
        triggered = true;
        // fall through to polling below
      } else if (!res.ok) {
        if (!hasCached) {
          toast({ title: t("horoscope.toast.loadFailed"), description: data?.error || t("horoscope.toast.tryAgain"), variant: "destructive" });
          setFetchError(true);
        } else {
          toast({ title: t("horoscope.toast.refreshFailed"), description: t("horoscope.toast.showingCached"), variant: "default" });
        }
        setLoading(false); setRefreshing(false);
        return;
      } else if (data?.horoscope) {
        const signVal = data.sign || "General";
        const dateVal = data.valid_date || localDate;
        let parsedHoroscope: HoroscopeData;
        try { parsedHoroscope = typeof data.horoscope === "string" ? JSON.parse(data.horoscope) : data.horoscope; } catch {
          parsedHoroscope = { greeting: t("horoscope.fallback.greeting"), watch_for: "", guidance: data.horoscope || t("horoscope.fallback.guidance"), planetary_story: "", emotional_forecast: "", energy_level: "moderate", mantra_of_the_day: "", remedial_tip: "", lucky_color: "Gold", lucky_number: 7, direction: "East", cosmic_advice: t("horoscope.fallback.cosmicAdvice") };
        }
        hydrate(signVal, dateVal, parsedHoroscope, data.meta || metaFromHoroscope(parsedHoroscope, dasha));
        if (isLatest()) { setLoading(false); setRefreshing(false); }
        return;
      }
    } catch (e) {
      console.error(e);
      if (!isLatest()) return;
      if (!hasCached) {
        toast({ title: t("horoscope.toast.errorLoading"), variant: "destructive" });
        setFetchError(true);
      }
      setLoading(false); setRefreshing(false);
      return;
    }

    // 4) Poll daily_horoscopes table while job is processing
    if (triggered) {
      const targetSign = moonSign || "General";
      let attempts = 0;
      const maxAttempts = 20; // ~80s
      const poll = async () => {
        if (!isLatest()) return;
        attempts++;
        const { data: row } = await supabase
          .from("daily_horoscopes")
          .select("content, status")
          .eq("sign_name", targetSign)
          .eq("valid_date", periodValidDate)
          .eq("period", selectedPeriod)
          .eq("language", getCurrentLanguage())
          .maybeSingle();
        if (!isLatest()) return;

        if (row && (row as any).status === "ready" && row.content) {
          try {
            const parsed = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
            if (parsed.guidance) {
              hydrate(targetSign, periodValidDate, parsed, metaFromHoroscope(parsed, dasha));
              if (isLatest()) { setLoading(false); setRefreshing(false); }
              return;
            }
          } catch {}
        }

        if (row && (row as any).status === "failed") {
          if (!isLatest()) return;
          if (!hasCached) setFetchError(true);
          else toast({ title: "Couldn't refresh", description: "Showing your last reading.", variant: "default" });
          setLoading(false); setRefreshing(false);
          return;
        }

        if (attempts >= maxAttempts) {
          if (!isLatest()) return;
          if (!hasCached) {
            setFetchError(true);
            toast({ title: t("horoscope.toast.slowGeneration"), description: t("horoscope.toast.retryLater"), variant: "default" });
          }
          setLoading(false); setRefreshing(false);
          return;
        }
        pollTimerRef.current = setTimeout(poll, 4000);
      };
      pollTimerRef.current = setTimeout(poll, 4000);
    } else if (isLatest()) {
      setLoading(false); setRefreshing(false);
    }
  }, [user?.id, session?.access_token, moonSign, activeChart?.id, activeChart?.chart_data, metaFromHoroscope]);

  useEffect(() => {
    // GC: keep only entries for current valid dates across active chart (both v1 + v2 keys)
    const validKeys = new Set<string>();
    PERIODS.forEach(p => {
      validKeys.add(`horoscope-v3-${p}-${computeClientValidDate(p)}-${activeChart?.id || "default"}`);
    });
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("horoscope-") && !validKeys.has(key)) localStorage.removeItem(key);
    }
  }, [activeChart?.id]);

  useEffect(() => { if (!moonSignReady) return; fetchHoroscope(period); }, [period, fetchHoroscope, moonSignReady]);

  if (isLoading) return <HoroscopeSkeleton />;
  if (!user) return <Navigate to="/login" replace />;

  const handlePeriodChange = (val: string) => {
    const next = val as Period;
    if (next === period) return;
    // Optimistic clear so the new period's loader shows immediately
    setHoroscope(null);
    setMeta(null);
    setFetchError(false);
    setLoading(true);
    setPeriod(next);
  };

  const copyReading = async () => {
    if (!horoscope) return;
    let text = `${t(`horoscope.period.title.${period}`)} — ${sign !== "General" ? t("horoscope.subtitle.moonIn", { sign }) : "General"}\n${validDate}\n\n`;
    if (horoscope.greeting) text += `${horoscope.greeting}\n\n`;
    text += `${horoscope.guidance}\n\n`;
    if (horoscope.mantra_of_the_day) text += `Mantra: ${horoscope.mantra_of_the_day}\n`;
    text += `\nCosmic Advice: ${horoscope.cosmic_advice}`;
    await navigator.clipboard.writeText(text);
    toast({ title: t("horoscope.toast.copied") });
  };

  const formatDateSubtitle = () => {
    if (!validDate) return "";
    const d = new Date(validDate + "T00:00");
    if (period === "daily" || period === "tomorrow") return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (period === "weekly") { const end = new Date(d); end.setDate(end.getDate() + 6); return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`; }
    if (period === "monthly") return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return d.getFullYear().toString();
  };

  const energyColor = horoscope?.energy_level === "high" ? "#4CAF50" : horoscope?.energy_level === "low" ? "#E05C3A" : "#C9A84C";

  const liveTransits: TransitPlanet[] = meta?.transits && meta.transits.length > 0
    ? meta.transits
    : [];

  const dashaInfo = meta?.dasha || ((activeChart?.chart_data as any)?.dasha as DashaMeta | null);
  const dashaDays = meta?.dasha_days_remaining ?? null;

  const headerSubLine = (() => {
    const parts: string[] = [];
    if (dashaInfo?.maha_dasha) parts.push(`${dashaInfo.maha_dasha} Mahadasha`);
    if (dashaInfo?.antar_dasha) parts.push(`${dashaInfo.antar_dasha} Antardasha`);
    if (meta?.paksha && meta?.tithi) parts.push(`${meta.paksha} ${meta.tithi}`);
    return parts.join(" · ");
  })();

  return (
    <div className="min-h-screen relative" data-mood={meta?.mood || "solar"}>
      <div className="mood-halo" aria-hidden="true" />

      <SacredPageShell
        leftRail={<PageNavRail title={t("horoscope.navTitle")} hint={t("horoscope.navHint")} sections={[{ id: "planets", label: t("horoscope.navSection.planets") }, { id: "guidance", label: t("horoscope.navSection.guidance") }, { id: "actions", label: t("horoscope.navSection.actions") }]} />}
        rightRail={<CosmicFieldCard />}
        className="space-y-5"
      >

        {/* ─── 1. PLANET STRIP — real transits ─── */}
        {liveTransits.length > 0 && (
          <GlassCard delay={0.02} className="!p-0 overflow-hidden">
            <div className="grid grid-cols-4 sm:grid-cols-8">
              {liveTransits.slice(0, 8).map((p, i, arr) => (
                <div
                  key={p.name}
                  className="flex flex-col items-center py-3 px-1 transition-all duration-300 hover:bg-[hsl(var(--gold)/0.06)] cursor-default"
                  style={{ borderRight: i < arr.length - 1 ? "0.5px solid hsl(var(--gold) / 0.1)" : "none" }}
                  title={`${p.name} in ${p.sign}${p.is_retrograde ? " (retrograde)" : ""}`}
                >
                  <span className="text-lg leading-none" style={{ color: "hsl(var(--gold))" }}>
                    {PLANET_SYMBOLS[p.name] || "✦"}
                  </span>
                  <span className="text-[9px] font-medium tracking-[0.12em] uppercase mt-1" style={{ color: "hsl(var(--text-muted))" }}>
                    {p.name}{p.is_retrograde ? " (R)" : ""}
                  </span>
                  <span className="text-[13px] mt-0.5" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))" }}>{p.sign}</span>
                  {typeof p.degree === "number" && (
                    <span className="text-[9px]" style={{ color: "hsl(var(--text-muted) / 0.6)" }}>
                      {Math.floor(p.degree)}°{String(Math.round((p.degree % 1) * 60)).padStart(2, "0")}'
                    </span>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* ─── 2. PAGE HEADER ─── */}
        <div className="sacred-reveal" style={{ animationDelay: "0.06s" }}>
          <p className="text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "hsl(var(--text-muted))" }}>
            {sign !== "General" ? t("horoscope.subtitle.moonIn", { sign }) : t("horoscope.subtitle.generalGuidance")} · {formatDateSubtitle()}
          </p>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl md:text-[48px] font-light twinkle-aura" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold-pale))", lineHeight: 1.1 }}>
              {t(`horoscope.period.title.${period}`)}
            </h1>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title={t("horoscope.button.copyReading")} onClick={copyReading}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {headerSubLine && (
            <p className="text-[10px] tracking-[0.14em] uppercase mt-2" style={{ color: "hsl(var(--text-muted))" }}>
              {headerSubLine}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ReadingAsChip />
            <NextRefreshBadge period={period} />
            <RishiGuruBadge tooltip={t("horoscope.rishiTooltip")} />
            {refreshing && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: "hsl(var(--gold) / 0.06)",
                  border: "0.5px solid hsl(var(--gold) / 0.18)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "hsl(var(--text-muted))",
                }}
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("horoscope.button.refreshing")}
              </span>
            )}
          </div>
        </div>

        {/* ─── 3. DASHA STRIP — real values ─── */}
        {dashaInfo && (
          <GlassCard delay={0.1} className="!py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
              {[
                { label: t("horoscope.dasha.mahadasha"),    value: dashaInfo.maha_dasha || "—" },
                { label: t("horoscope.dasha.antardasha"),   value: dashaInfo.antar_dasha || "—" },
                { label: t("horoscope.dasha.pratyantar"),   value: dashaInfo.pratyantar_dasha || "—" },
                { label: t("horoscope.dasha.daysRemaining"), value: dashaDays != null ? String(dashaDays) : "—" },
              ].map((item, i) => (
                <div key={item.label} className="text-center py-2" style={{ borderRight: i < 3 ? "0.5px solid hsl(var(--gold) / 0.1)" : "none" }}>
                  <p className="text-[9px] tracking-[0.14em] uppercase" style={{ color: "hsl(var(--text-muted))" }}>{item.label}</p>
                  <p className={`mt-1 ${item.label === "Days Remaining" ? "text-2xl font-light" : "text-sm font-medium"}`} style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))" }}>{item.value}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* ─── DAILY HERO CARD (only daily/tomorrow) ─── */}
        {(period === "daily" || period === "tomorrow") && meta?.tithi && meta?.nakshatra_of_day && (
          <DailyHeroCard
            cosmicHeadline={horoscope?.cosmic_headline}
            tithi={meta.tithi}
            paksha={meta.paksha || ""}
            tithiMeaning={meta.tithi_meaning || ""}
            nakshatra={meta.nakshatra_of_day}
            mood={meta.mood || "solar"}
            voiceLabel={meta.voice_label || t("horoscope.voiceFallback")}
            signLabel={sign !== "General" ? t("horoscope.subtitle.moonIn", { sign }) : t("horoscope.subtitle.generalGuidance")}
            dateLabel={formatDateSubtitle()}
          />
        )}

        {/* ─── 4. TIME TABS ─── */}
        <div className="sacred-reveal" style={{ animationDelay: "0.14s" }}>
          <PillTabs
            items={PERIODS.map((p) => ({ value: p, label: t(`horoscope.period.label.${p}`), icon: PERIOD_ICONS[p] }))}
            value={period}
            onValueChange={handlePeriodChange}
          />
        </div>

        {/* ─── CONTENT ─── */}
        {loading && !horoscope ? (
          <CosmicLoadingSkeleton period={period} />
        ) : fetchError && !horoscope ? (
          <GlassCard delay={0.2} className="text-center !py-8">
            <p className="mb-3" style={{ color: "hsl(var(--text-muted))" }}>{t("horoscope.toast.loadFailed")}.</p>
            <Button variant="outline" onClick={() => fetchHoroscope(period)} className="border-primary/30 text-primary"><RefreshCw className="h-4 w-4 mr-2" /> {t("horoscope.toast.tryAgain")}</Button>
          </GlassCard>
        ) : horoscope ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-6">

            {/* ═══ LEFT COLUMN ═══ */}
            <div className="space-y-5">

              {/* a) Theme of the Day */}
              {horoscope.period_theme && (
                <GlassCard delay={0.18}>
                  <SectionLabel icon={Star}>
                    {period === "daily" ? t("horoscope.section.themeDay") : period === "tomorrow" ? t("horoscope.section.themeTomorrow") : period === "weekly" ? t("horoscope.section.themeWeek") : period === "monthly" ? t("horoscope.section.themeMonth") : t("horoscope.section.themeYear")}
                  </SectionLabel>
                  <p className="text-[1.05rem] italic leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--text-primary))" }}>
                    {horoscope.period_theme}
                  </p>
                </GlassCard>
              )}

              {/* b) Astrologer Quote (Greeting) */}
              {horoscope.greeting && (
                <GlassCard delay={0.22}>
                  <div className="relative py-2">
                    <span className="absolute -top-2 -left-1 text-[120px] leading-none select-none pointer-events-none" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold) / 0.07)" }}>"</span>
                    <p className="relative z-10 text-xl leading-[1.7] italic pl-4 twinkle-subtle" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--text-primary))" }}>
                      {horoscope.greeting}
                    </p>
                    <div className="mt-3 flex items-center gap-2 pl-4">
                      <span className="w-8 h-px" style={{ background: "hsl(var(--gold) / 0.4)" }} />
                      <span className="text-[10px] tracking-[0.14em] uppercase" style={{ color: "hsl(var(--gold))" }}>Your Astrologer</span>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* c) Full Reading */}
              <GlassCard delay={0.26}>
                <SectionLabel icon={BookOpen}>Full Reading</SectionLabel>

                {/* Guru-only: personal callback banner above the narrative */}
                {horoscope.mode === "guru" && horoscope.personal_callback && (
                  <div className="mb-4">
                    <PersonalCallbackBanner text={horoscope.personal_callback} />
                  </div>
                )}

                <div className="text-[1.02rem] leading-[1.85] whitespace-pre-line" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}>
                  <AstroText text={horoscope.guidance} />
                </div>

                {/* Three acts (daily/tomorrow only) */}
                {(period === "daily" || period === "tomorrow") && horoscope.three_acts && (
                  <div className="mt-5">
                    <ThreeActsStrip acts={horoscope.three_acts} />
                  </div>
                )}

                {/* If/Then choreography */}
                {(period === "daily" || period === "tomorrow") && !!horoscope.if_then?.length && (
                  <div className="mt-5">
                    <IfThenStrip items={horoscope.if_then} />
                  </div>
                )}

                {/* Micro ritual */}
                {(period === "daily" || period === "tomorrow") && horoscope.micro_ritual && (
                  <div className="mt-5">
                    <MicroRitualCard text={horoscope.micro_ritual} userId={user?.id} validDate={validDate} period={period} />
                  </div>
                )}

                {/* Guru-only: citations + life-area lens + dharmic close */}
                {horoscope.mode === "guru" && (
                  <GuruCitationsFooter
                    citations={horoscope.citations}
                    dharmicClose={horoscope.dharmic_close}
                    lifeAreaLens={horoscope.life_area_lens}
                  />
                )}
              </GlassCard>

              {/* d) Watch For Today — amber-tinted */}
              {horoscope.watch_for && (
                <GlassCard delay={0.3} style={{ background: "rgba(201,168,76,0.04)", borderColor: "rgba(201,168,76,0.22)" }}>
                  <SectionLabel icon={Eye}>
                    {period === "daily" ? t("horoscope.section.watchToday") : period === "tomorrow" ? t("horoscope.section.watchTomorrow") : period === "weekly" ? t("horoscope.section.watchWeek") : period === "monthly" ? t("horoscope.section.watchMonth") : t("horoscope.section.watchYear")}
                  </SectionLabel>
                  <p className="leading-[1.8] mb-3" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}><AstroText text={horoscope.watch_for} /></p>
                  {period === "daily" && user && (
                    <JournalPin userId={user.id} validDate={validDate} period={period} />
                  )}
                </GlassCard>
              )}

              {/* e) Cosmic Weather — blue-tinted */}
              {horoscope.planetary_story && (
                <GlassCard delay={0.34} style={{ background: "rgba(74,144,217,0.03)", borderColor: "rgba(74,144,217,0.15)" }}>
                  <SectionLabel icon={CloudRain} color="hsl(210 60% 60%)">Cosmic Weather</SectionLabel>
                  <p className="leading-[1.8]" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}><AstroText text={horoscope.planetary_story} /></p>
                </GlassCard>
              )}

              {/* f) How You'll Feel — purple-tinted */}
              {horoscope.emotional_forecast && (
                <GlassCard delay={0.38} style={{ background: "rgba(156,39,176,0.03)", borderColor: "rgba(156,39,176,0.15)" }}>
                  <SectionLabel icon={Zap} color="hsl(280 50% 60%)">
                    How You'll Feel
                  </SectionLabel>
                  <div className="space-y-2">
                    {horoscope.energy_level && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase" style={{ background: `${energyColor}15`, color: energyColor, border: `0.5px solid ${energyColor}30` }}>
                        {horoscope.energy_level} energy
                      </span>
                    )}
                    <p className="leading-[1.8]" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}><AstroText text={horoscope.emotional_forecast} /></p>
                  </div>
                </GlassCard>
              )}

              {/* g) Mantra */}
              {horoscope.mantra_of_the_day && (
                <GlassCard delay={0.42} className="text-center !py-8">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="w-12 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.5))" }} />
                    <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "hsl(var(--text-muted))" }}>
                      {period === "daily" || period === "tomorrow" ? t("horoscope.section.mantraDay") : period === "weekly" ? t("horoscope.section.mantraWeek") : period === "monthly" ? t("horoscope.section.mantraMonth") : t("horoscope.section.mantraYear")}
                    </span>
                    <span className="w-12 h-px" style={{ background: "linear-gradient(90deg, hsl(var(--gold) / 0.5), transparent)" }} />
                  </div>
                  <p className="text-2xl italic leading-[1.6] twinkle-aura" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))" }}>
                    {horoscope.mantra_of_the_day}
                  </p>
                </GlassCard>
              )}

              {/* h) Closing Wisdom */}
              {horoscope.cosmic_advice && (
                <GlassCard delay={0.46} className="text-center !py-8 relative overflow-hidden">
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[80px] leading-none pointer-events-none select-none" style={{ fontFamily: "serif", color: "hsl(var(--gold) / 0.05)" }}>ॐ</span>
                  <Compass className="h-5 w-5 mx-auto mb-4" style={{ color: "hsl(var(--gold))" }} />
                  <p className="text-lg italic leading-[1.7] relative z-10 max-w-md mx-auto" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--text-primary))" }}>
                    <AstroText text={horoscope.cosmic_advice} />
                  </p>
                  {(period === "daily" || period === "tomorrow") && user && validDate && (
                    <div className="mt-6 pt-6 border-t" style={{ borderColor: "hsl(var(--gold) / 0.12)" }}>
                      <ReactionStrip userId={user.id} validDate={validDate} period={period} />
                    </div>
                  )}
                </GlassCard>
              )}

              {/* Quarterly Overview (yearly) */}
              {horoscope.quarterly_overview && horoscope.quarterly_overview.length > 0 && (
                <div className="space-y-3 sacred-reveal" style={{ animationDelay: "0.48s" }}>
                  <SectionLabel icon={Compass}>Quarterly Breakdown</SectionLabel>
                  {horoscope.quarterly_overview.map((q, i) => (
                    <Collapsible key={i}>
                      <GlassCard className="!py-3 !px-4" style={{ borderLeft: "3px solid hsl(var(--gold) / 0.5)" }}>
                        <CollapsibleTrigger className="w-full flex items-center justify-between">
                          <div className="text-left">
                            <p className="text-sm font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--text-primary))" }}>{q.quarter}</p>
                            <p className="text-[10px] tracking-wider uppercase mt-0.5" style={{ color: "hsl(var(--text-muted))" }}>{q.theme}</p>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="h-px my-3" style={{ background: "linear-gradient(90deg, hsl(var(--gold) / 0.2), transparent)" }} />
                          <p className="text-sm leading-[1.8]" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}>{q.guidance}</p>
                        </CollapsibleContent>
                      </GlassCard>
                    </Collapsible>
                  ))}
                </div>
              )}
            </div>

            {/* ═══ RIGHT SIDEBAR ═══ */}
            <div className="space-y-5">

              {/* Yesterday → Today shift (daily only) */}
              {period === "daily" && liveTransits.length > 0 && validDate && (
                <YesterdayShiftCard
                  signName={sign || "General"}
                  todayTransits={liveTransits}
                  validDate={validDate}
                />
              )}

              {/* a) Best Hours — green-tinted */}
              {horoscope.best_hours && horoscope.best_hours.length > 0 && (
                <GlassCard delay={0.2} style={{ background: "rgba(76,175,80,0.03)", borderColor: "rgba(76,175,80,0.18)" }}>
                  <SectionLabel icon={Clock} color="#4CAF50">
                    {period === "daily" || period === "tomorrow" ? t("horoscope.section.bestHours") : t("horoscope.section.bestDays")}
                  </SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {horoscope.best_hours.map((h, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-xs" style={{ background: "rgba(76,175,80,0.1)", color: "#81C784", border: "0.5px solid rgba(76,175,80,0.2)" }}>{h}</span>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* b) Caution Hours — red-tinted */}
              {horoscope.caution_hours && horoscope.caution_hours.length > 0 && (
                <GlassCard delay={0.24} style={{ background: "rgba(224,92,58,0.03)", borderColor: "rgba(224,92,58,0.18)" }}>
                  <SectionLabel icon={AlertTriangle} color="#E05C3A">
                    {period === "daily" || period === "tomorrow" ? t("horoscope.section.cautionHours") : t("horoscope.section.challengingDays")}
                  </SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {horoscope.caution_hours.map((h, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-xs" style={{ background: "rgba(224,92,58,0.08)", color: "#EF9A9A", border: "0.5px solid rgba(224,92,58,0.2)" }}>{h}</span>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* c) Astrologer's Advice */}
              {horoscope.action_items && horoscope.action_items.length > 0 && (
                <GlassCard delay={0.28}>
                  <SectionLabel icon={CheckCircle2}>Astrologer's Advice</SectionLabel>
                  <ul className="space-y-2.5">
                    {horoscope.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}>
                        <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "hsl(var(--gold))" }} />
                        <AstroText text={item} />
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}

              {/* d) Today's Numerology — 3-column */}
              {(horoscope.lucky_color || horoscope.lucky_number || horoscope.direction) && (
                <GlassCard delay={0.32}>
                  <SectionLabel icon={Sparkles}>Today's Numerology</SectionLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Lucky Color with swatch */}
                    <div className="text-center">
                      <p className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "hsl(var(--text-muted))" }}>Lucky Color</p>
                      <div className="w-6 h-6 rounded-full mx-auto mb-1.5 border" style={{ background: getColorHex(horoscope.lucky_color), borderColor: "hsl(var(--gold) / 0.3)", boxShadow: `0 0 10px ${getColorHex(horoscope.lucky_color)}40` }} />
                      <p className="text-xs font-medium" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--text-primary))" }}>{horoscope.lucky_color}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "hsl(var(--text-muted))" }}>Lucky Number</p>
                      <p className="text-2xl font-light" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))" }}>{horoscope.lucky_number}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "hsl(var(--text-muted))" }}>Direction</p>
                      <Compass className="h-5 w-5 mx-auto mb-1" style={{ color: "hsl(var(--gold) / 0.6)" }} />
                      <p className="text-xs font-medium" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--text-primary))" }}>{horoscope.direction}</p>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* e) Opportunity — green-tinted */}
              {horoscope.opportunity_flags && horoscope.opportunity_flags.length > 0 && (
                <GlassCard delay={0.36} style={{ background: "rgba(76,175,80,0.03)", borderColor: "rgba(76,175,80,0.18)" }}>
                  <SectionLabel icon={TrendingUp} color="#4CAF50">Opportunities</SectionLabel>
                  <div className="space-y-2">
                    {horoscope.opportunity_flags.map((f, i) => (
                      <p key={i} className="text-sm leading-relaxed" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}>✨ {f}</p>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* f) Caution — red-tinted */}
              {horoscope.risk_alerts && horoscope.risk_alerts.length > 0 && (
                <GlassCard delay={0.4} style={{ background: "rgba(224,92,58,0.03)", borderColor: "rgba(224,92,58,0.18)" }}>
                  <SectionLabel icon={AlertTriangle} color="#E05C3A">Cautions</SectionLabel>
                  <div className="space-y-2">
                    {horoscope.risk_alerts.map((r, i) => (
                      <p key={i} className="text-sm leading-relaxed" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}>⚠️ {r}</p>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* g) Today's Remedy — purple-tinted */}
              {horoscope.remedial_tip && (
                <GlassCard delay={0.44} style={{ background: "rgba(156,39,176,0.03)", borderColor: "rgba(156,39,176,0.18)" }}>
                  <SectionLabel icon={Flower2} color="hsl(280 50% 60%)">
                    {period === "daily" ? t("horoscope.section.remedyDaily") : period === "tomorrow" ? t("horoscope.section.remedyTomorrow") : period === "weekly" ? t("horoscope.section.remedyWeekly") : period === "monthly" ? t("horoscope.section.remedyMonthly") : t("horoscope.section.remedyYearly")}
                  </SectionLabel>
                  <p className="text-sm leading-[1.8] whitespace-pre-line" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}>{horoscope.remedial_tip}</p>
                </GlassCard>
              )}

              {/* Key Dates */}
              {horoscope.key_dates && horoscope.key_dates.length > 0 && (
                <GlassCard delay={0.48}>
                  <SectionLabel icon={Calendar}>Key Dates</SectionLabel>
                  <div className="sacred-timeline space-y-4">
                    {horoscope.key_dates.map((kd, i) => (
                      <div key={i} className="relative pl-2">
                        <div className="sacred-timeline-dot" />
                        <p className="text-[10px] tracking-widest uppercase" style={{ color: "hsl(var(--gold))" }}>
                          {new Date(kd.date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        <p className="text-sm mt-0.5 leading-relaxed" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}>{kd.description}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* CTA for users without chart */}
              {sign === "General" && (
                <GlassCard delay={0.5} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--text-primary))" }}>{t("horoscope.cta.heading")}</p>
                    <p className="text-xs mt-0.5" style={{ color: "hsl(var(--text-muted))" }}>{t("horoscope.cta.body")}</p>
                  </div>
                  <Link to="/chart">
                    <Button size="sm" variant="outline" className="gap-1 border-primary/40 text-primary bg-transparent hover:bg-primary/10 shrink-0">
                      <Star className="h-4 w-4" /> {t("horoscope.cta.button")} <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </GlassCard>
              )}
            </div>
          </div>
        ) : null}
      </SacredPageShell>
    </div>
  );
}

function HoroscopeSkeleton() {
  return (
    <div className="space-y-5">
      {/* Planet strip skeleton */}
      <div className="horo-glass-card !p-0 overflow-hidden">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 py-3">
              <Skeleton className="h-5 w-5 rounded-full" style={{ background: "hsl(var(--ink-3))" }} />
              <Skeleton className="h-2 w-8" style={{ background: "hsl(var(--ink-3))" }} />
              <Skeleton className="h-3 w-10" style={{ background: "hsl(var(--ink-3))" }} />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-12 w-60" style={{ background: "hsl(var(--ink-3))" }} />
      <Skeleton className="h-4 w-40" style={{ background: "hsl(var(--ink-3))" }} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-6">
        <div className="space-y-5">
          <Skeleton className="h-24 w-full rounded-[20px]" style={{ background: "hsl(var(--ink-3))" }} />
          <Skeleton className="h-40 w-full rounded-[20px]" style={{ background: "hsl(var(--ink-3))" }} />
          <Skeleton className="h-28 w-full rounded-[20px]" style={{ background: "hsl(var(--ink-3))" }} />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-32 w-full rounded-[20px]" style={{ background: "hsl(var(--ink-3))" }} />
          <Skeleton className="h-24 w-full rounded-[20px]" style={{ background: "hsl(var(--ink-3))" }} />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-[20px]" style={{ background: "hsl(var(--ink-3))" }} />
            <Skeleton className="h-20 rounded-[20px]" style={{ background: "hsl(var(--ink-3))" }} />
            <Skeleton className="h-20 rounded-[20px]" style={{ background: "hsl(var(--ink-3))" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

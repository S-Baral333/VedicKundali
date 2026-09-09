import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useActiveChart } from "@/hooks/useActiveChart";
import { supabase } from "@/integrations/supabase/client";
import { withLanguage, getCurrentLanguage } from "@/lib/i18nClient";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Moon, Sun, Compass, Heart, Loader2, Sparkles, RefreshCw, Crown, Zap, ArrowRight } from "lucide-react";
import UsageIndicator from "@/components/UsageIndicator";
import { useSubscription } from "@/hooks/useSubscription";
import PaywallModal from "@/components/PaywallModal";
import SadeSatiTracker from "@/components/SadeSatiTracker";
import TodaysCosmosRail from "@/components/dashboard/TodaysCosmosRail";
import ContextRail from "@/components/dashboard/ContextRail";
import { LIFE_PRIORITIES } from "@/lib/onboarding-constants";
import RishiGuruBadge from "@/components/RishiGuruBadge";

function computeClientValidDate(p: string): string {
  const now = new Date();
  if (p === "daily") return now.toISOString().slice(0, 10);
  if (p === "tomorrow") {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  }
  if (p === "weekly") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(mon.getDate() + diff);
    return mon.toISOString().slice(0, 10);
  }
  if (p === "monthly") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  return `${now.getFullYear()}-01-01`;
}

interface ChartSummary { id: string; full_name: string; chart_data: any; }
interface DreamSummary { id: string; dream_category: string | null; dream_description: string; created_at: string; }
interface DashboardCache { chart: ChartSummary | null; dreams: DreamSummary[]; profileName: string; preferences: any; needsOnboarding: boolean; }

const CACHE_KEY = "dashboard-data";

function DashboardSkeleton() {
  return (
    <div className="sacred-wide py-14 space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="sacred-grid">
        <Skeleton className="h-64 rounded-2xl sacred-rail-left" />
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl sacred-rail-right" />
      </div>
    </div>
  );
}

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "greetingMorning";
  if (hour < 17) return "greetingAfternoon";
  return "greetingEvening";
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function HoroscopePreviewCard({ chartId }: { chartId: string | null }) {
  const { t } = useTranslation("pages");
  const localDate = new Date().toISOString().slice(0, 10);
  const cacheKey = chartId ? `horoscope-daily-${chartId}-${localDate}` : `horoscope-daily-${localDate}`;
  const cached = localStorage.getItem(cacheKey);

  if (!cached) {
    return (
      <Link to="/horoscope">
        <div className="glass-card-premium" style={{ borderStyle: "dashed" }}>
          <div className="flex items-center gap-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "hsl(var(--gold) / 0.15)", border: "0.5px solid hsl(var(--glass-border))" }}>✦</div>
            <div>
              <h3 className="font-medium" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", color: "hsl(var(--gold-light))" }}>{t("dashboard.todaysGuidanceTitle")}</h3>
              <p className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>{t("dashboard.todaysGuidanceTap")}</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  try {
    const data = JSON.parse(cached);
    const horoscope = data?.horoscope;
    const guidance = horoscope?.guidance || data?.guidance || data?.content;
    const energyLevel = horoscope?.energy_level;
    const actionItems = horoscope?.action_items || [];
    const bestHours = horoscope?.best_hours || [];

    const guidanceText = typeof guidance === 'string' ? guidance : (guidance ? JSON.stringify(guidance) : "");
    const pullQuote = actionItems[0] as string | undefined;

    return (
      <div className="glass-card-premium animate-fade-in-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontWeight: 500, color: "hsl(var(--gold-light) / 0.9)", letterSpacing: "0.02em" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "hsl(var(--gold) / 0.12)", border: "0.5px solid hsl(var(--gold) / 0.10)" }}>✦</div>
            {t("dashboard.cosmicGuidance")}
          </div>
          {energyLevel && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] tracking-wide" style={{ background: "hsl(var(--gold) / 0.10)", border: "0.5px solid hsl(var(--gold) / 0.18)", color: "hsl(var(--gold-light))" }}>
              {t("dashboard.energyLabel", { level: energyLevel })}
            </span>
          )}
        </div>
        {guidanceText && (
          <div className="dash-prose mb-5">
            <p>{guidanceText}</p>
            {pullQuote && (
              <p className="dash-pullquote">{pullQuote}</p>
            )}
          </div>
        )}
        {bestHours.length > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-5 text-[12.5px]" style={{ background: "hsl(var(--gold) / 0.06)", border: "0.5px solid hsl(var(--gold) / 0.14)", color: "hsl(var(--gold-light))", letterSpacing: "0.03em" }}>
            <span className="text-[9.5px] uppercase tracking-[0.22em]" style={{ color: "hsl(var(--text-muted))" }}>{t("dashboard.bestHoursLabel")}</span>
            {bestHours.slice(0, 2).join(" · ")}
          </div>
        )}
        {actionItems.length > 1 && (
          <ul className="flex flex-col gap-2.5 mb-5">
            {actionItems.slice(1, 3).map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: "hsl(0 0% 100% / 0.55)", lineHeight: 1.7 }}>
                <span className="w-1 h-1 rounded-full mt-2.5 shrink-0 opacity-70" style={{ background: "hsl(var(--gold))" }} />
                {item}
              </li>
            ))}
          </ul>
        )}
        <Link to="/horoscope" className="view-link">{t("dashboard.viewFullHoroscope")}</Link>
      </div>
    );
  } catch {
    return null;
  }
}

const UserDashboard = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const { t } = useTranslation("pages");
  const { user, session, isLoading } = useAuth();
  const { activeChart } = useActiveChart();
  const [chart, setChart] = useState<ChartSummary | null>(null);
  const [dreams, setDreams] = useState<DreamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [preferences, setPreferences] = useState<any>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [horoscopeReady, setHoroscopeReady] = useState(0);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const horoscopePrefetched = useRef<string | null>(null);
  const { tier, isPremium, isElite, usage, limits } = useSubscription();

  const loadDashboard = async () => {
    if (!user) return;
    const [dreamRes, profileRes] = await Promise.all([
      supabase.from("dream_interpretations").select("id, dream_category, dream_description, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("profiles").select("onboarding_completed, full_name, onboarding_preferences").eq("user_id", user.id).maybeSingle(),
    ]);

    const newChart: ChartSummary | null = activeChart
      ? { id: activeChart.id, full_name: activeChart.full_name, chart_data: activeChart.chart_data }
      : null;
    const newDreams = (dreamRes.data as DreamSummary[]) || [];
    let newProfileName = "";
    let newPreferences = null;
    let newNeedsOnboarding = false;

    if (profileRes.data) {
      if (!profileRes.data.onboarding_completed) newNeedsOnboarding = true;
      newProfileName = profileRes.data.full_name || "";
      newPreferences = profileRes.data.onboarding_preferences;
    }

    setChart(newChart);
    setDreams(newDreams);
    setProfileName(newProfileName);
    setPreferences(newPreferences);
    setNeedsOnboarding(newNeedsOnboarding);
    setOnboardingChecked(true);
    setLoading(false);

    const cacheData: DashboardCache = { chart: newChart, dreams: newDreams, profileName: newProfileName, preferences: newPreferences, needsOnboarding: newNeedsOnboarding };
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData)); } catch {}
  };

  useEffect(() => {
    if (!user) return;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: DashboardCache = JSON.parse(cached);
        setChart(data.chart); setDreams(data.dreams); setProfileName(data.profileName);
        setPreferences(data.preferences); setNeedsOnboarding(data.needsOnboarding);
        setOnboardingChecked(true); setLoading(false);
      }
    } catch {}
    loadDashboard();
  }, [user, activeChart?.id]);

  useEffect(() => {
    if (!user || !session || !activeChart) return;
    const localDate = new Date().toISOString().slice(0, 10);
    const cacheKey = `horoscope-daily-${activeChart.id}-${localDate}`;
    // If cache exists for this chart+date, skip the fetch but still re-render the card.
    if (localStorage.getItem(cacheKey)) {
      if (horoscopePrefetched.current !== activeChart.id) {
        horoscopePrefetched.current = activeChart.id;
        setHoroscopeReady(v => v + 1);
      }
      return;
    }
    if (horoscopePrefetched.current === activeChart.id) return;
    horoscopePrefetched.current = activeChart.id;
    (async () => {
      try {
        const moonSign = (activeChart.chart_data as any)?.moon_sign || null;
        const validDate = computeClientValidDate("daily");
        if (moonSign) {
          const { data: dbRow } = await supabase.from("daily_horoscopes").select("content").eq("sign_name", moonSign).eq("valid_date", validDate).eq("period", "daily").eq("language", getCurrentLanguage()).maybeSingle();
          if (dbRow?.content) {
            const parsed = typeof dbRow.content === "string" ? JSON.parse(dbRow.content) : dbRow.content;
            localStorage.setItem(cacheKey, JSON.stringify({ sign: moonSign, valid_date: validDate, horoscope: parsed }));
            setHoroscopeReady(v => v + 1); return;
          }
        }
        const { data: fnData } = await supabase.functions.invoke("generate-horoscope", { body: withLanguage({ period: "daily", chart_id: activeChart.id }), headers: { Authorization: `Bearer ${session.access_token}` } });
        if (fnData?.horoscope) {
          localStorage.setItem(cacheKey, JSON.stringify({ sign: fnData.sign || moonSign || "General", valid_date: fnData.valid_date || validDate, horoscope: fnData.horoscope }));
          setHoroscopeReady(v => v + 1);
        }
      } catch {}
    })();
  }, [user, session, activeChart]);

  if (isLoading) return <DashboardSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (onboardingChecked && needsOnboarding) return <Navigate to="/onboarding" replace />;

  const chartData = chart?.chart_data as any;
  const lifePriorities = (preferences?.life_priorities as string[]) || [];
  const priorityLabels = lifePriorities.map(id => LIFE_PRIORITIES.find(p => p.id === id)).filter(Boolean);

  const activeFullName = activeChart?.full_name?.trim() || "";
  const activeFirstName = activeFullName.split(/\s+/)[0] || activeFullName;
  const displayName = activeFirstName || profileName || "Seeker";

  // The Plan card lives inside the right rail (passed via ContextRail children).
  const PlanCard = (
    <div className={`glass-card-premium ${isElite ? "elite-card" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontWeight: 500, color: "hsl(var(--gold-light) / 0.9)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "hsl(var(--gold) / 0.12)", border: "0.5px solid hsl(var(--gold) / 0.10)" }}>
            {isElite ? "⚡" : "♦"}
          </div>
          {t("dashboard.yourPlan")}
        </div>
      </div>
      <div className="flex flex-col gap-3 mb-4">
        <UsageIndicator feature="dreams" />
        <UsageIndicator feature="oracle" />
      </div>
      <div className="sacred-divider" />
      {isElite && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-2 text-[12.5px]" style={{
          background: "linear-gradient(90deg, hsl(var(--gold) / 0.08), hsl(270 40% 50% / 0.06))",
          border: "0.5px solid hsl(var(--gold) / 0.2)",
          color: "hsl(var(--gold-light))",
        }}>
          <span className="pulse-dot" />
          {t("dashboard.priorityAi")}
        </div>
      )}
      {!isPremium && (
        <Button
          variant="outline"
          className="w-full gap-2 mt-3 h-11"
          style={{ borderColor: "hsl(var(--gold) / 0.3)", color: "hsl(var(--gold))", background: "transparent" }}
          onClick={() => setPaywallOpen(true)}
        >
          <Sparkles className="h-4 w-4" />
          {t("dashboard.upgradePremium")}
        </Button>
      )}
    </div>
  );

  return (
    <div ref={ref} className="sacred-wide py-8 md:py-12 relative">
      <div className="sacred-grid">
        {/* ═══ LEFT RAIL: Today's Cosmos + jump links ═══ */}
        <aside className="sacred-rail sacred-rail-left">
          <TodaysCosmosRail />
        </aside>

        {/* ═══ CENTER: prose column ═══ */}
        <main className="sacred-prose">
          {/* ── HERO GREETING (re-mounts on chart switch so the swap is felt) ── */}
          <div key={activeChart?.id || "no-chart"} className="animate-fade-in-up mb-10">
            <div className="flex items-center gap-2.5 mb-4" style={{ color: "hsl(var(--text-muted) / 0.85)", fontSize: "9.5px", letterSpacing: "0.22em", fontFamily: "'Jost', sans-serif", textTransform: "uppercase" }}>
              <span className="w-7 h-px" style={{ background: "hsl(var(--gold) / 0.5)" }} />
              <span>{t("dashboard.sacredLabel")}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Refresh dashboard"
                className="h-10 w-10 ml-1 -my-2 hover:bg-transparent"
                style={{ color: "hsl(var(--text-muted))" }}
                onClick={() => { sessionStorage.removeItem(CACHE_KEY); setLoading(true); loadDashboard(); }}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <h1 className="twinkle-aura" style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(42px, 6vw, 76px)",
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              color: "hsl(var(--gold-pale))",
            }}>
              {t(`dashboard.${getGreetingKey()}`)}, <em style={{ fontStyle: "italic", color: "hsl(var(--gold-light))" }}>{displayName}</em>
            </h1>
            <p className="mt-3 text-[13.5px] tracking-wide flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: "hsl(var(--text-secondary))" }}>
              <span>{formatTodayDate()}</span>
              {activeFullName && (
                <>
                  <span style={{ color: "hsl(var(--text-muted) / 0.6)" }}>·</span>
                  <span>
                    <span style={{ color: "hsl(var(--text-muted))", fontSize: "10.5px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "'Jost', sans-serif", marginRight: "6px" }}>
                      {t("dashboard.readingAs")}
                    </span>
                    <span style={{ color: "hsl(var(--gold-light))", fontFamily: "'Cormorant Garamond', serif", fontSize: "15px", fontStyle: "italic" }}>
                      {activeFullName}
                    </span>
                  </span>
                </>
              )}
              <span className="ml-1"><RishiGuruBadge tooltip="The Rishi Guru is reading your chart directly across this app." /></span>
            </p>
            {priorityLabels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {priorityLabels.map(p => (
                  <span key={p!.id} className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11.5px] tracking-wide" style={{
                    border: "0.5px solid hsl(var(--glass-border))",
                    background: "hsl(var(--gold) / 0.08)",
                    color: "hsl(var(--gold-light))",
                    backdropFilter: "blur(8px)",
                  }}>
                    {p!.emoji} {p!.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ── HOROSCOPE — full-width of prose column ── */}
              <div id="guidance" className="animate-fade-in-up mb-5" style={{ animationDelay: "0.1s" }}>
                <HoroscopePreviewCard key={`${activeChart?.id || "none"}-${horoscopeReady}`} chartId={activeChart?.id || null} />
              </div>

              {/* Plan card inline on tablet (xl rail hidden) */}
              <div className="xl:hidden mb-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                {PlanCard}
              </div>

              {/* ── SADE SATI ── */}
              {chartData?.moon_sign && (
                <div id="sade-sati" className="mb-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                  <SadeSatiTracker moonSign={chartData.moon_sign} isElite={isElite} />
                </div>
              )}

              {/* ── CHART SNAPSHOT ── */}
              {chartData && (
                <div id="snapshot" className="glass-card-premium mb-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                  {/* Decorative mandala */}
                  <svg className="mandala-accent" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--gold))" strokeWidth="0.5" />
                    <circle cx="100" cy="100" r="60" fill="none" stroke="hsl(var(--gold))" strokeWidth="0.3" />
                    <circle cx="100" cy="100" r="30" fill="none" stroke="hsl(var(--gold))" strokeWidth="0.3" />
                    <polygon points="100,20 150,130 50,130" fill="none" stroke="hsl(var(--gold))" strokeWidth="0.3" />
                    <polygon points="100,180 50,70 150,70" fill="none" stroke="hsl(var(--gold))" strokeWidth="0.3" />
                  </svg>
                  <div className="flex items-center gap-2.5 mb-5" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 500, color: "hsl(var(--gold-light))" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "hsl(var(--gold) / 0.15)", border: "0.5px solid hsl(var(--glass-border))" }}>
                      <Compass className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold))" }} />
                    </div>
                    {t("dashboard.snapshotTitle", { name: chart!.full_name })}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: t("dashboard.moonSign"), value: chartData.moon_sign },
                      { label: t("dashboard.nakshatra"), value: chartData.birth_nakshatra?.name },
                      { label: t("dashboard.ascendant"), value: chartData.ascendant?.sign },
                      { label: t("dashboard.mahaDasha"), value: chartData.dasha?.maha_dasha },
                    ].map((item, i) => (
                      <div key={i} className="text-center p-4 rounded-xl transition-all duration-300" style={{
                        background: "hsl(0 0% 100% / 0.025)",
                        border: "0.5px solid hsl(var(--glass-border-soft))",
                      }}>
                        <p className="text-[10px] uppercase tracking-[0.14em] mb-2" style={{ color: "hsl(var(--text-muted))" }}>{item.label}</p>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "19px", fontWeight: 400, color: "hsl(var(--gold-light))", letterSpacing: "0.02em" }}>{item.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── QUICK ACCESS ── */}
              <div id="actions" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                {[
                  { to: "/chart", icon: Star, label: t("dashboard.quickBirthChart"), desc: t("dashboard.quickBirthChartDesc"), emoji: "✦" },
                  { to: "/dreams", icon: Moon, label: t("dashboard.quickDreamOracle"), desc: t("dashboard.quickDreamOracleDesc"), emoji: "🌙" },
                  { to: "/compatibility", icon: Heart, label: t("dashboard.quickCompatibility"), desc: t("dashboard.quickCompatibilityDesc"), emoji: "♡" },
                  { to: "/horoscope", icon: Sun, label: t("dashboard.quickHoroscope"), desc: t("dashboard.quickHoroscopeDesc"), emoji: "☀" },
                ].map((item, i) => (
                  <Link key={item.to} to={item.to} className="quick-card animate-fade-in-up" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: "hsl(var(--gold) / 0.15)", border: "0.5px solid hsl(var(--glass-border))" }}>
                      {item.emoji}
                    </div>
                    <div className="flex-1">
                      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontWeight: 500, color: "hsl(var(--text-primary))", letterSpacing: "0.02em", marginBottom: "3px" }}>{item.label}</h3>
                      <p className="text-xs" style={{ color: "hsl(var(--text-muted))", letterSpacing: "0.02em" }}>{item.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 quick-arrow" />
                  </Link>
                ))}
              </div>

              {/* ── RECENT DREAMS ── */}
              {dreams.length > 0 && (
                <div className="glass-card-premium mt-5 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                  <div className="sacred-section-title mb-4">
                    <Moon className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
                    {t("dashboard.recentDreams")}
                  </div>
                  <div className="space-y-3">
                    {dreams.map(d => (
                      <Link key={d.id} to="/dreams" className="block">
                        <div className="p-3 rounded-xl transition-all duration-300" style={{ border: "0.5px solid hsl(var(--glass-border-soft))", background: "hsl(0 0% 100% / 0.02)" }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs" style={{ color: "hsl(var(--text-muted))" }}>
                              {new Date(d.created_at).toLocaleDateString()}
                            </span>
                            {d.dream_category && (
                              <span className="text-xs px-2 py-0.5 rounded" style={{ background: "hsl(var(--gold) / 0.08)", color: "hsl(var(--gold))" }}>{d.dream_category}</span>
                            )}
                          </div>
                          <p className="text-sm truncate" style={{ color: "hsl(var(--text-primary))" }}>{d.dream_description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* ═══ RIGHT RAIL: Plan + Quick actions + Cosmic field ═══ */}
        <aside className="sacred-rail sacred-rail-right">
          <ContextRail>{PlanCard}</ContextRail>
        </aside>
      </div>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} feature="dreams" />
    </div>
  );
});

UserDashboard.displayName = "UserDashboard";
export default UserDashboard;

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { withLanguage } from "@/lib/i18nClient";
import { useActiveChart } from "@/hooks/useActiveChart";
import ReadingAsChip from "@/components/ReadingAsChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, Loader2, RefreshCw, Sparkles, AlertTriangle, Flame, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Paywall from "@/components/Paywall";
import TwinkleText from "@/components/TwinkleText";
import SacredPageShell from "@/components/layout/SacredPageShell";
import PageNavRail from "@/components/layout/PageNavRail";
import CosmicFieldCard from "@/components/layout/CosmicFieldCard";
import UpcomingEventsPanel from "@/components/predictions/UpcomingEventsPanel";

interface TimelineEvent {
  date: string;
  type: "dasha_change" | "transit" | "turning_point";
  category: "opportunity" | "caution" | "challenge" | "spiritual";
  title: string;
  description: string;
  planet: string;
  duration_days?: number;
}

const PLANET_EMOJI: Record<string, string> = {
  Sun: "☀️", Moon: "🌙", Mars: "♂️", Mercury: "☿️", Jupiter: "♃",
  Venus: "♀️", Saturn: "♄", Rahu: "🐍", Ketu: "🔥",
};

const CATEGORY_CONFIG: Record<string, { color: string; borderColor: string; icon: any; label: string }> = {
  opportunity: { color: "bg-emerald-500/10 text-emerald-400", borderColor: "border-l-emerald-500", icon: Sparkles, label: "Opportunity" },
  caution: { color: "bg-amber-500/10 text-amber-400", borderColor: "border-l-amber-500", icon: AlertTriangle, label: "Caution" },
  challenge: { color: "bg-red-500/10 text-red-400", borderColor: "border-l-red-500", icon: Flame, label: "Challenge" },
  spiritual: { color: "bg-purple-500/10 text-purple-400", borderColor: "border-l-purple-500", icon: Eye, label: "Spiritual" },
};

export default function TimelinePage() {
  const { t } = useTranslation("pages");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { activeChart } = useActiveChart();

  const fetchTimeline = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    // Cache scoped per active chart so switching shows the right person's timeline
    const chartScope = activeChart?.id || "default";
    const cacheKey = `timeline_${chartScope}_${new Date().toISOString().slice(0, 10)}`;
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          setEvents(JSON.parse(cached));
          setLoading(false);
          return;
        } catch { /* ignore */ }
      }
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-timeline", {
        body: withLanguage({ chart_id: activeChart?.id }),
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const evts = data?.events || [];
      setEvents(evts);
      sessionStorage.setItem(cacheKey, JSON.stringify(evts));
    } catch (e: any) {
      setError(e.message || t("timelinePage.toast.failedToGenerate"));
      toast({ title: t("timelinePage.toast.errorTitle"), description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, activeChart?.id]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const today = new Date().toISOString().slice(0, 10);

  // Find the index of the first future event for the "Now" marker
  const nowIndex = events.findIndex(e => e.date >= today);

  if (loading) {
    return (
      <SacredPageShell
        leftRail={<PageNavRail title={t("timelinePage.navTitle")} hint={t("timelinePage.navHint")} sections={[]} />}
        rightRail={<CosmicFieldCard />}
      >
        <div className="flex items-center gap-3 mb-8">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-serif font-bold text-primary">{t("timelinePage.heading")}</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </SacredPageShell>
    );
  }

  if (error) {
    return (
      <SacredPageShell
        leftRail={<PageNavRail title={t("timelinePage.navTitle")} hint={t("timelinePage.navHint")} sections={[]} />}
        rightRail={<CosmicFieldCard />}
      >
        <div className="flex items-center gap-3 mb-8">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-serif font-bold text-primary">{t("timelinePage.heading")}</h1>
        </div>
        <Card className="border-destructive/20">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchTimeline(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" /> {t("timelinePage.errorRetryButton")}
            </Button>
          </CardContent>
        </Card>
      </SacredPageShell>
    );
  }

  return (
    <Paywall
      feature={t("timelinePage.paywallFeature")}
      description={t("timelinePage.paywallDescription")}
    >
      <SacredPageShell
        leftRail={<PageNavRail title={t("timelinePage.navTitle")} hint={t("timelinePage.navHint")} sections={[]} />}
        rightRail={<CosmicFieldCard />}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-7 w-7 text-primary" />
            <div>
              <TwinkleText as="h1" intensity="aura" className="text-2xl font-serif font-bold text-primary">
                {t("timelinePage.heading")}
              </TwinkleText>
              <p className="text-sm text-muted-foreground">{t("timelinePage.subheading")}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => fetchTimeline(true)} title={t("timelinePage.refreshButton")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="-mt-6 mb-6"><ReadingAsChip /></div>

        <div className="mb-8">
          <UpcomingEventsPanel chartId={activeChart?.id} />
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">{t("timelinePage.emptyMessage")}</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="relative pl-8">
              {/* Vertical timeline line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

              {events.map((event, idx) => {
                const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.caution;
                const Icon = config.icon;
                const isNow = idx === nowIndex;
                const isPast = event.date < today;
                const emoji = PLANET_EMOJI[event.planet] || "🪐";

                return (
                  <div key={idx}>
                    {/* "Now" marker */}
                    {isNow && (
                      <div className="relative flex items-center gap-3 mb-6 -ml-8 pl-8">
                        <div className="absolute left-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20 z-10" />
                        <Badge variant="default" className="text-xs font-semibold">
                          {t("timelinePage.nowBadge")}{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </Badge>
                      </div>
                    )}

                    <div className={`relative mb-6 ${isPast ? "opacity-50" : ""}`}>
                      {/* Timeline dot */}
                      <div className={`absolute -left-5 w-2.5 h-2.5 rounded-full mt-2 ${
                        event.category === "opportunity" ? "bg-emerald-500" :
                        event.category === "caution" ? "bg-amber-500" :
                        event.category === "challenge" ? "bg-red-500" :
                        "bg-purple-500"
                      }`} />

                      <Card className={`border-l-4 ${config.borderColor} transition-all hover:shadow-md`}>
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xl">{emoji}</span>
                              <div>
                                <CardTitle className="text-sm font-semibold leading-tight">{event.title}</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                  {event.duration_days ? t("timelinePage.monthsSuffix", { n: Math.round(event.duration_days / 30) }) : ""}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className={`text-[10px] shrink-0 ${config.color}`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {t(`timelinePage.category.${event.category}`)}
                            </Badge>
                          </div>
                        </CardHeader>
                        {event.description && (
                          <CardContent className="pt-0 pb-4 px-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
                          </CardContent>
                        )}
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </SacredPageShell>
    </Paywall>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { withLanguage, getCurrentLanguage } from "@/lib/i18nClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, Heart, Coins, Activity, Sparkles, Users, Compass,
  BookOpen, Plane, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PredictedEventRow {
  id: string;
  event_type: string;
  life_area: string;
  headline: string;
  window_start: string;
  window_end: string;
  confidence: number;
  triggers: Array<{ kind: string; detail: string; weight: number }>;
  narration: string | null;
}

interface Props {
  chartId?: string;
  className?: string;
}

const AREA_ICON: Record<string, any> = {
  Career: Briefcase, Marriage: Heart, Relationships: Heart, Wealth: Coins,
  Health: Activity, Spiritual: Sparkles, Family: Users, Education: BookOpen,
  Travel: Plane, General: Compass,
};

function formatWindow(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return s.getTime() === e.getTime() ? fmt(s) : `${fmt(s)} → ${fmt(e)}`;
}

export default function UpcomingEventsPanel({ chartId, className = "" }: Props) {
  const { t } = useTranslation("pages");
  const [events, setEvents] = useState<PredictedEventRow[]>([]);
  const [overview, setOverview] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [narrating, setNarrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadCached = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("predicted_events")
        .select("*")
        .eq("language", getCurrentLanguage())
        .gte("window_end", new Date().toISOString().slice(0, 10))
        .order("confidence", { ascending: false })
        .limit(12);
      if (chartId) query = query.eq("chart_id", chartId);
      const { data, error: e } = await query;
      if (e) throw e;
      setEvents((data ?? []) as any);
      if (!data || data.length === 0) await runCompute(false);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const runCompute = async (showLoader = true) => {
    if (showLoader) setNarrating(true);
    try {
      const { data, error: e } = await supabase.functions.invoke("generate-predictions", {
        body: withLanguage(chartId ? { chart_id: chartId } : {}),
      });
      if (e) throw new Error(e.message);
      if (data?.error) throw new Error(data.error);
      setOverview(data?.overview ?? "");
      setEvents((data?.events ?? []).slice(0, 12));
    } catch (e: any) {
      setError(e.message ?? "Failed to compute predictions");
    } finally {
      if (showLoader) setNarrating(false);
    }
  };

  useEffect(() => { loadCached(); /* eslint-disable-next-line */ }, [chartId]);

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif font-semibold text-primary">{t("upcomingEvents.heading")}</h2>
          <p className="text-xs text-muted-foreground">{t("upcomingEvents.subheading")}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => runCompute(true)} disabled={narrating}>
          {narrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span className="ml-2 text-xs">{narrating ? t("upcomingEvents.reading") : t("upcomingEvents.refresh")}</span>
        </Button>
      </div>

      {overview && (
        <Card className="border-primary/20 bg-card/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm leading-relaxed italic text-foreground/90">{overview}</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="pt-4 pb-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {events.length === 0 && !error && (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            {t("upcomingEvents.noEvents")}
          </CardContent>
        </Card>
      )}

      <AnimatePresence initial={false}>
        {events.map(ev => {
          const Icon = AREA_ICON[ev.life_area] ?? Compass;
          const isOpen = !!expanded[ev.id];
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border-l-4 border-l-primary/60">
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{ev.life_area}</Badge>
                        <span className="text-xs text-muted-foreground">{formatWindow(ev.window_start, ev.window_end)}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{ev.confidence}% signal</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-1">{ev.headline}</p>
                      {ev.narration && (
                        <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{ev.narration}</p>
                      )}
                      <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${ev.confidence}%` }} />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpanded(s => ({ ...s, [ev.id]: !s[ev.id] }))}
                    className="text-[11px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {isOpen ? <ChevronUp className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}
                    {t("upcomingEvents.whyPrediction")}
                  </button>
                  {isOpen && (
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground border-l border-border pl-3">
                      {ev.triggers?.map((t, i) => (
                        <li key={i}>
                          <span className="uppercase tracking-wide text-[10px] text-primary/80">{t.kind}</span>{" "}
                          — {t.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Sparkles, BookOpen, Shield, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Layer {
  id: string;
  layer_key: string;
  title: string;
  description: string | null;
}

interface Rule {
  id: string;
  roman_numeral: string;
  title: string;
  body: string;
}

interface ChartHighlights {
  lagna?: string;
  lagnaDeg?: string;
  moon?: string;
  moonNak?: string;
  moonPada?: number;
  mahaDasha?: string;
  mahaDashaEnd?: string;
  yogas?: string[];
}

const CONSUMERS = [
  "Oracle",
  "Daily Horoscope",
  "Reading",
  "Predictions",
  "Timeline",
  "Remedies",
  "Compatibility",
  "Dreams",
];

interface Props {
  onDisengage: () => void;
  saving?: boolean;
}

const RishiGuruEngagedPanel = ({ onDisengage, saving }: Props) => {
  const { user } = useAuth();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [chart, setChart] = useState<ChartHighlights | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [layersRes, rulesRes, chartRes] = await Promise.all([
        supabase
          .from("ai_prompt_layers")
          .select("id, layer_key, title, description")
          .eq("status", "published")
          .order("layer_key"),
        supabase
          .from("ai_persona_rules")
          .select("id, roman_numeral, title, body")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("birth_charts")
          .select("chart_data")
          .eq("user_id", user.id)
          .eq("is_primary", true)
          .maybeSingle(),
      ]);
      setLayers((layersRes.data ?? []) as Layer[]);
      setRules((rulesRes.data ?? []) as Rule[]);

      const cd: any = chartRes.data?.chart_data;
      if (cd) {
        setChart({
          lagna: cd?.ascendant?.sign,
          lagnaDeg:
            typeof cd?.ascendant?.degree === "number"
              ? `${cd.ascendant.degree.toFixed(1)}°`
              : undefined,
          moon: cd?.moon_sign,
          moonNak: cd?.birth_nakshatra?.name,
          moonPada: cd?.birth_nakshatra?.pada,
          mahaDasha: cd?.dasha?.maha_dasha,
          mahaDashaEnd: cd?.dasha?.maha_dasha_end,
          yogas: Array.isArray(cd?.active_yogas)
            ? cd.active_yogas.slice(0, 3).map((y: any) => y.name).filter(Boolean)
            : [],
        });
      }
    })();
  }, [user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[20px] border border-primary/30 backdrop-blur-[14px]"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--background) / 0.55))",
        boxShadow: "0 0 40px hsl(var(--primary) / 0.08), inset 0 0 0 1px hsl(var(--primary) / 0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6 pb-4 border-b border-primary/15">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Flame className="h-5 w-5 text-primary" />
            <h3
              className="font-serif text-lg sm:text-xl text-foreground"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              God-Mode Engaged
            </h3>
            <span className="text-[10px] uppercase tracking-[0.18em] text-primary/80 border border-primary/40 rounded-full px-2 py-0.5">
              Rishi Guru Protocol
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            The Rishi Guru is reading your chart directly. Manual preferences are paused.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDisengage}
          disabled={saving}
          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          Disengage
        </Button>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Active Layers */}
        <Section
          icon={<ScrollText className="h-3.5 w-3.5" />}
          title="Active Layers"
          meta={`${layers.length}/8 published`}
        >
          {layers.length === 0 ? (
            <EmptyHint text="No published layers yet — publish them in AI Engine → Prompt Layers." />
          ) : (
            <ul className="space-y-1.5">
              {layers.map((l) => (
                <li key={l.id} className="flex items-baseline gap-2.5 text-sm">
                  <span className="text-primary text-[10px] mt-1">●</span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-primary/80 w-14 shrink-0">
                    {l.layer_key}
                  </span>
                  <span className="text-foreground/90 font-medium">{l.title}</span>
                  {l.description && (
                    <span className="text-muted-foreground text-xs hidden sm:inline">
                      — {l.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Active Laws */}
        <Section
          icon={<Shield className="h-3.5 w-3.5" />}
          title="Active Laws"
          meta={`${rules.length}/12 active`}
        >
          {rules.length === 0 ? (
            <EmptyHint text="No laws active — define them in AI Engine → 12 Laws." />
          ) : (
            <TooltipProvider delayDuration={150}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {rules.map((r) => (
                  <Tooltip key={r.id}>
                    <TooltipTrigger asChild>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5 text-center cursor-help hover:border-primary/40 transition">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
                          {r.roman_numeral}
                        </div>
                        <div className="text-[11px] text-foreground/80 truncate mt-0.5">
                          {r.title}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-xs">
                      <p className="font-medium mb-1">
                        {r.roman_numeral}. {r.title}
                      </p>
                      <p className="text-muted-foreground">{r.body}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          )}
        </Section>

        {/* Chart highlights */}
        <Section
          icon={<Sparkles className="h-3.5 w-3.5" />}
          title="Your Chart, As The Guru Sees It"
        >
          {!chart ? (
            <EmptyHint text="Add your birth details above to let the Guru cite your chart." />
          ) : (
            <div className="rounded-lg border border-primary/15 bg-background/40 px-4 py-3 font-mono text-[12px] sm:text-[13px] leading-relaxed text-foreground/85">
              <Row label="Lagna" value={chart.lagna ? `${chart.lagna}${chart.lagnaDeg ? ` ${chart.lagnaDeg}` : ""}` : "—"} />
              <Row
                label="Moon"
                value={
                  chart.moon
                    ? `${chart.moon}${chart.moonNak ? ` · ${chart.moonNak}${chart.moonPada ? ` pada ${chart.moonPada}` : ""}` : ""}`
                    : "—"
                }
              />
              <Row
                label="Mahadasha"
                value={
                  chart.mahaDasha
                    ? `${chart.mahaDasha}${chart.mahaDashaEnd ? ` (until ${chart.mahaDashaEnd.slice(0, 4)})` : ""}`
                    : "—"
                }
              />
              <Row
                label="Yogas"
                value={chart.yogas && chart.yogas.length ? chart.yogas.join(", ") : "—"}
              />
            </div>
          )}
        </Section>

        {/* Where it speaks */}
        <Section
          icon={<BookOpen className="h-3.5 w-3.5" />}
          title="Where It Speaks"
        >
          <div className="flex flex-wrap gap-1.5">
            {CONSUMERS.map((c) => (
              <span
                key={c}
                className="text-[11px] rounded-full border border-primary/20 bg-primary/5 text-foreground/80 px-2.5 py-1"
              >
                {c}
              </span>
            ))}
          </div>
        </Section>
      </div>
    </motion.div>
  );
};

const Section = ({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-primary/80">
        {icon}
        <span>{title}</span>
      </div>
      {meta && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {meta}
        </span>
      )}
    </div>
    {children}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline gap-2 py-0.5">
    <span className="text-muted-foreground w-24 shrink-0">{label}</span>
    <span className="text-foreground/90 truncate">{value}</span>
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <p className="text-xs text-muted-foreground italic">{text}</p>
);

export default RishiGuruEngagedPanel;

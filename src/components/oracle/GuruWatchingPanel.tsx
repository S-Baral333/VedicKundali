import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ChartHighlights {
  lagna?: string;
  lagnaDeg?: string;
  moon?: string;
  moonNak?: string;
  mahaDasha?: string;
  mahaDashaEnd?: string;
  yogas?: string[];
}

interface Counts { layers: number; laws: number }

export default function GuruWatchingPanel() {
  const { user } = useAuth();
  const [chart, setChart] = useState<ChartHighlights | null>(null);
  const [counts, setCounts] = useState<Counts>({ layers: 0, laws: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [chartRes, layersRes, rulesRes] = await Promise.all([
        supabase.from("birth_charts").select("chart_data").eq("user_id", user.id).eq("is_primary", true).maybeSingle(),
        supabase.from("ai_prompt_layers").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("ai_persona_rules").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      const cd: any = chartRes.data?.chart_data;
      if (cd) {
        setChart({
          lagna: cd?.ascendant?.sign,
          lagnaDeg: typeof cd?.ascendant?.degree === "number" ? `${cd.ascendant.degree.toFixed(1)}°` : undefined,
          moon: cd?.moon_sign,
          moonNak: cd?.birth_nakshatra?.name,
          mahaDasha: cd?.dasha?.maha_dasha,
          mahaDashaEnd: cd?.dasha?.maha_dasha_end,
          yogas: Array.isArray(cd?.active_yogas) ? cd.active_yogas.slice(0, 3).map((y: any) => y.name).filter(Boolean) : [],
        });
      }
      setCounts({ layers: layersRes.count ?? 0, laws: rulesRes.count ?? 0 });
    })();
  }, [user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-[20px] border border-primary/30 backdrop-blur-[14px] overflow-hidden"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--background) / 0.55))",
        boxShadow: "0 0 32px hsl(var(--primary) / 0.10), inset 0 0 0 1px hsl(var(--primary) / 0.08)",
      }}
    >
      <div className="px-4 py-3 border-b border-primary/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-primary/90">
            Guru is Watching
          </span>
        </div>
        <Eye className="h-3.5 w-3.5 text-primary/60" />
      </div>

      <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-primary/10">
        <Stat label="Layers" value={`${counts.layers}/8`} />
        <Stat label="Laws" value={`${counts.laws}/12`} />
        <Stat label="Mode" value="Live" />
      </div>

      <div className="px-4 py-3 space-y-2 font-mono text-[12px] text-foreground/85">
        <Row label="Lagna" value={chart?.lagna ? `${chart.lagna}${chart.lagnaDeg ? ` ${chart.lagnaDeg}` : ""}` : "—"} />
        <Row label="Moon" value={chart?.moon ? `${chart.moon}${chart.moonNak ? ` · ${chart.moonNak}` : ""}` : "—"} />
        <Row
          label="Dasha"
          value={chart?.mahaDasha ? `${chart.mahaDasha}${chart.mahaDashaEnd ? ` → ${chart.mahaDashaEnd.slice(0, 4)}` : ""}` : "—"}
        />
        <Row label="Yogas" value={chart?.yogas?.length ? chart.yogas.join(", ") : "—"} />
      </div>

      <p className="px-4 pb-3 text-[10px] text-muted-foreground italic">
        Citations on. Reading from your chart, not generic horoscope.
      </p>
    </motion.div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <div className="text-sm font-bold text-primary">{value}</div>
    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline gap-2">
    <span className="text-muted-foreground w-14 shrink-0 text-[10px] uppercase tracking-wider">{label}</span>
    <span className="text-foreground/90 truncate">{value}</span>
  </div>
);

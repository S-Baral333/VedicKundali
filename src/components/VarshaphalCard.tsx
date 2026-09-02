import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withLanguage } from "@/lib/i18nClient";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Crown, Lock, Zap, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VarshaphalEntry {
  year: number;
  solar_return_moment_utc: string;
  varsha_lagna: { sign: string; longitude: number };
  muntha: { sign: string; age_years: number };
  year_lord: { planet: string; reason: string };
  sun_sign_at_return: string;
  munda_dasha: { month: number; sign: string; lord: string; start: string; end: string }[];
  summary?: string;
  ai_skipped?: boolean;
}

interface VarshaphalCardProps {
  chartId: string;
  birthYear: number;
  cache?: Record<string, VarshaphalEntry>;
  onCacheUpdate?: (year: number, entry: VarshaphalEntry) => void;
}

/**
 * Varshaphal — Tajik annual chart (Elite only).
 * Year picker, solar-return moment, Varsha Lagna, Muntha, Year Lord (Varshesh),
 * 12-month Munda dasha. Cached server-side per year inside chart_data.varshaphal_cache.
 */
export default function VarshaphalCard({ chartId, birthYear, cache, onCacheUpdate }: VarshaphalCardProps) {
  const { isElite } = useSubscription();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VarshaphalEntry | null>(cache?.[String(currentYear)] ?? null);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = Math.max(birthYear + 1, currentYear - 5); y <= currentYear + 10; y++) years.push(y);
    return years;
  }, [birthYear, currentYear]);

  const onYearChange = (val: string) => {
    const y = Number(val);
    setYear(y);
    setData(cache?.[String(y)] ?? null);
  };

  const compute = async () => {
    if (!isElite) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-varshaphal", {
        body: withLanguage({ chart_id: chartId, year }),
      });
      if (error) throw error;
      setData(result as VarshaphalEntry);
      onCacheUpdate?.(year, result as VarshaphalEntry);
      toast({ title: "Varshaphal ready", description: `Annual chart for ${year} computed.` });
    } catch (e: any) {
      toast({ title: "Couldn't compute Varshaphal", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isElite) {
    return (
      <Card className="border-primary/15 bg-card/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10">
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-400" /> Varshaphal — Annual Forecast
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-amber-400/40 text-amber-300">
              <Zap className="h-3 w-3" /> Elite
            </Badge>
          </CardTitle>
          <CardDescription>Tajik solar-return chart with Varsha Lagna, Muntha, Year Lord & 12-month Munda dasha.</CardDescription>
        </CardHeader>
        <CardContent className="py-6 text-center space-y-3">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-amber-400/20 to-amber-600/10 p-3 rounded-full border border-amber-400/30">
              <Lock className="h-5 w-5 text-amber-300" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            See exactly when each year's energy peaks — month by month — based on the precise moment Sun returns to its natal degree.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5 border-amber-400/40 text-amber-300 hover:bg-amber-400/10" onClick={() => window.location.href = "/pricing"}>
            <Zap className="h-3.5 w-3.5" /> Upgrade to Elite
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/15 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5">
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-400" /> Varshaphal — Annual Forecast
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-amber-400/40 text-amber-300">
            <Zap className="h-3 w-3" /> Elite
          </Badge>
        </CardTitle>
        <CardDescription>Tajik solar-return frame for the chosen year.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={String(year)} onValueChange={onYearChange}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}{y === currentYear ? " (current)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={compute}
            disabled={loading}
            className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black hover:from-amber-400 hover:to-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
          >
            {loading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Computing…</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> {data ? "Recompute" : "Compute Varshaphal"}</>}
          </Button>
        </div>

        {data && (
          <div className="space-y-4">
            {data.summary ? (
              <p className="text-sm text-muted-foreground leading-relaxed font-serif border-l-2 border-primary/30 pl-3 italic">
                {data.summary}
              </p>
            ) : data.ai_skipped ? (
              <p className="text-xs text-muted-foreground/60 italic">AI narrative unavailable — configure AI_GATEWAY_API_KEY to enable.</p>
            ) : null}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Varsha Lagna" value={data.varsha_lagna.sign} />
              <Stat label="Muntha" value={data.muntha.sign} subtitle={`age ${data.muntha.age_years}`} />
              <Stat label="Year Lord" value={data.year_lord.planet} subtitle={data.year_lord.reason} />
              <Stat label="Sun Returns" value={data.sun_sign_at_return} subtitle={new Date(data.solar_return_moment_utc).toLocaleDateString()} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Munda Dasha — 12-month roadmap</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {data.munda_dasha.map(m => (
                  <div key={m.month} className="rounded-lg border border-primary/10 bg-card/60 px-2.5 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground tabular-nums">M{m.month}</span>
                      <span className="text-[10px] font-medium text-foreground">{m.sign}</span>
                    </div>
                    <p className="text-[10px] text-primary/80 mt-0.5">{m.lord}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!data && !loading && (
          <p className="text-[11px] text-muted-foreground/70 text-center pt-2">
            Pick a year and tap "Compute Varshaphal" to generate the annual chart.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-lg border border-primary/15 bg-card/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground font-serif truncate">{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/70 truncate">{subtitle}</p>}
    </div>
  );
}

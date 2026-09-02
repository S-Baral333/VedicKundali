import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { withLanguage } from "@/lib/i18nClient";
import { useActiveChart } from "@/hooks/useActiveChart";
import ReadingAsChip from "@/components/ReadingAsChip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import Paywall from "@/components/Paywall";
import TwinkleText from "@/components/TwinkleText";
import SacredPageShell from "@/components/layout/SacredPageShell";
import PageNavRail from "@/components/layout/PageNavRail";
import CosmicFieldCard from "@/components/layout/CosmicFieldCard";
import {
  Heart, Briefcase, Plane, Stethoscope, GraduationCap, Building2, Church, Sparkles,
  CalendarDays, Timer, Loader2, ChevronDown, Star
} from "lucide-react";

const ACTIVITIES = [
  { id: "marriage", label: "Marriage", icon: Heart },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "medical", label: "Medical", icon: Stethoscope },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "property", label: "Property", icon: Building2 },
  { id: "religious", label: "Religious", icon: Church },
  { id: "general", label: "General", icon: Sparkles },
];

const QUALITY_COLORS: Record<string, string> = {
  excellent: "bg-green-500/20 text-green-400 border-green-500/30",
  good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  average: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  poor: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface MuhurtaResult {
  date: string;
  day: string;
  nakshatra: string;
  tithi: string;
  moonSign: string;
  score: number;
  quality: "excellent" | "good" | "average" | "poor";
  summary: string;
  factors: { vara: number; nakshatra: number; tithi: number; transit: number };
}

export default function MuhurtaPage() {
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const { activeChart } = useActiveChart();
  const [activity, setActivity] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 30));

  // Auto-constrain end date when start date changes
  useEffect(() => {
    if (startDate && endDate) {
      const maxEnd = addDays(startDate, 89);
      if (endDate > maxEnd) setEndDate(maxEnd);
      if (endDate < startDate) setEndDate(addDays(startDate, 6));
    }
  }, [startDate]);
  const [results, setResults] = useState<MuhurtaResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFind = useCallback(async () => {
    if (!activity || !startDate || !endDate) {
      toast({ title: t("muhurtaPage.toast.missingInputTitle"), description: t("muhurtaPage.toast.missingInputDesc"), variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: t("muhurtaPage.toast.invalidRangeTitle"), description: t("muhurtaPage.toast.invalidRangeDesc"), variant: "destructive" });
      return;
    }
    const daysDiff = differenceInCalendarDays(endDate, startDate) + 1;
    if (daysDiff > 90) {
      toast({ title: t("muhurtaPage.toast.rangeTooLargeTitle"), description: t("muhurtaPage.toast.rangeTooLargeDesc"), variant: "destructive" });
      return;
    }

    const chartScope = activeChart?.id || "default";
    const cacheKey = `muhurta_${chartScope}_${activity}_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setResults(JSON.parse(cached));
      return;
    }

    setLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-muhurta", {
        body: withLanguage({ activity, startDate: format(startDate, "yyyy-MM-dd"), endDate: format(endDate, "yyyy-MM-dd"), chart_id: activeChart?.id }),
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data.muhurtas);
      sessionStorage.setItem(cacheKey, JSON.stringify(data.muhurtas));
    } catch (e: any) {
      toast({ title: t("muhurtaPage.toast.errorTitle"), description: e.message || t("muhurtaPage.toast.errorDesc"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activity, startDate, endDate, toast, activeChart?.id]);

  return (
    <Paywall
      feature={t("muhurtaPage.paywallFeature")}
      description={t("muhurtaPage.paywallDescription")}
    >
      <SacredPageShell
        leftRail={<PageNavRail title={t("muhurtaPage.navTitle")} hint={t("muhurtaPage.navHint")} sections={[{ id: "picker", label: t("muhurtaPage.section.chooseActivity") }, { id: "results", label: t("muhurtaPage.section.results") }]} />}
        rightRail={<CosmicFieldCard />}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Timer className="h-7 w-7 text-primary" />
            <TwinkleText as="h1" intensity="aura" className="text-3xl font-serif font-bold text-primary">
              {t("muhurtaPage.heading")}
            </TwinkleText>
          </div>
          <p className="text-muted-foreground">{t("muhurtaPage.subheading")}</p>
          <div className="mt-3 flex justify-center"><ReadingAsChip /></div>
        </div>

        {/* Activity Grid */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("muhurtaPage.activityGrid.label")}</h2>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {ACTIVITIES.map((a) => (
              <button
                key={a.id}
                onClick={() => setActivity(a.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  activity === a.id
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <a.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{t(`muhurtaPage.activity.${a.id}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="flex flex-col sm:flex-row gap-3 mb-1">
          <DatePicker label={t("muhurtaPage.datePicker.startDate")} date={startDate} onSelect={setStartDate} />
          <DatePicker label={t("muhurtaPage.datePicker.endDate")} date={endDate} onSelect={setEndDate} disabled={(d) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d < today) return true;
            if (startDate && d < startDate) return true;
            if (startDate && d > addDays(startDate, 89)) return true;
            return false;
          }} />
        </div>
        <p className="text-xs text-muted-foreground mb-6">{t("muhurtaPage.rangeNote")}</p>

        {/* Find Button */}
        <Button
          onClick={handleFind}
          disabled={!activity || !startDate || !endDate || loading}
          className="w-full mb-8"
          size="lg"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
          {loading ? t("muhurtaPage.button.computing") : t("muhurtaPage.button.find")}
        </Button>

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-2">{t("muhurtaPage.results.summary", { n: results.length })}</p>
            {results.map((m, i) => (
              <Card key={m.date} className="border-border/50 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Score Circle */}
                    <div className="flex-shrink-0 relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="4" />
                        <circle
                          cx="28" cy="28" r="24" fill="none"
                          stroke="currentColor"
                          className={m.quality === "excellent" ? "text-green-500" : m.quality === "good" ? "text-blue-500" : m.quality === "average" ? "text-amber-500" : "text-red-500"}
                          strokeWidth="4"
                          strokeDasharray={`${(m.score / 100) * 150.8} 150.8`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-sm font-bold">{m.score}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-foreground">
                          {format(new Date(m.date + "T12:00:00"), "EEE, MMM d")}
                        </span>
                        <Badge className={`text-[10px] ${QUALITY_COLORS[m.quality]}`}>
                          {m.quality.charAt(0).toUpperCase() + m.quality.slice(1)}
                        </Badge>
                        {i === 0 && <Badge variant="default" className="text-[10px]">{t("muhurtaPage.results.bestPick")}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1.5">
                        {m.nakshatra} • {m.tithi} • Moon in {m.moonSign}
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">{m.summary}</p>

                      {/* Factor bars */}
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {(["vara", "nakshatra", "tithi", "transit"] as const).map((f) => (
                          <div key={f} className="space-y-0.5">
                            <span className="text-[10px] text-muted-foreground capitalize">{f}</span>
                            <Progress value={m.factors[f] * 10} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SacredPageShell>
    </Paywall>
  );
}

function DatePicker({ label, date, onSelect, disabled }: { label: string; date?: Date; onSelect: (d: Date | undefined) => void; disabled?: (d: Date) => boolean }) {
  const { t } = useTranslation("pages");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex-1 justify-between">
          <span className="text-muted-foreground text-sm">{label}:</span>
          <span>{date ? format(date, "MMM d, yyyy") : t("muhurtaPage.datePicker.pickDate")}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          disabled={disabled || ((d) => d < new Date())}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

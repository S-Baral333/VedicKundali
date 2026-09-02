import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useActiveChart } from "@/hooks/useActiveChart";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, Sparkles, Sun, Moon, AlertCircle, RefreshCw, MapPin, Calculator, Wand2, Copy, Flame, Star, Compass, Shield, Zap, CheckCircle2, Clock, ChevronDown, Calendar, ArrowUp, Plus, Briefcase, Heart, Coins, Activity, Download, Share2 } from "lucide-react";
import PillTabs from "@/components/PillTabs";
import CosmicBackground from "@/components/CosmicBackground";
import SacredPageShell from "@/components/layout/SacredPageShell";
import SadeSatiTracker from "@/components/SadeSatiTracker";
import DashaSwitcher from "@/components/DashaSwitcher";
import VarshaphalCard from "@/components/VarshaphalCard";
import BSDatePicker from "@/components/BSDatePicker";
import SacredKundaliDownload from "@/components/SacredKundaliDownload";
import {
  type CalendarSystem, bsToAdString, formatBsDate, formatAdDate, buildBsDateString,
} from "@/lib/calendar-bs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  SectionTitle, VerificationStrip, PanchangaGrid, DashaTimeline, MangalFeatureCard,
  YogasAccordionV2, ReadingChapters, PersonSidebarList, PersonChipsRow, ChartTabsBar,
  type DashaPeriod, type PersonItem,
} from "@/components/chart/sections";

/* ═══════════════════════════════════════════════════════
 * Types & constants
 * ═══════════════════════════════════════════════════════ */
interface ChartData {
  ascendant: { sign: string; degree: number; nakshatra?: string };
  planets: Array<{
    name: string; sign: string; degree: number; house: number;
    nakshatra: string; nakshatra_pada?: number; is_retrograde?: boolean; dignity?: string;
    strength?: number; is_combust?: boolean; is_vargottama?: boolean;
    navamsa_sign?: string; d7_sign?: string; d10_sign?: string; d12_sign?: string;
    d2_sign?: string; d3_sign?: string; d4_sign?: string; d16_sign?: string;
    d20_sign?: string; d24_sign?: string; d27_sign?: string; d30_sign?: string;
    d40_sign?: string; d45_sign?: string; d60_sign?: string;
    vimshopaka_score?: number; vimshopaka_max?: number; vargottama_count?: number;
  }>;
  birth_nakshatra: { name: string; pada: number; ruling_planet: string; deity?: string };
  moon_sign: string; sun_sign: string;
  active_yogas: Array<{ name: string; description: string; involved_planets?: string[] }>;
  dasha?: { maha_dasha: string; antar_dasha?: string; pratyantar_dasha?: string; maha_dasha_end?: string };
  engine?: string;
  yogini_dasha?: { yogini: string; planet: string; years: number };
  ashtottari_dasha?: { current: string; years: number; remaining_years: number };
  chara_dasha?: { current_sign: string; years: number; remaining_years: number; sequence?: { sign: string; years: number }[] };
  mangal_dosha?: { present: boolean; from_lagna?: boolean; from_moon?: boolean; from_venus?: boolean; cancelled?: boolean; cancellation_reason?: string };
  combustion?: { name: string; angularDist: number }[];
  graha_yuddha?: { planet1: string; planet2: string; winner: string }[];
  life_scores?: { career: number; marriage: number; wealth: number; health: number; spiritual: number };
  navamsa?: { ascendant: string; planets: { name: string; navamsa_sign: string; is_vargottama: boolean }[] };
  vargas?: { d7: { name: string; sign: string }[]; d10: { name: string; sign: string }[]; d12: { name: string; sign: string }[] };
  vargas_full?: Record<string, { name: string; sign: string; is_vargottama?: boolean }[]>;
  vimshopaka?: { name: string; score: number; max: number; vargottama_count: number }[];
  varshaphal_cache?: Record<string, any>;
  timezone_used?: { iana: string; offset_minutes: number; label: string };
  panchanga?: any;
  vimshottari_sequence?: { planet: string; start: string; end: string }[];
}

interface BirthChart {
  id: string; full_name: string; date_of_birth: string; birth_time: string;
  birthplace: string; chart_data: ChartData; reading: string | null;
  is_primary?: boolean; latitude?: number; longitude?: number;
}

const SIGNS_ORDER = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};
const PLANET_COLORS: Record<string, string> = {
  Sun: "text-amber-400", Moon: "text-blue-200", Mars: "text-red-400",
  Mercury: "text-emerald-400", Jupiter: "text-yellow-300", Venus: "text-pink-300",
  Saturn: "text-slate-400", Rahu: "text-violet-400", Ketu: "text-orange-400",
};
const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿", Jupiter: "♃",
  Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

const TIMEZONE_OFFSETS = [
  { minutes: -480, label: "UTC-8:00 — US Pacific" }, { minutes: -420, label: "UTC-7:00 — US Mountain" },
  { minutes: -360, label: "UTC-6:00 — US Central" }, { minutes: -300, label: "UTC-5:00 — US Eastern" },
  { minutes: -240, label: "UTC-4:00 — Atlantic" }, { minutes: -180, label: "UTC-3:00 — Brazil" },
  { minutes: 0, label: "UTC+0:00 — London/GMT" }, { minutes: 60, label: "UTC+1:00 — Central Europe" },
  { minutes: 120, label: "UTC+2:00 — Eastern Europe" }, { minutes: 180, label: "UTC+3:00 — Moscow" },
  { minutes: 240, label: "UTC+4:00 — Gulf" }, { minutes: 300, label: "UTC+5:00 — Pakistan" },
  { minutes: 330, label: "UTC+5:30 — India" }, { minutes: 345, label: "UTC+5:45 — Nepal" },
  { minutes: 360, label: "UTC+6:00 — Bangladesh" }, { minutes: 420, label: "UTC+7:00 — Thailand" },
  { minutes: 480, label: "UTC+8:00 — China" }, { minutes: 540, label: "UTC+9:00 — Japan" },
  { minutes: 600, label: "UTC+10:00 — Eastern Australia" },
];
const formatOffsetLabel = (m: number) => TIMEZONE_OFFSETS.find(t => t.minutes === m)?.label || `UTC${m >= 0 ? "+" : "-"}${String(Math.floor(Math.abs(m) / 60)).padStart(2, "0")}:${String(Math.abs(m) % 60).padStart(2, "0")}`;

/* ═══════════════════════════════════════════════════════
 * North Indian Chart (interactive SVG-style grid)
 * ═══════════════════════════════════════════════════════ */
function NorthIndianChart({ chartData, hoveredHouse, onHoverHouse }: { chartData: ChartData; hoveredHouse: number | null; onHoverHouse: (h: number | null) => void }) {
  const ascSign = chartData.ascendant.sign;
  const ascIndex = SIGNS_ORDER.indexOf(ascSign);
  const houseToSign = Array.from({ length: 12 }, (_, i) => SIGNS_ORDER[(ascIndex + i) % 12]);
  const planetsByHouse: Record<number, Array<{ name: string; retrograde: boolean }>> = {};
  chartData.planets.forEach((p) => {
    if (!planetsByHouse[p.house]) planetsByHouse[p.house] = [];
    planetsByHouse[p.house].push({ name: p.name, retrograde: !!p.is_retrograde });
  });
  const housePositions: Record<number, { row: number; col: number }> = {
    1: { row: 0, col: 1 }, 2: { row: 0, col: 2 }, 3: { row: 0, col: 3 },
    4: { row: 1, col: 3 }, 5: { row: 2, col: 3 }, 6: { row: 3, col: 3 },
    7: { row: 3, col: 2 }, 8: { row: 3, col: 1 }, 9: { row: 3, col: 0 },
    10: { row: 2, col: 0 }, 11: { row: 1, col: 0 }, 12: { row: 0, col: 0 },
  };

  return (
    <div className="grid grid-cols-4 gap-1 max-w-xl mx-auto rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/5 via-card/50 to-primary/5 p-1.5 relative">
      {/* Sacred geometry watermark behind chart */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] flex items-center justify-center text-[10rem] font-serif text-primary">✦</div>
      {Array.from({ length: 16 }, (_, idx) => {
        const row = Math.floor(idx / 4);
        const col = idx % 4;
        const houseEntry = Object.entries(housePositions).find(([, pos]) => pos.row === row && pos.col === col);
        if ((row === 1 || row === 2) && (col === 1 || col === 2)) {
          if (row === 1 && col === 1) {
            return (
              <div key={idx} className="col-span-2 row-span-2 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 via-card to-primary/5 border border-primary/30 p-3 relative" style={{ animation: "card-glow 4s ease-in-out infinite" }}>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Lagna</p>
                  <p className="text-3xl mb-0.5">{ZODIAC_GLYPHS[ascSign] || "✦"}</p>
                  <p className="font-serif font-semibold text-foreground">{ascSign}</p>
                  <p className="text-xs text-muted-foreground">{chartData.ascendant.degree.toFixed(1)}°</p>
                </div>
              </div>
            );
          }
          return null;
        }
        if (!houseEntry) return <div key={idx} />;
        const houseNum = parseInt(houseEntry[0]);
        const planets = planetsByHouse[houseNum] || [];
        const sign = houseToSign[houseNum - 1];
        const isHovered = hoveredHouse === houseNum;
        return (
          <div
            key={idx}
            className={`rounded-lg p-1.5 min-h-[78px] md:min-h-[88px] flex flex-col transition-all duration-200 border cursor-default ${isHovered ? "bg-primary/15 border-primary/60 shadow-[0_0_18px_-6px_hsl(var(--primary)/0.6)]" : "bg-card/65 border-primary/10 hover:border-primary/30"}`}
            onMouseEnter={() => onHoverHouse(houseNum)}
            onMouseLeave={() => onHoverHouse(null)}
            aria-label={`House ${houseNum} — ${sign} — ${planets.map(p => p.name).join(", ") || "empty"}`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-mono text-muted-foreground/70">{houseNum}</span>
              <span className="text-[10px] text-primary/80">{isHovered ? sign : sign?.slice(0, 3)}</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center leading-tight space-y-0.5">
                {planets.map((pl, i) => (
                  <span key={i} className={`text-[11px] font-medium ${PLANET_COLORS[pl.name] || "text-foreground"} block`}>
                    {pl.name.slice(0, 2)}{pl.retrograde && <sup className="text-[8px] text-destructive ml-0.5">R</sup>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Planet Card (responsive grid item)
 * ═══════════════════════════════════════════════════════ */
function PlanetCard({ planet, grahaYuddha }: { planet: ChartData["planets"][0]; grahaYuddha?: ChartData["graha_yuddha"] }) {
  const dignityClass: Record<string, string> = {
    exalted: "border-primary/45 bg-primary/10",
    own_sign: "border-primary/30 bg-primary/5",
    moolatrikona: "border-primary/25 bg-primary/5",
    debilitated: "border-destructive/40 bg-destructive/5",
    neutral: "border-border",
  };
  const dignity = planet.dignity ? (dignityClass[planet.dignity] || "border-border") : "border-border";
  const warEntry = grahaYuddha?.find(w => w.planet1 === planet.name || w.planet2 === planet.name);
  const warResult = warEntry ? (warEntry.winner === planet.name ? "Won" : "Lost") : null;

  return (
    <div className={`rounded-2xl border ${dignity} bg-card/70 backdrop-blur-md p-4 transition-all hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.45)] hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${PLANET_COLORS[planet.name] || "text-foreground"}`}>{PLANET_GLYPHS[planet.name] || "★"}</span>
          <div>
            <p className={`font-serif font-semibold text-sm ${PLANET_COLORS[planet.name] || "text-foreground"}`}>{planet.name}{planet.is_retrograde && <sup className="text-[9px] text-destructive ml-0.5">R</sup>}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{planet.dignity?.replace("_", " ") || "Neutral"}</p>
          </div>
        </div>
        {planet.dignity === "exalted" && <Badge className="text-[9px] bg-primary/20 text-primary border border-primary/40">Exalted</Badge>}
        {planet.dignity === "own_sign" && <Badge className="text-[9px] bg-cyan-400/15 text-cyan-300 border border-cyan-400/40">Own Sign</Badge>}
        {planet.dignity === "debilitated" && <Badge className="text-[9px] bg-destructive/15 text-destructive border border-destructive/40">Debilitated</Badge>}
      </div>
      <div className="space-y-1.5 text-[12px]">
        <div className="flex justify-between"><span className="text-muted-foreground">Sign</span><span className="text-foreground">{planet.sign}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">House</span><span className="text-foreground">{planet.house}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Degree</span><span className="text-foreground tabular-nums">{planet.degree.toFixed(2)}°</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Nakshatra</span><span className="text-foreground">{planet.nakshatra}{planet.nakshatra_pada ? ` ${planet.nakshatra_pada}` : ""}</span></div>
        {typeof planet.strength === "number" && (
          <div>
            <div className="flex justify-between mb-1"><span className="text-muted-foreground">Dignity</span><span className="text-foreground">{planet.strength}%</span></div>
            <Progress value={planet.strength} className="h-1.5" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {planet.is_combust && <Badge variant="outline" className="text-[9px] px-1.5 border-amber-500/50 text-amber-400 gap-0.5"><Flame className="h-2.5 w-2.5" /> Combust</Badge>}
        {planet.is_vargottama && <Badge variant="outline" className="text-[9px] px-1.5 border-primary/50 text-primary gap-0.5"><Star className="h-2.5 w-2.5" /> Vargottama</Badge>}
        {warResult && <Badge variant="outline" className={`text-[9px] px-1.5 ${warResult === "Won" ? "border-primary/50 text-primary" : "border-destructive/50 text-destructive"}`}>⚔ {warResult}</Badge>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Planet Pills Row (status chips)
 * ═══════════════════════════════════════════════════════ */
function PlanetPillsRow({ chartData }: { chartData: ChartData }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
      {chartData.planets.map((p) => {
        const status = p.dignity === "exalted" ? { label: "Exalted", color: "text-primary border-primary/40 bg-primary/10" }
          : p.dignity === "debilitated" ? { label: "Debilitated", color: "text-destructive border-destructive/40 bg-destructive/10" }
          : p.dignity === "own_sign" ? { label: "Own Sign", color: "text-cyan-300 border-cyan-400/40 bg-cyan-400/10" }
          : { label: "Neutral", color: "text-muted-foreground border-border bg-card/40" };
        return (
          <div key={p.name} className={`shrink-0 snap-start inline-flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-md ${status.color}`}>
            <span className={`text-base ${PLANET_COLORS[p.name] || ""}`}>{PLANET_GLYPHS[p.name]}</span>
            <span className="text-xs font-medium">{p.name}</span>
            <span className="text-[10px] opacity-80">· {p.sign} · H{p.house}</span>
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-background/40">{status.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Life Area Scores — animated bars
 * ═══════════════════════════════════════════════════════ */
function LifeAreaScores({ scores }: { scores: NonNullable<ChartData["life_scores"]> }) {
  const areas = [
    { key: "career" as const, label: "Career (Dharma)", icon: Briefcase },
    { key: "wealth" as const, label: "Wealth (Artha)", icon: Coins },
    { key: "marriage" as const, label: "Relationships (Kama)", icon: Heart },
    { key: "spiritual" as const, label: "Spiritual (Moksha)", icon: Compass },
    { key: "health" as const, label: "Health & Vitality", icon: Activity },
  ];
  const qualitative = (s: number) => s >= 85 ? "★ Excellent" : s >= 70 ? "▲ Strong" : s >= 50 ? "→ Moderate" : s >= 35 ? "↓ Tested" : "⚠ Difficult";
  const colorAt = (s: number) => s >= 70 ? "from-primary via-amber-400 to-primary" : s >= 50 ? "from-cyan-400 via-cyan-300 to-cyan-400" : "from-muted-foreground to-muted-foreground/60";
  return (
    <div className="rounded-2xl border border-primary/15 bg-card/55 backdrop-blur-md p-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-serif text-base text-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Life Area Scores</h3>
        <span className="text-[10px] text-muted-foreground">Last updated ↻</span>
      </div>
      {areas.map(({ key, label, icon: Icon }) => {
        const score = scores[key];
        return (
          <div key={key} className="flex items-center gap-3">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground/85 w-32 shrink-0 truncate">{label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-card overflow-hidden border border-border/40">
              <div className={`h-full rounded-full bg-gradient-to-r ${colorAt(score)} transition-all duration-1000`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-xs font-semibold text-foreground w-10 text-right tabular-nums">{score}</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline w-20 text-right">{qualitative(score)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Generation Stepper
 * ═══════════════════════════════════════════════════════ */
function GenerationStepper({ step }: { step: string }) {
  const steps = [
    { label: "Locating", icon: MapPin, key: "Locating birthplace..." },
    { label: "Calculating", icon: Calculator, key: "Calculating planetary positions..." },
    { label: "Generating", icon: Wand2, key: "Generating your Kundali..." },
  ];
  const activeIdx = steps.findIndex((s) => step.includes(s.label) || step === s.key);
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
              {isActive ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
              {s.label}
            </div>
            {i < steps.length - 1 && <div className={`w-6 h-px ${isDone ? "bg-primary" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Add Person Form (in Sheet)
 * ═══════════════════════════════════════════════════════ */
function AddPersonSheet({
  open, onOpenChange, onCreated, sessionToken,
}: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (chart: BirthChart) => void; sessionToken?: string }) {
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthplace, setBirthplace] = useState("");
  const [calendarSystem, setCalendarSystem] = useState<CalendarSystem>("gregorian");
  const [bsYear, setBsYear] = useState<number | null>(null);
  const [bsMonth, setBsMonth] = useState<number | null>(null);
  const [bsDay, setBsDay] = useState<number | null>(null);
  const [timezoneOverride, setTimezoneOverride] = useState<number | null>(null);
  const [tzOpen, setTzOpen] = useState(false);
  const [locationResults, setLocationResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");

  const reset = () => {
    setFullName(""); setDateOfBirth(""); setBirthTime(""); setBirthplace("");
    setBsYear(null); setBsMonth(null); setBsDay(null);
    setTimezoneOverride(null); setTzOpen(false);
    setSelectedCoords(null); setLocationResults([]);
  };

  const searchLocation = (query: string) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    setSelectedCoords(null);
    if (query.length < 3) { setLocationResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        setLocationResults(data.map((r: any) => ({ display_name: r.display_name, lat: r.lat, lon: r.lon })));
      } catch { setLocationResults([]); }
    }, 400);
    setSearchTimeout(t);
  };

  const geocode = async (place: string) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`);
      const data = await res.json();
      if (data.length) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {}
    return null;
  };

  const handleGenerate = async () => {
    let effectiveDob = dateOfBirth;
    let bsDateString: string | null = null;
    if (calendarSystem === "bs") {
      if (!bsYear || !bsMonth || !bsDay) {
        toast({ title: t("birthChart.addPerson.toast.missingDateTitle"), description: t("birthChart.addPerson.toast.missingDateDesc"), variant: "destructive" });
        return;
      }
      const c = bsToAdString(bsYear, bsMonth, bsDay);
      if (!c) { toast({ title: t("birthChart.addPerson.toast.invalidBsDate"), variant: "destructive" }); return; }
      effectiveDob = c; bsDateString = buildBsDateString(bsYear, bsMonth, bsDay);
    }
    if (!fullName || !effectiveDob || !birthTime || !birthplace) {
      toast({ title: t("birthChart.addPerson.toast.missingFieldsTitle"), description: t("birthChart.addPerson.toast.missingFieldsDesc"), variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGenerationStep("Locating birthplace...");
    try {
      const coords = selectedCoords || await geocode(birthplace);
      if (!coords) {
        toast({ title: t("birthChart.addPerson.toast.locationNotFoundTitle"), description: t("birthChart.addPerson.toast.locationNotFoundDesc"), variant: "destructive" });
        setIsGenerating(false); setGenerationStep(""); return;
      }
      setGenerationStep("Calculating planetary positions...");
      const body: Record<string, any> = {
        full_name: fullName, date_of_birth: effectiveDob, birth_time: birthTime,
        birthplace, latitude: coords.lat, longitude: coords.lng,
      };
      if (timezoneOverride !== null) body.utc_offset_minutes = timezoneOverride;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-chart`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify(body),
      });
      setGenerationStep("Generating your Kundali...");
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to generate chart"); }
      const chart = await res.json() as BirthChart;
      if (calendarSystem === "bs" && chart.id) {
        await supabase.from("birth_charts").update({ calendar_system: "bs", bs_date: bsDateString }).eq("id", chart.id);
      }
      reset();
      onCreated(chart);
      onOpenChange(false);
      toast({ title: t("birthChart.addPerson.toast.generatedTitle"), description: t("birthChart.addPerson.toast.generatedDesc") });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false); setGenerationStep("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-serif text-xl flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {t("birthChart.addPerson.title")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("birthChart.addPerson.fullNameLabel")}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("birthChart.addPerson.fullNamePlaceholder")} className="bg-card" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("birthChart.addPerson.birthplaceLabel")}</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={birthplace} onChange={(e) => { setBirthplace(e.target.value); searchLocation(e.target.value); }} placeholder={t("birthChart.addPerson.birthplacePlaceholder")} className="bg-card pl-9" />
              {locationResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                  {locationResults.map((r, i) => (
                    <button key={i} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-b-0 border-border/50"
                      onClick={() => { setBirthplace(r.display_name); setSelectedCoords({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) }); setLocationResults([]); }}>
                      <p className="text-foreground truncate">{r.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">{parseFloat(r.lat).toFixed(4)}°, {parseFloat(r.lon).toFixed(4)}°</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              {selectedCoords ? (
                <p className="text-[10px] text-primary flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {selectedCoords.lat.toFixed(4)}°, {selectedCoords.lng.toFixed(4)}°
                </p>
              ) : <span className="text-[10px] text-muted-foreground/70">{t("birthChart.addPerson.pickLocationHint")}</span>}
              <button type="button" onClick={() => setTzOpen(o => !o)} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground">
                <Clock className="h-3 w-3" /> TZ: {timezoneOverride !== null ? formatOffsetLabel(timezoneOverride) : t("birthChart.addPerson.tzAuto")}
                <ChevronDown className={`h-3 w-3 transition-transform ${tzOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            <Collapsible open={tzOpen} onOpenChange={setTzOpen}>
              <CollapsibleContent className="pt-1">
                <Select value={timezoneOverride !== null ? String(timezoneOverride) : "auto"} onValueChange={(v) => setTimezoneOverride(v === "auto" ? null : Number(v))}>
                  <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="auto">{t("birthChart.addPerson.tzAutoDetect")}</SelectItem>
                    {TIMEZONE_OFFSETS.map(tz => <SelectItem key={tz.minutes} value={String(tz.minutes)}>{tz.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {t("birthChart.addPerson.calendarLabel")}</Label>
              <div className="inline-flex rounded-full border border-primary/20 bg-card/60 p-1 text-[12px]">
                <button type="button" onClick={() => setCalendarSystem("gregorian")} className={`px-3 py-1 rounded-full transition ${calendarSystem === "gregorian" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t("birthChart.addPerson.calendarGregorian")}</button>
                <button type="button" onClick={() => setCalendarSystem("bs")} className={`px-3 py-1 rounded-full transition ${calendarSystem === "bs" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t("birthChart.addPerson.calendarBS")}</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{calendarSystem === "gregorian" ? t("birthChart.addPerson.dateLabel") : t("birthChart.addPerson.bsDateLabel")}</Label>
                {calendarSystem === "gregorian" ? (
                  <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="bg-card" min="1900-01-01" max="2100-12-31" />
                ) : (
                  <BSDatePicker year={bsYear} month={bsMonth} day={bsDay} onChange={({ year, month, day }) => { setBsYear(year); setBsMonth(month); setBsDay(day); }} />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("birthChart.addPerson.timeLabel")}</Label>
                <Input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} className="bg-card" />
              </div>
            </div>
            {calendarSystem === "bs" && bsYear && bsMonth && bsDay && (() => {
              const ad = bsToAdString(bsYear, bsMonth, bsDay);
              return ad ? <p className="text-[11px] text-muted-foreground"><span className="text-primary/90">{formatBsDate(bsYear, bsMonth, bsDay)}</span> = <span>{formatAdDate(ad)}</span></p> : null;
            })()}
          </div>

          {isGenerating && generationStep && <GenerationStepper step={generationStep} />}

          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.5)]">
            {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("birthChart.addPerson.buttonCalculating")}</> : <>{t("birthChart.addPerson.buttonGenerate")} <Sparkles className="ml-2 h-4 w-4" /></>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════
 * Top Nav (sticky, scroll-compress)
 * ═══════════════════════════════════════════════════════ */
function TopNav({ personName, onShare, onDownload }: { personName?: string; onShare: () => void; onDownload: () => void }) {
  const { t } = useTranslation("pages");
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className={`sticky top-0 z-30 transition-all duration-300 ${scrolled ? "h-14 bg-background/85 backdrop-blur-xl border-b border-primary/10" : "h-16 bg-transparent"}`}>
      <div className="h-full flex items-center justify-between px-4 max-w-[1400px] mx-auto">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-serif truncate">
          <span className="text-foreground/60">{t("birthChart.nav.dashboard")}</span>
          <span className="text-primary mx-1.5">›</span>
          <span className="text-foreground/80">{t("birthChart.nav.birthChart")}</span>
          {personName && <><span className="text-primary mx-1.5">›</span><span className="text-primary">{personName}</span></>}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onShare} className="h-8 px-2 text-muted-foreground hover:text-foreground">
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload} className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Main Page
 * ═══════════════════════════════════════════════════════ */

const TABS: { key: string; label: string; short: string }[] = [
  { key: "overview", label: "Overview", short: "OV" },
  { key: "chart", label: "Chart & Planets", short: "CH" },
  { key: "dashas", label: "Dashas", short: "DA" },
  { key: "forecast", label: "Forecast", short: "FC" },
  { key: "reading", label: "Vedic Reading", short: "RD" },
];

export default function BirthChartPage() {
  const { t } = useTranslation("pages");
  const { user, session, isLoading: authLoading } = useAuth();
  const { isElite } = useSubscription();
  const { refresh: refreshActiveCharts, activeChart, setActiveChart } = useActiveChart();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const [charts, setCharts] = useState<BirthChart[]>([]);
  const [selectedChart, setSelectedChart] = useState<BirthChart | null>(null);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [recomputePulse, setRecomputePulse] = useState(false);
  const [reading, setReading] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const tab = params.get("tab") || "overview";
  const setTab = (t: string) => setParams((prev) => { const next = new URLSearchParams(prev); next.set("tab", t); return next; }, { replace: true });

  // Load charts
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("birth_charts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data) setCharts(data as unknown as BirthChart[]);
      setIsLoadingCharts(false);
    })();
  }, [user]);

  // Sync with active chart
  useEffect(() => {
    if (!activeChart || charts.length === 0) return;
    const match = charts.find((c) => c.id === activeChart.id);
    if (!match || selectedChart?.id === match.id) return;
    setSelectedChart(match);
    setReading(match.reading || "");
    setReadingError(null);
  }, [activeChart?.id, charts]);

  // Default-select first chart if none active
  useEffect(() => {
    if (!selectedChart && charts.length > 0) {
      const primary = charts.find(c => c.is_primary) || charts[0];
      setSelectedChart(primary);
      setReading(primary.reading || "");
    }
  }, [charts, selectedChart]);

  if (authLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-10 w-64 mx-auto" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const handleSelectChart = (id: string) => {
    const c = charts.find(x => x.id === id);
    if (!c) return;
    setSelectedChart(c);
    setReading(c.reading || "");
    setReadingError(null);
  };

  const handleDeleteChart = async (id: string) => {
    const { error } = await supabase.from("birth_charts").delete().eq("id", id);
    if (error) { toast({ title: t("birthChart.toast.deleteFailed"), variant: "destructive" }); return; }
    setCharts(p => p.filter(c => c.id !== id));
    if (selectedChart?.id === id) { setSelectedChart(null); setReading(""); }
    sessionStorage.removeItem("dashboard-data");
    refreshActiveCharts();
    toast({ title: t("birthChart.toast.chartRemoved") });
  };

  const handleRecompute = async () => {
    if (!selectedChart || isRecomputing) return;
    setIsRecomputing(true); setRecomputePulse(true);
    try {
      const body: Record<string, any> = {
        full_name: selectedChart.full_name, date_of_birth: selectedChart.date_of_birth,
        birth_time: selectedChart.birth_time, birthplace: selectedChart.birthplace,
        latitude: selectedChart.latitude, longitude: selectedChart.longitude,
      };
      const tz = (selectedChart.chart_data as any)?.timezone_used?.offset_minutes;
      if (typeof tz === "number") body.utc_offset_minutes = tz;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-chart`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to recompute");
      const fresh = await res.json() as BirthChart;
      const wasPrimary = selectedChart.is_primary;
      const oldReading = selectedChart.reading;
      await supabase.from("birth_charts").update({ reading: oldReading, is_primary: wasPrimary }).eq("id", fresh.id);
      await supabase.from("birth_charts").delete().eq("id", selectedChart.id);
      const enriched = { ...fresh, reading: oldReading, is_primary: wasPrimary } as BirthChart;
      setCharts(p => [enriched, ...p.filter(c => c.id !== selectedChart.id && c.id !== fresh.id)]);
      setSelectedChart(enriched);
      sessionStorage.removeItem("dashboard-data");
      refreshActiveCharts();
      toast({ title: t("birthChart.toast.chartUpgraded"), description: t("birthChart.toast.chartUpgradedDesc") });
    } catch (e: any) {
      toast({ title: t("birthChart.toast.recomputeFailed"), description: e.message, variant: "destructive" });
    } finally {
      setIsRecomputing(false);
      setTimeout(() => setRecomputePulse(false), 1200);
    }
  };

  const streamReading = async (append: boolean) => {
    if (!selectedChart) return;
    if (append) setIsContinuing(true); else { setIsStreaming(true); setReading(""); }
    setReadingError(null);
    try {
      const body: Record<string, unknown> = append
        ? { chart_id: selectedChart.id, continue: true, existing_reading: reading }
        : { chart_id: selectedChart.id };
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-reading`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({ error: "Stream failed" }))).error);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const base = append ? reading : "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { acc += content; setReading(base + acc); }
          } catch {}
        }
      }
      const final = base + acc;
      setReading(final);
      // persist
      await supabase.from("birth_charts").update({ reading: final }).eq("id", selectedChart.id);
      setCharts(p => p.map(c => c.id === selectedChart.id ? { ...c, reading: final } : c));
    } catch (e: any) {
      setReadingError(e.message);
    } finally {
      setIsStreaming(false); setIsContinuing(false);
    }
  };

  const handleShare = async () => {
    if (!selectedChart) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: t("birthChart.toast.linkCopied") });
    } catch { toast({ title: t("birthChart.toast.linkCopyFailed"), variant: "destructive" }); }
  };

  const handleDownload = () => {
    document.querySelector<HTMLButtonElement>("[data-sacred-pdf-trigger]")?.click();
    if (!selectedChart) toast({ title: t("birthChart.toast.selectChartFirst") });
  };

  // Build dasha periods for timeline
  const dashaPeriods: DashaPeriod[] = useMemo(() => {
    if (!selectedChart?.chart_data) return [];
    const seq = (selectedChart.chart_data as any).vimshottari_sequence;
    if (Array.isArray(seq) && seq.length) {
      return seq.map((p: any) => ({
        planet: p.planet,
        startYear: new Date(p.start).getFullYear(),
        endYear: new Date(p.end).getFullYear(),
        isCurrent: selectedChart.chart_data.dasha?.maha_dasha === p.planet,
      }));
    }
    // Fallback: build from current dasha alone
    const cur = selectedChart.chart_data.dasha;
    if (!cur) return [];
    const end = cur.maha_dasha_end ? new Date(cur.maha_dasha_end).getFullYear() : new Date().getFullYear() + 5;
    return [{ planet: cur.maha_dasha, startYear: end - 18, endYear: end, isCurrent: true }];
  }, [selectedChart]);

  const personItems: PersonItem[] = charts.map(c => ({
    id: c.id, full_name: c.full_name, date_of_birth: c.date_of_birth,
    birthplace: c.birthplace, is_primary: c.is_primary,
    ascendant_glyph: ZODIAC_GLYPHS[c.chart_data?.ascendant?.sign || ""] || "✦",
  }));

  const cd = selectedChart?.chart_data;

  return (
    <div className="relative min-h-screen text-foreground">
      <CosmicBackground />
      <TopNav personName={selectedChart?.full_name} onShare={handleShare} onDownload={handleDownload} />

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pb-12">
        {/* Page Header */}
        <header className="text-center pt-6 pb-8 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-primary">✦</span>
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-primary/40" />
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-primary/40" />
            <span className="text-primary">✦</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground tracking-tight mb-2">Vedic Birth Chart</h1>
          <p className="text-[11px] uppercase tracking-[0.4em] text-cyan-300/85">
            Akashic Record of {selectedChart?.full_name || "your soul"}
          </p>
          {selectedChart && (
            <p className="text-xs text-muted-foreground mt-3">
              Born {selectedChart.date_of_birth} · {selectedChart.birth_time} · {selectedChart.birthplace}
            </p>
          )}
        </header>

        {/* Mobile chips */}
        {charts.length > 0 && (
          <div className="lg:hidden mb-4">
            <PersonChipsRow people={personItems} activeId={selectedChart?.id} onSelect={handleSelectChart} onAdd={() => setAddOpen(true)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block space-y-5 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-1">
            {isLoadingCharts ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : charts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-primary/30 p-5 text-center space-y-3">
                <Sparkles className="h-6 w-6 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">{t("birthChart.sidebar.noCharts")}</p>
                <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> {t("birthChart.sidebar.createChartButton")}</Button>
              </div>
            ) : (
              <PersonSidebarList
                people={personItems}
                activeId={selectedChart?.id}
                onSelect={handleSelectChart}
                onAdd={() => setAddOpen(true)}
                onMakePrimary={(id) => setActiveChart(id).then(refreshActiveCharts)}
                onDelete={(id) => handleDeleteChart(id)}
              />
            )}

            {/* Quick stats card */}
            {cd && (
              <div className="rounded-2xl border border-primary/15 bg-card/55 backdrop-blur-md p-4 space-y-2.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">{t("birthChart.sidebar.quickStats")}</p>
                {[
                  { label: t("birthChart.sidebar.ascendant"), val: `${cd.ascendant.sign} ${ZODIAC_GLYPHS[cd.ascendant.sign] || ""}` },
                  { label: t("birthChart.sidebar.moon"), val: `${cd.moon_sign} ${ZODIAC_GLYPHS[cd.moon_sign] || ""}` },
                  { label: t("birthChart.sidebar.sun"), val: `${cd.sun_sign} ${ZODIAC_GLYPHS[cd.sun_sign] || ""}` },
                  { label: t("birthChart.sidebar.nakshatra"), val: `${cd.birth_nakshatra.name} P${cd.birth_nakshatra.pada}` },
                  ...(cd.dasha ? [{ label: t("birthChart.sidebar.mahaDasha"), val: cd.dasha.maha_dasha }] : []),
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="text-foreground font-medium">{s.val}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Main column */}
          <main className="min-w-0 space-y-5">
            {!selectedChart && !isLoadingCharts && charts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-primary/30 bg-card/40 p-12 text-center space-y-4">
                <Sparkles className="h-10 w-10 text-primary mx-auto" />
                <h2 className="font-serif text-xl text-foreground">{t("birthChart.empty.heading")}</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{t("birthChart.empty.body")}</p>
                <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> {t("birthChart.empty.createButton")}</Button>
              </div>
            )}

            {selectedChart && cd && (
              <>
                {/* Verification strip */}
                <VerificationStrip
                  ascendantSign={cd.ascendant.sign}
                  ascendantDegree={cd.ascendant.degree}
                  ayanamsha="Lahiri"
                  system="North Indian"
                  timezoneLabel={cd.timezone_used?.label}
                />

                {/* Recompute banner if old engine */}
                {(() => {
                  const hasNewEngine = !!(cd as any)?.ashtakavarga && !!(cd as any)?.vargas_full?.d60 && !!(cd as any)?.vimshopaka;
                  if (hasNewEngine) return null;
                  return (
                    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-card p-4 flex items-center justify-between gap-3 backdrop-blur-md">
                      <div className="flex items-center gap-3 min-w-0">
                        <Sparkles className={`h-5 w-5 text-amber-400 shrink-0 ${recomputePulse ? "animate-spin" : ""}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-serif text-foreground">{t("birthChart.recompute.bannerTitle")}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{t("birthChart.recompute.bannerBody")}</p>
                        </div>
                      </div>
                      <Button onClick={handleRecompute} disabled={isRecomputing} size="sm" className="bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400">
                        {isRecomputing ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> {t("birthChart.recompute.buttonRecomputing")}</> : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {t("birthChart.recompute.buttonUpgrade")}</>}
                      </Button>
                    </div>
                  );
                })()}

                {/* Kundali panel: chart + legend two-column */}
                <section className="rounded-2xl border border-primary/15 bg-card/55 backdrop-blur-md p-5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="font-serif text-lg flex items-center gap-2"><Sun className="h-4 w-4 text-primary" /> {selectedChart.full_name}'s Kundali</h2>
                    <div className="flex items-center gap-2">
                      {cd.engine === "swiss_ephemeris" && <Badge variant="secondary" className="text-[9px]"><Calculator className="h-2.5 w-2.5 mr-1" /> Swiss Ephemeris</Badge>}
                      <div className="hidden" data-sacred-pdf-trigger>
                        <SacredKundaliDownload chartId={selectedChart.id} chartName={selectedChart.full_name} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-5 items-start">
                    <NorthIndianChart chartData={cd} hoveredHouse={hoveredHouse} onHoverHouse={setHoveredHouse} />
                    {/* Legend */}
                    <div className="rounded-xl border border-primary/15 bg-background/30 p-3 space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Planets</p>
                      {cd.planets.map(p => (
                        <div
                          key={p.name}
                          className={`flex items-center justify-between text-[11px] py-1 px-2 rounded transition-colors ${hoveredHouse === p.house ? "bg-primary/10 text-foreground" : "text-foreground/85"}`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={PLANET_COLORS[p.name]}>{PLANET_GLYPHS[p.name]}</span>
                            <span>{p.name.slice(0, 2)}</span>
                          </span>
                          <span className="text-muted-foreground">{p.sign.slice(0, 3)}</span>
                          <span className="text-muted-foreground">H{p.house}</span>
                          <span className="tabular-nums text-muted-foreground">{p.degree.toFixed(0)}°</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <SacredKundaliDownload chartId={selectedChart.id} chartName={selectedChart.full_name} />
                  </div>
                </section>

                {/* Planet pills row */}
                <PlanetPillsRow chartData={cd} />

                {/* Tab bar */}
                <ChartTabsBar tabs={TABS.map(tb => ({ ...tb, label: t(`birthChart.tab.${tb.key}`) }))} value={tab} onChange={setTab} />

                {/* Tab content */}
                <Tabs value={tab} onValueChange={setTab} className="w-full">
                  <TabsContent value="overview" className="mt-2 space-y-5">
                    {cd.life_scores && <LifeAreaScores scores={cd.life_scores} />}
                    {cd.panchanga && (
                      <div className="rounded-2xl border border-primary/15 bg-card/55 backdrop-blur-md p-5">
                        <SectionTitle icon={<Sparkles className="h-3 w-3" />}>{t("birthChart.section.birthPanchanga")}</SectionTitle>
                        <PanchangaGrid panchanga={cd.panchanga} moonSign={cd.moon_sign} />
                      </div>
                    )}
                    {cd.mangal_dosha?.present && (
                      <div className={`rounded-2xl border-2 p-4 backdrop-blur-md ${cd.mangal_dosha.cancelled ? "border-amber-500/30 bg-amber-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                        <div className="flex items-start gap-3">
                          <Shield className={`h-5 w-5 mt-0.5 ${cd.mangal_dosha.cancelled ? "text-amber-500" : "text-destructive"}`} />
                          <div>
                            <p className={`font-serif text-sm ${cd.mangal_dosha.cancelled ? "text-amber-500" : "text-destructive"}`}>
                              Mangal Dosha {cd.mangal_dosha.cancelled ? `(${t("birthChart.mangal.cancelled")})` : t("birthChart.mangal.detected")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("birthChart.mangal.fromPrefix")}{[cd.mangal_dosha.from_lagna && t("birthChart.mangal.fromLagna"), cd.mangal_dosha.from_moon && t("birthChart.mangal.fromMoon"), cd.mangal_dosha.from_venus && t("birthChart.mangal.fromVenus")].filter(Boolean).join(", ") || "—"}
                            </p>
                            {cd.mangal_dosha.cancelled && cd.mangal_dosha.cancellation_reason && (
                              <p className="text-xs text-muted-foreground mt-1">{cd.mangal_dosha.cancellation_reason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="chart" className="mt-2 space-y-5">
                    <div>
                      <SectionTitle icon={<Moon className="h-3 w-3" />}>{t("birthChart.section.planetaryPositions")}</SectionTitle>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cd.planets.map(p => <PlanetCard key={p.name} planet={p} grahaYuddha={cd.graha_yuddha} />)}
                      </div>
                    </div>
                    <div>
                      <SectionTitle icon={<Compass className="h-3 w-3" />}>{t("birthChart.section.divisionalCharts")}</SectionTitle>
                      <VargaTable chartData={cd} isElite={isElite} />
                    </div>
                  </TabsContent>

                  <TabsContent value="dashas" className="mt-2 space-y-5">
                    <div className="rounded-2xl border border-primary/15 bg-card/55 backdrop-blur-md p-5">
                      <SectionTitle icon={<Clock className="h-3 w-3" />}>{t("birthChart.dasha.vimshottariTitle")}</SectionTitle>
                      <DashaTimeline periods={dashaPeriods} current={cd.dasha?.maha_dasha} />
                    </div>
                    {cd.dasha && (
                      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/8 via-card to-card p-5 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-serif text-base text-foreground">{cd.dasha.maha_dasha} {t("birthChart.dasha.mahadashaActive")}</h3>
                          <Badge className="text-[10px] bg-primary/20 text-primary border border-primary/40">{t("birthChart.dasha.inProgress")}</Badge>
                        </div>
                        {cd.dasha.antar_dasha && (
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">{t("birthChart.dasha.antarPrefix")}<span className="text-foreground">{cd.dasha.antar_dasha}</span></p>
                            {cd.dasha.pratyantar_dasha && <p className="text-muted-foreground">{t("birthChart.dasha.pratyantarPrefix")}<span className="text-foreground">{cd.dasha.pratyantar_dasha}</span></p>}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Mangal feature card from dasha sequence */}
                    {(() => {
                      const seq = (cd as any).vimshottari_sequence;
                      const mars = Array.isArray(seq) ? seq.find((p: any) => p.planet === "Mars") : null;
                      if (!mars) return null;
                      return (
                        <MangalFeatureCard
                          active={cd.dasha?.maha_dasha === "Mars"}
                          startYear={new Date(mars.start).getFullYear()}
                          endYear={new Date(mars.end).getFullYear()}
                        />
                      );
                    })()}
                    <DashaSwitcher
                      vimshottari={cd.dasha as any}
                      yogini={cd.yogini_dasha}
                      ashtottari={cd.ashtottari_dasha}
                      chara={cd.chara_dasha}
                    />
                  </TabsContent>

                  <TabsContent value="forecast" className="mt-2 space-y-5">
                    <VarshaphalCard
                      chartId={selectedChart.id}
                      birthYear={Number(selectedChart.date_of_birth?.split("-")?.[0] || new Date().getFullYear())}
                      cache={cd.varshaphal_cache as any}
                    />
                    <SadeSatiTracker moonSign={cd.moon_sign} isElite={isElite} />
                    <div className="rounded-2xl border border-primary/15 bg-card/55 backdrop-blur-md p-5">
                      <SectionTitle icon={<Sparkles className="h-3 w-3" />}>{t("birthChart.section.adityaYogas")}</SectionTitle>
                      <YogasAccordionV2 yogas={cd.active_yogas} />
                    </div>
                  </TabsContent>

                  <TabsContent value="reading" className="mt-2 space-y-5">
                    <div className="rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-md p-5 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h3 className="font-serif text-lg text-foreground">{t("birthChart.reading.title")}</h3>
                          <p className="text-[11px] text-muted-foreground">Personalised for {selectedChart.full_name} · {selectedChart.reading ? t("birthChart.reading.aiGenerated") : t("birthChart.reading.notGeneratedYet")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {reading && (
                            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(reading).then(() => toast({ title: t("birthChart.reading.copiedToast") }))} className="h-8">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 gap-1.5 border-primary/30 text-primary"><Download className="h-3.5 w-3.5" /> {t("birthChart.reading.pdfButton")}</Button>
                        </div>
                      </div>
                      {!reading && !isStreaming && (
                        <Button onClick={() => streamReading(false)} className="w-full h-11 bg-gradient-to-r from-primary to-primary/80">
                          <Wand2 className="mr-2 h-4 w-4" /> {t("birthChart.reading.generateButton")}
                        </Button>
                      )}
                      {isStreaming && !reading && (
                        <div className="text-center py-8">
                          <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground font-serif italic">{t("birthChart.reading.composingMessage")}</p>
                        </div>
                      )}
                      {readingError && (
                        <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                          <p className="text-sm text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {readingError}</p>
                          <Button size="sm" variant="outline" onClick={() => streamReading(false)}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {t("birthChart.reading.retryButton")}</Button>
                        </div>
                      )}
                      <ReadingChapters reading={reading} isStreaming={isStreaming || isContinuing} />
                      {reading && !isStreaming && !isContinuing && (
                        <div className="flex justify-center pt-2">
                          <Button variant="outline" onClick={() => streamReading(true)} className="gap-2 border-primary/30">
                            <Sparkles className="h-4 w-4" /> {t("birthChart.reading.goDeeperButton")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </main>
        </div>
      </div>

      <AddPersonSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        sessionToken={session?.access_token}
        onCreated={(c) => {
          setCharts(p => [c, ...p]);
          setSelectedChart(c);
          setReading(c.reading || "");
          sessionStorage.removeItem("dashboard-data");
          refreshActiveCharts();
          setTab("overview");
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Varga Table (extracted from old page, simplified)
 * ═══════════════════════════════════════════════════════ */

const VARGA_DEFS: { key: string; label: string; meaning: string }[] = [
  { key: "d1",  label: "D1",  meaning: "Rasi — physical body & life" },
  { key: "d2",  label: "D2",  meaning: "Hora — wealth" },
  { key: "d3",  label: "D3",  meaning: "Drekkana — siblings" },
  { key: "d4",  label: "D4",  meaning: "Chaturthamsha — fortune" },
  { key: "d7",  label: "D7",  meaning: "Saptamsha — children" },
  { key: "d9",  label: "D9",  meaning: "Navamsa — marriage & dharma" },
  { key: "d10", label: "D10", meaning: "Dashamsha — career" },
  { key: "d12", label: "D12", meaning: "Dwadashamsha — parents" },
  { key: "d16", label: "D16", meaning: "Shodashamsha — vehicles" },
  { key: "d20", label: "D20", meaning: "Vimshamsha — spirituality" },
  { key: "d24", label: "D24", meaning: "Chaturvimshamsha — education" },
  { key: "d27", label: "D27", meaning: "Bhamsha — strengths" },
  { key: "d30", label: "D30", meaning: "Trimshamsha — character" },
  { key: "d40", label: "D40", meaning: "Khavedamsha — maternal lineage" },
  { key: "d45", label: "D45", meaning: "Akshavedamsha — paternal lineage" },
  { key: "d60", label: "D60", meaning: "Shashtiamsa — past karma" },
];

function VargaTable({ chartData, isElite }: { chartData: ChartData; isElite: boolean }) {
  const { t } = useTranslation("pages");
  const vargasFull = chartData.vargas_full;
  const vimshopakaByName = new Map((chartData.vimshopaka || []).map(v => [v.name, v]));
  const legacy: Record<string, { name: string; sign: string }[]> | null = vargasFull ? null : (() => {
    const pick = (key: keyof ChartData["planets"][number]) => chartData.planets.filter(p => p[key]).map(p => ({ name: p.name, sign: p[key] as string }));
    const out: Record<string, { name: string; sign: string }[]> = {};
    if (chartData.navamsa?.planets?.length) out.d9 = chartData.navamsa.planets.map(p => ({ name: p.name, sign: p.navamsa_sign }));
    out.d7 = chartData.vargas?.d7 || pick("d7_sign");
    out.d10 = chartData.vargas?.d10 || pick("d10_sign");
    out.d12 = chartData.vargas?.d12 || pick("d12_sign");
    return out;
  })();
  const source = vargasFull || legacy || {};
  const availableKeys = VARGA_DEFS.filter(v => (source[v.key]?.length ?? 0) > 0).map(v => v.key);
  const [vargaTab, setVargaTab] = useState<string>(availableKeys.includes("d9") ? "d9" : availableKeys[0] || "d1");

  if (availableKeys.length === 0) return <p className="text-sm text-muted-foreground italic text-center py-6">{t("birthChart.varga.notAvailable")}</p>;

  if (!isElite) {
    return (
      <div className="rounded-2xl border border-primary/15 bg-card/50 backdrop-blur-md p-6 text-center space-y-3">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-3 rounded-full border border-primary/30">
            <Compass className="h-6 w-6 text-primary" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{t("birthChart.varga.upsellBody")}</p>
        <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary" onClick={() => window.location.href = "/pricing"}>
          <Zap className="h-3.5 w-3.5" /> {t("birthChart.varga.upgradeButton")}
        </Button>
      </div>
    );
  }

  const items = VARGA_DEFS.filter(v => availableKeys.includes(v.key)).map(v => ({ value: v.key, label: v.label }));
  const currentDef = VARGA_DEFS.find(v => v.key === vargaTab);

  return (
    <div className="space-y-3">
      <PillTabs items={items} value={vargaTab} onValueChange={setVargaTab} />
      {currentDef && <p className="text-[11px] text-muted-foreground/80 italic">{currentDef.meaning}</p>}
      <div className="rounded-xl border border-primary/15 bg-card/50 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("birthChart.varga.colPlanet")}</TableHead>
              <TableHead>{t("birthChart.varga.colSign")}</TableHead>
              {vargaTab === "d9" && <TableHead>{t("birthChart.varga.colNotes")}</TableHead>}
              {vargaTab === "d1" && <TableHead className="text-right">{t("birthChart.varga.colVimshopaka")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(source[vargaTab] || []).map(p => {
              const vp = vimshopakaByName.get(p.name);
              return (
                <TableRow key={p.name} className="hover:bg-primary/5">
                  <TableCell className={`font-medium ${PLANET_COLORS[p.name] || ""}`}>{PLANET_GLYPHS[p.name] || ""} {p.name}</TableCell>
                  <TableCell>{p.sign}</TableCell>
                  {vargaTab === "d9" && (
                    <TableCell>{(p as any).is_vargottama && <Badge className="text-[9px]">{t("birthChart.varga.vargottamaBadge")}</Badge>}</TableCell>
                  )}
                  {vargaTab === "d1" && (
                    <TableCell className="text-right tabular-nums text-xs">
                      {vp ? <span className="text-primary">{vp.score}/{vp.max}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

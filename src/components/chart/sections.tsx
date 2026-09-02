/**
 * New spec-aligned section components for the rebuilt Vedic Birth Chart page.
 * These are presentation-only — all data flows in via props.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Star, CheckCircle2, Clock, Compass, Sparkles, Briefcase, Heart, Coins, Activity, Flame, Filter, Trash2, ChevronDown } from "lucide-react";

/* ═══════════════════════════════════════════════════════
 * Section title with gold ornaments
 * ═══════════════════════════════════════════════════════ */
export function SectionTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-primary/20" />
      <div className="flex items-center gap-2 text-primary">
        <span className="text-sm">✦</span>
        {icon}
        <span className="font-serif uppercase tracking-[0.2em] text-[11px] text-primary/90">{children}</span>
        <span className="text-sm">✦</span>
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-primary/20" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Verification strip — single horizontal pill row
 * ═══════════════════════════════════════════════════════ */
interface VerificationStripProps {
  ascendantSign: string;
  ascendantDegree: number;
  ayanamsha?: string;
  system?: string;
  timezoneLabel?: string;
}
export function VerificationStrip({ ascendantSign, ascendantDegree, ayanamsha = "Lahiri", system = "North Indian", timezoneLabel }: VerificationStripProps) {
  const deg = Math.floor(ascendantDegree);
  const min = Math.floor((ascendantDegree - deg) * 60);
  const segments = [
    { label: "Ascendant", value: ascendantSign },
    { label: "Lagna", value: `${deg}°${String(min).padStart(2, "0")}'` },
    { label: "Ayanamsha", value: ayanamsha },
    { label: "System", value: system },
    ...(timezoneLabel ? [{ label: "TZ", value: timezoneLabel }] : []),
  ];
  return (
    <div className="rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-md p-3 overflow-x-auto">
      <div className="flex items-center gap-3 min-w-max">
        {segments.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            {i > 0 && <span className="text-primary/50">·</span>}
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
            <span className="text-sm text-foreground font-medium">{s.value}</span>
          </div>
        ))}
        <span className="ml-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-primary">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Verified
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Birth Panchanga 2x3 grid (replaces single card)
 * ═══════════════════════════════════════════════════════ */
export interface PanchangaInput {
  tithi?: { number: number; name: string; paksha: "Shukla" | "Krishna" };
  nakshatra?: { number: number; name: string; pada: number };
  yoga?: { number: number; name: string };
  karana?: { number: number; name: string };
  masa?: { name: string };
  vara?: { name: string };
}
const PANCHANGA_GLYPHS: Record<string, string> = {
  Tithi: "☾", Vara: "☼", Nakshatra: "✧", Yoga: "✦", Karana: "◉", Masa: "🜄",
};
export function PanchangaGrid({ panchanga, moonSign }: { panchanga?: PanchangaInput; moonSign?: string }) {
  if (!panchanga) return null;
  const cells = [
    { label: "Tithi", value: panchanga.tithi?.name || "—", sub: panchanga.tithi ? `${panchanga.tithi.paksha} Paksha` : "" },
    { label: "Vara", value: panchanga.vara?.name || "—", sub: "Weekday" },
    { label: "Nakshatra", value: panchanga.nakshatra?.name || "—", sub: panchanga.nakshatra ? `Pada ${panchanga.nakshatra.pada}` : "" },
    { label: "Yoga", value: panchanga.yoga?.name || "—", sub: panchanga.yoga ? `#${panchanga.yoga.number} of 27` : "" },
    { label: "Karana", value: panchanga.karana?.name || "—", sub: panchanga.karana ? `Half-tithi #${panchanga.karana.number}` : "" },
    { label: "Rashi", value: moonSign || panchanga.masa?.name || "—", sub: moonSign ? "Moon Sign" : "Lunar Month" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cells.map((c) => (
        <div
          key={c.label}
          className="group relative rounded-2xl border border-primary/15 bg-card/60 backdrop-blur-md p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.4)]"
        >
          <div className="flex items-start justify-between mb-1">
            <span className="text-[9px] uppercase tracking-[0.18em] text-primary/80">{c.label}</span>
            <span className="text-base text-primary/60">{PANCHANGA_GLYPHS[c.label]}</span>
          </div>
          <p className="font-serif text-base text-foreground leading-tight">{c.value}</p>
          {c.sub && <p className="text-[10.5px] text-muted-foreground/80 mt-0.5">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Dasha Timeline — horizontal scroll-snap
 * ═══════════════════════════════════════════════════════ */
export interface DashaPeriod {
  planet: string;
  startYear: number;
  endYear: number;
  isCurrent?: boolean;
}
export function DashaTimeline({ periods, current }: { periods: DashaPeriod[]; current?: string }) {
  if (!periods.length) return null;
  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">▼ Current life position</p>
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-3 snap-x scroll-smooth -mx-1 px-1">
          {periods.map((p) => {
            const isNow = p.isCurrent || p.planet === current;
            const isPast = p.endYear < new Date().getFullYear();
            return (
              <div
                key={`${p.planet}-${p.startYear}`}
                className={`shrink-0 snap-start rounded-xl px-4 py-3 min-w-[110px] text-center transition-all border ${
                  isNow
                    ? "bg-gradient-to-b from-primary/25 to-primary/10 border-primary text-foreground shadow-[0_0_24px_-8px_hsl(var(--primary)/0.7)]"
                    : isPast
                      ? "bg-card/40 border-border text-muted-foreground/70"
                      : "bg-card/55 border-border/60 text-foreground/85"
                }`}
                style={isNow ? { animation: "card-glow 3s ease-in-out infinite" } : undefined}
              >
                <p className="font-serif font-semibold text-sm">{p.planet}</p>
                <p className="text-[10px] mt-0.5 tabular-nums">{p.startYear}–{p.endYear}</p>
                {isNow && <p className="text-[9px] text-primary mt-1 uppercase tracking-wider">You are here</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Mangal Dasha feature card (Mars Major Period)
 * ═══════════════════════════════════════════════════════ */
export function MangalFeatureCard({ active, startYear, endYear }: { active?: boolean; startYear?: number; endYear?: number }) {
  if (!startYear || !endYear) return null;
  const now = new Date().getFullYear();
  const total = endYear - startYear;
  const elapsed = Math.max(0, Math.min(total, now - startYear));
  const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
  const status = active ? "Active Now" : now < startYear ? "Yet to begin" : "Completed";

  return (
    <div className="rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 via-card to-card p-5 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg text-foreground">Mangal Mahadasha</h3>
            <p className="text-[11px] text-muted-foreground">Mars Major Period · {status}</p>
          </div>
        </div>
        <Badge className="text-[10px] uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40">
          {active ? "Active" : "Enrolled"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration</p>
          <p className="font-medium text-foreground">{total} years · {startYear}–{endYear}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Progress</p>
          <div className="h-2 rounded-full bg-card/80 mt-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{pct}% · {status}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Courage", "Drive", "Property", "Siblings"].map((t) => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-300">{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Yogas Accordion v2 — filter chips + expandable
 * ═══════════════════════════════════════════════════════ */
export interface YogaItem {
  name: string;
  description: string;
  involved_planets?: string[];
  quality?: "benefic" | "malefic" | "mixed";
  strength?: number; // 1–5
}
function classifyYoga(y: YogaItem): "benefic" | "malefic" | "mixed" {
  if (y.quality) return y.quality;
  const n = y.name.toLowerCase();
  if (/dosha|kemadruma|shapit|kuja|grahan|kala\s*sarpa/.test(n)) return "malefic";
  if (/raja|dhana|gaja|maha|hamsa|malavya|sasa|ruchaka|bhadra/.test(n)) return "benefic";
  return "mixed";
}
const QUALITY_STYLE: Record<string, string> = {
  benefic: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  malefic: "border-red-500/40 bg-red-500/10 text-red-300",
  mixed: "border-purple-400/40 bg-purple-400/10 text-purple-300",
};
export function YogasAccordionV2({ yogas }: { yogas?: YogaItem[] }) {
  const [filter, setFilter] = useState<"all" | "benefic" | "malefic" | "mixed">("all");
  const enriched = useMemo(() => (yogas || []).map((y) => ({ ...y, quality: classifyYoga(y), strength: y.strength || 3 })), [yogas]);
  const filtered = filter === "all" ? enriched : enriched.filter((y) => y.quality === filter);
  if (!enriched.length) return <p className="text-sm text-muted-foreground italic text-center py-6">No active yogas detected.</p>;

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "benefic", label: "Benefic" },
    { key: "malefic", label: "Malefic" },
    { key: "mixed", label: "Mixed" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
              filter === f.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-[10px] text-muted-foreground/70 ml-auto">{filtered.length} of {enriched.length}</span>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {filtered.map((y, i) => (
          <AccordionItem key={`${y.name}-${i}`} value={`${y.name}-${i}`} className="rounded-xl border border-primary/15 bg-card/55 backdrop-blur-md px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3 flex-1 text-left">
                <span className="font-serif text-sm text-foreground">{y.name}</span>
                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${QUALITY_STYLE[y.quality!]}`}>{y.quality}</span>
                <span className="ml-auto flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className={`h-2.5 w-2.5 ${idx < (y.strength || 0) ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />
                  ))}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-3">
              {y.description}
              {!!y.involved_planets?.length && (
                <p className="text-[11px] text-muted-foreground/80 mt-2">Planets: {y.involved_planets.join(", ")}</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Reading Chapters — split AI text into accordion sections
 * ═══════════════════════════════════════════════════════ */
const CHAPTER_DEFS: { key: string; title: string; icon: ReactNode; matchers: RegExp[] }[] = [
  { key: "summary",      title: "1. Birth Summary & Kundali Overview", icon: <Sparkles className="h-3.5 w-3.5" />, matchers: [/summary/i, /overview/i, /introduction/i, /your\s+chart/i] },
  { key: "lagna",        title: "2. Ascendant & Physical Constitution (Lagna)", icon: <Compass className="h-3.5 w-3.5" />, matchers: [/lagna/i, /ascendant/i, /physical|constitution|body/i] },
  { key: "career",       title: "3. Career & Dharma (10th House)", icon: <Briefcase className="h-3.5 w-3.5" />, matchers: [/career/i, /profession/i, /dharma/i, /10th/i, /tenth\s+house/i] },
  { key: "relationships",title: "4. Relationships & Marriage (7th House)", icon: <Heart className="h-3.5 w-3.5" />, matchers: [/marriage/i, /relationship/i, /7th/i, /seventh\s+house/i, /spouse|partner/i] },
  { key: "wealth",       title: "5. Wealth & Finance (2nd & 11th House)", icon: <Coins className="h-3.5 w-3.5" />, matchers: [/wealth/i, /finance/i, /money/i, /2nd|second\s+house/i, /11th|eleventh\s+house/i] },
  { key: "health",       title: "6. Health & Vitality (6th House)", icon: <Activity className="h-3.5 w-3.5" />, matchers: [/health/i, /vitality/i, /6th|sixth\s+house/i, /illness/i] },
  { key: "spiritual",    title: "7. Spiritual Growth & Moksha (12th House)", icon: <Sparkles className="h-3.5 w-3.5" />, matchers: [/spiritual/i, /moksha/i, /12th|twelfth\s+house/i, /liberation/i] },
  { key: "dasha",        title: "8. Active Dasha Effects", icon: <Clock className="h-3.5 w-3.5" />, matchers: [/dasha/i, /current\s+period/i, /antardasha/i] },
  { key: "remedies",     title: "9. Remedies & Recommendations", icon: <CheckCircle2 className="h-3.5 w-3.5" />, matchers: [/remedies?/i, /recommendation/i, /upaya/i, /mantra/i] },
];

function splitReadingIntoChapters(reading: string): { key: string; title: string; icon: ReactNode; body: string }[] {
  if (!reading?.trim()) return [];
  // Split by markdown headings (## or # or **bold lines**) or blank-line paragraphs.
  const blocks = reading.split(/\n(?=#{1,3}\s|^\*\*[^*]+\*\*$)/m).map(b => b.trim()).filter(Boolean);
  if (blocks.length <= 1) {
    // No clean structure — render full text under chapter 1.
    return [{ ...CHAPTER_DEFS[0], body: reading }];
  }
  const buckets: Record<string, string[]> = {};
  for (const block of blocks) {
    const firstLine = block.split("\n")[0];
    let matched = false;
    for (const def of CHAPTER_DEFS) {
      if (def.matchers.some((re) => re.test(firstLine))) {
        buckets[def.key] = (buckets[def.key] || []).concat(block);
        matched = true; break;
      }
    }
    if (!matched) {
      buckets["summary"] = (buckets["summary"] || []).concat(block);
    }
  }
  return CHAPTER_DEFS.filter((d) => buckets[d.key]?.length).map((d) => ({ ...d, body: buckets[d.key].join("\n\n") }));
}

export function ReadingChapters({ reading, isStreaming }: { reading: string; isStreaming?: boolean }) {
  const chapters = useMemo(() => splitReadingIntoChapters(reading), [reading]);
  if (!chapters.length) return null;
  return (
    <Accordion type="multiple" defaultValue={[chapters[0].key]} className="space-y-2">
      {chapters.map((ch) => (
        <AccordionItem key={ch.key} value={ch.key} className="rounded-2xl border border-primary/15 bg-card/55 backdrop-blur-md px-4">
          <AccordionTrigger className="hover:no-underline py-3.5">
            <div className="flex items-center gap-3 text-left">
              <span className="text-primary">{ch.icon}</span>
              <span className="font-serif text-sm text-foreground">{ch.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="prose prose-sm max-w-none font-serif text-foreground/90 whitespace-pre-wrap leading-[1.75]">
              {ch.body}
              {isStreaming && ch.key === chapters[chapters.length - 1].key && (
                <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle" style={{ animation: "cursor-blink 1s step-end infinite" }} />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/* ═══════════════════════════════════════════════════════
 * Person Sidebar (desktop) — list of charts + add person
 * ═══════════════════════════════════════════════════════ */
export interface PersonItem {
  id: string;
  full_name: string;
  date_of_birth: string;
  birthplace: string;
  is_primary?: boolean;
  ascendant_glyph?: string;
}
export function PersonSidebarList({
  people, activeId, onSelect, onAdd, onMakePrimary, onDelete,
}: {
  people: PersonItem[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onMakePrimary?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium px-1">Chart for</p>
      <div className="space-y-2">
        {people.map((p) => {
          const active = p.id === activeId;
          return (
            <div
              key={p.id}
              className={`group relative rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                active
                  ? "border-primary bg-primary/10 shadow-[0_0_18px_-6px_hsl(var(--primary)/0.55)]"
                  : "border-border/60 bg-card/40 hover:border-primary/30 hover:bg-card/70"
              }`}
              onClick={() => onSelect(p.id)}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${active ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <p className={`font-serif text-sm truncate flex-1 ${active ? "text-foreground" : "text-foreground/85"}`}>{p.full_name}</p>
                {p.is_primary && <Star className="h-3 w-3 text-primary fill-primary shrink-0" />}
              </div>
              <p className="text-[10.5px] text-muted-foreground/80 mt-0.5 truncate pl-4">{p.date_of_birth} · {p.birthplace}</p>
              {(onMakePrimary || onDelete) && active && (
                <div className="flex gap-1 mt-2 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onMakePrimary && !p.is_primary && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onMakePrimary(p.id); }}
                      className="text-[10px] text-primary/80 hover:text-primary inline-flex items-center gap-0.5"
                    >
                      <Star className="h-2.5 w-2.5" /> Make primary
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                      className="text-[10px] text-destructive/80 hover:text-destructive inline-flex items-center gap-0.5 ml-auto"
                    >
                      <Trash2 className="h-2.5 w-2.5" /> Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Button variant="outline" size="sm" onClick={onAdd} className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5">
        <Plus className="h-3.5 w-3.5" /> Add Person
      </Button>
    </div>
  );
}

export function PersonChipsRow({
  people, activeId, onSelect, onAdd,
}: { people: PersonItem[]; activeId?: string | null; onSelect: (id: string) => void; onAdd: () => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
      {people.map((p) => {
        const active = p.id === activeId;
        const initial = (p.full_name || "?").trim().charAt(0).toUpperCase();
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`shrink-0 snap-start inline-flex items-center gap-2 rounded-full px-3 py-1.5 border transition-all ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-[0_0_18px_-6px_hsl(var(--primary)/0.6)]"
                : "border-border/60 bg-card/50 text-foreground/85"
            }`}
          >
            <span className={`h-5 w-5 inline-flex items-center justify-center rounded-full text-[10px] font-medium ${active ? "bg-primary-foreground/20" : "bg-primary/15 text-primary"}`}>
              {initial}
            </span>
            <span className="text-xs">{p.full_name.split(" ")[0]}</span>
            {p.is_primary && <Star className="h-2.5 w-2.5 fill-current" />}
          </button>
        );
      })}
      <button
        onClick={onAdd}
        className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 border border-dashed border-primary/40 text-primary text-xs"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Sticky tab bar
 * ═══════════════════════════════════════════════════════ */
export interface ChartTabDef { key: string; label: string; short?: string }
export function ChartTabsBar({ tabs, value, onChange }: { tabs: ChartTabDef[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="sticky top-14 z-20 bg-background/85 backdrop-blur-md border-b border-primary/10">
      <div className="flex gap-1 overflow-x-auto px-1 -mx-1">
        {tabs.map((t) => {
          const active = t.key === value;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`shrink-0 px-4 py-3 text-sm font-serif transition-all relative whitespace-nowrap ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short || t.label}</span>
              {active && <span className="absolute left-3 right-3 bottom-0 h-0.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

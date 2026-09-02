import { Sparkles, Moon } from "lucide-react";

type Mood = "solar" | "lunar" | "fiery" | "mystic" | "earthen";

interface NakshatraOfDay {
  name: string;
  deity: string;
  symbol: string;
}

interface DailyHeroCardProps {
  cosmicHeadline?: string;
  tithi: string;
  paksha: string;
  tithiMeaning: string;
  nakshatra: NakshatraOfDay;
  mood: Mood;
  voiceLabel: string;
  signLabel: string;          // e.g. "Moon in Leo" or "General guidance"
  dateLabel: string;          // e.g. "Tuesday, March 12"
}

const MOOD_DESC: Record<Mood, string> = {
  solar: "high momentum",
  lunar: "soft & reflective",
  fiery: "intense, do-not-suppress",
  mystic: "dreamy, the veil thins",
  earthen: "grounded, practical",
};

export default function DailyHeroCard({
  cosmicHeadline,
  tithi, paksha, tithiMeaning,
  nakshatra, mood, voiceLabel,
  signLabel, dateLabel,
}: DailyHeroCardProps) {
  return (
    <div className="daily-hero-card sacred-reveal" style={{ animationDelay: "0.04s" }}>
      {/* Top meta line */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "hsl(var(--text-muted))" }}>
          {signLabel} · {dateLabel}
        </p>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-[0.14em] uppercase mood-accent-bg-soft border"
          style={{ color: "hsl(var(--mood-accent))" }}
          title={`Today's tonal mood: ${MOOD_DESC[mood]}`}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--mood-accent))" }} />
          {mood} · {MOOD_DESC[mood]}
        </span>
      </div>

      {/* Cosmic Headline (the magazine cover) */}
      {cosmicHeadline && (
        <h2
          className="text-[1.85rem] sm:text-[2.15rem] leading-[1.15] font-light twinkle-aura mb-5"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "hsl(var(--gold-pale))",
          }}
        >
          "{cosmicHeadline}"
        </h2>
      )}

      {/* Voice chip — surprise of the day */}
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(var(--mood-accent))" }} />
        <span className="text-[10px] tracking-[0.16em] uppercase" style={{ color: "hsl(var(--text-muted))" }}>
          Today's voice:
        </span>
        <span
          className="text-[11px] tracking-wide font-medium"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))", fontStyle: "italic" }}
        >
          {voiceLabel}
        </span>
      </div>

      {/* Tithi + Nakshatra strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div
          className="rounded-2xl px-4 py-3.5"
          style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid hsl(var(--gold) / 0.12)" }}
        >
          <p className="text-[9px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "hsl(var(--text-muted))" }}>
            Lunar day
          </p>
          <p className="text-base font-medium" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))" }}>
            {paksha} {tithi}
          </p>
          <p className="text-[12px] mt-1 leading-snug" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'Jost', sans-serif", fontWeight: 300 }}>
            {tithiMeaning}
          </p>
        </div>

        <div
          className="rounded-2xl px-4 py-3.5"
          style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid hsl(var(--gold) / 0.12)" }}
        >
          <p className="text-[9px] tracking-[0.18em] uppercase mb-1.5 flex items-center gap-1.5" style={{ color: "hsl(var(--text-muted))" }}>
            <Moon className="h-3 w-3" /> Moon's nakshatra
          </p>
          <p className="text-base font-medium" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))" }}>
            {nakshatra.name}
          </p>
          <p className="text-[12px] mt-1 leading-snug" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'Jost', sans-serif", fontWeight: 300 }}>
            {nakshatra.deity} · {nakshatra.symbol}
          </p>
        </div>
      </div>
    </div>
  );
}

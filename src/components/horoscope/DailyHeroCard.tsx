import { useTranslation } from "react-i18next";
import { Sparkles, Moon } from "lucide-react";
import { nakshatraLabels, pakshaTithiLabel, tithiMeaningLabel } from "@/lib/panchanga-i18n";

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

const MOOD_DESC: Record<Mood, string> = { // English defaults; keys ui.dailyHeroCard.mood_<mood>
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
  const { t } = useTranslation();
  const moodDesc = t("pages:ui.dailyHeroCard.mood_" + mood, MOOD_DESC[mood]);
  const nak = nakshatraLabels(t, nakshatra);
  // The model sometimes wraps the headline in its own quotes; we add typographic ones.
  const headline = cosmicHeadline?.trim().replace(/^["“'‘]+|["”'’]+$/g, "");
  return (
    <div className="daily-hero-card sacred-reveal" style={{ animationDelay: "0.04s" }}>
      {/* Top meta line */}
      <div className="flex items-center justify-start sm:justify-between gap-3 mb-4">
        <p className="hidden sm:block text-[11px] tracking-[0.18em] uppercase" style={{ color: "hsl(var(--text-muted))" }}>
          {signLabel} · {dateLabel}
        </p>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] tracking-[0.14em] uppercase mood-accent-bg-soft border"
          style={{ color: "hsl(var(--mood-accent))" }}
          title={t("pages:ui.dailyHeroCard.tonalMood", "Today's tonal mood: {{desc}}", { desc: moodDesc })}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--mood-accent))" }} />
          {t("pages:ui.dailyHeroCard.moodName_" + mood, mood)} · {moodDesc}
        </span>
      </div>

      {/* Cosmic Headline (the magazine cover) */}
      {headline && (
        <h2
          className="relative text-[1.85rem] sm:text-[2.15rem] leading-[1.2] twinkle-aura mb-5"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "hsl(var(--gold-pale))",
            // Regular weight on purpose: overrides the admin "weight boost" (600),
            // which makes this display quote heavy — Tiro/Cormorant read best at 400.
            fontWeight: 400,
          }}
        >
          {/* Hanging opening quote: sits in the margin so the text edge stays clean */}
          <span aria-hidden className="absolute right-full pr-[0.06em]" style={{ color: "hsl(var(--gold) / 0.7)" }}>“</span>
          {headline}
          <span aria-hidden style={{ color: "hsl(var(--gold) / 0.7)" }}>”</span>
        </h2>
      )}

      {/* Voice chip — surprise of the day */}
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(var(--mood-accent))" }} />
        <span className="text-[11px] tracking-[0.16em] uppercase" style={{ color: "hsl(var(--text-muted))" }}>
          {t("pages:ui.dailyHeroCard.todaysVoice", "Today's voice:")}
        </span>
        <span
          className="text-[11px] tracking-wide font-medium"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))", fontStyle: "italic" }}
        >
          {voiceLabel}
        </span>
      </div>

      {/* Tithi + Nakshatra strip */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 m-flat-cols">
        <div
          className="rounded-2xl px-4 py-3.5 m-flat"
          style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid hsl(var(--gold) / 0.12)" }}
        >
          <p className="text-[11px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "hsl(var(--text-muted))" }}>
            {t("pages:ui.dailyHeroCard.lunarDay", "Lunar day")}
          </p>
          <p className="text-base font-medium" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))" }}>
            {pakshaTithiLabel(t, paksha, tithi)}
          </p>
          <p className="text-[12px] mt-1 leading-snug" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'Jost', sans-serif", fontWeight: 300 }}>
            {tithiMeaningLabel(t, tithi, tithiMeaning)}
          </p>
        </div>

        <div
          className="rounded-2xl px-4 py-3.5 m-flat"
          style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid hsl(var(--gold) / 0.12)" }}
        >
          <p className="text-[11px] tracking-[0.18em] uppercase mb-1.5 flex items-center gap-1.5" style={{ color: "hsl(var(--text-muted))" }}>
            <Moon className="h-3 w-3" /> {t("pages:ui.dailyHeroCard.moonsNakshatra", "Moon's nakshatra")}
          </p>
          <p className="text-base font-medium" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))" }}>
            {nak.name}
          </p>
          <p className="text-[12px] mt-1 leading-snug" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'Jost', sans-serif", fontWeight: 300 }}>
            {nak.deity} · {nak.symbol}
          </p>
        </div>
      </div>
    </div>
  );
}

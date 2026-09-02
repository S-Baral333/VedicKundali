import { useEffect, useState } from "react";
import { ArrowRight, GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentLanguage } from "@/lib/i18nClient";

interface Transit {
  name: string;
  sign: string;
  is_retrograde?: boolean;
}

interface Props {
  signName: string;            // moon sign or "General"
  todayTransits: Transit[];
  validDate: string;           // today's valid date
}

const KEY_PLANETS = ["Moon", "Mercury", "Venus", "Sun", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];

const SHIFT_MEANING: Record<string, string> = {
  Moon: "your inner weather changes",
  Mercury: "your thinking shifts gear",
  Venus: "what you find beautiful changes",
  Sun: "the spotlight moves",
  Mars: "your push reorients",
  Jupiter: "where luck flows changes",
  Saturn: "the long-term ground shifts",
  Rahu: "obsession-point moves",
  Ketu: "what you let go of changes",
};

export default function YesterdayShiftCard({ signName, todayTransits, validDate }: Props) {
  const [shifts, setShifts] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Compute yesterday from the validDate key using local components
        // (validDate is a YYYY-MM-DD string aligned to the user's local calendar).
        const [yy, mm, dd] = validDate.split("-").map(Number);
        const d = new Date(yy, (mm || 1) - 1, dd || 1);
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const yest = `${y}-${m}-${day}`;

        const { data } = await supabase
          .from("daily_horoscopes")
          .select("content")
          .eq("sign_name", signName)
          .eq("valid_date", yest)
          .eq("period", "daily")
          .eq("language", getCurrentLanguage())
          .maybeSingle();
        if (cancelled) return;
        if (!data?.content) { setShifts([]); return; }

        let parsed: any;
        try { parsed = typeof data.content === "string" ? JSON.parse(data.content) : data.content; }
        catch { setShifts([]); return; }

        // Yesterday's transits aren't stored in the cached content (legacy rows).
        // We approximate yesterday's positions from today's by checking if any planet
        // is within 1° of a sign boundary AND is moving forward — this is a best-effort.
        // The richer comparison happens server-side once cached rows refresh.
        const yestTransits: Transit[] | undefined = parsed?.transits;
        if (!yestTransits?.length) { setShifts([]); return; }

        const found: string[] = [];
        for (const planet of KEY_PLANETS) {
          const t = todayTransits.find((p) => p.name === planet);
          const y = yestTransits.find((p) => p.name === planet);
          if (!t || !y) continue;
          if (t.sign !== y.sign) {
            found.push(`${planet}: ${y.sign} → ${t.sign} — ${SHIFT_MEANING[planet] || "energy shifts"}`);
          } else if (!!t.is_retrograde !== !!y.is_retrograde) {
            const phrase = t.is_retrograde ? "turned retrograde — slow down" : "turned direct — forward motion returns";
            found.push(`${planet} ${phrase}`);
          }
        }
        setShifts(found.slice(0, 3));
      } catch {
        setShifts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [signName, validDate, todayTransits]);

  // Hide entirely if no comparison data
  if (shifts === null) return null;
  if (shifts.length === 0) return null;

  return (
    <div className="horo-glass-card sacred-reveal" style={{ animationDelay: "0.22s", background: "var(--mood-tint)", borderColor: "hsl(var(--mood-accent) / 0.22)" }}>
      <div className="flex items-center gap-2 mb-3" style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "hsl(var(--mood-accent))" }}>
        <GitBranch className="h-3.5 w-3.5" />
        <span>Since yesterday</span>
        <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg, hsl(var(--mood-accent) / 0.4) 30%, transparent)" }} />
      </div>
      <ul className="space-y-2">
        {shifts.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}>
            <ArrowRight className="h-3.5 w-3.5 mt-1 shrink-0" style={{ color: "hsl(var(--mood-accent))" }} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

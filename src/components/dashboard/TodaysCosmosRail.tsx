import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ChartSwitcher from "@/components/ChartSwitcher";

interface MoonPhase {
  glyph: string;
  label: string;
  illumination: number;
}

function computeMoonPhase(date: Date): MoonPhase {
  // Simple synodic-month approximation (29.530588 days)
  const knownNew = new Date("2000-01-06T18:14:00Z").getTime();
  const synodic = 29.530588 * 86400000;
  const phase = (((date.getTime() - knownNew) % synodic) + synodic) % synodic / synodic;
  const illum = Math.round((1 - Math.cos(phase * Math.PI * 2)) * 50);
  let glyph = "🌑", label = "New Moon";
  if (phase < 0.03 || phase > 0.97) { glyph = "🌑"; label = "New Moon"; }
  else if (phase < 0.22) { glyph = "🌒"; label = "Waxing Crescent"; }
  else if (phase < 0.28) { glyph = "🌓"; label = "First Quarter"; }
  else if (phase < 0.47) { glyph = "🌔"; label = "Waxing Gibbous"; }
  else if (phase < 0.53) { glyph = "🌕"; label = "Full Moon"; }
  else if (phase < 0.72) { glyph = "🌖"; label = "Waning Gibbous"; }
  else if (phase < 0.78) { glyph = "🌗"; label = "Last Quarter"; }
  else { glyph = "🌘"; label = "Waning Crescent"; }
  return { glyph, label, illumination: illum };
}

const NAKSHATRAS = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya",
  "Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha",
  "Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta",
  "Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
];
const VARAS = ["Ravi (Sun)","Soma (Moon)","Mangal (Mars)","Budha (Mercury)","Guru (Jupiter)","Shukra (Venus)","Shani (Saturn)"];

function approxNakshatra(date: Date): string {
  // Crude proxy: rotates ~13°20' per day; index by day of year
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  return NAKSHATRAS[(dayOfYear * 1) % 27];
}

const JUMP_LINKS = [
  { id: "guidance", label: "Cosmic Guidance" },
  { id: "sade-sati", label: "Sade Sati" },
  { id: "snapshot", label: "Chart Snapshot" },
  { id: "actions", label: "Quick Actions" },
];

export default function TodaysCosmosRail() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const moon = computeMoonPhase(now);
  const nakshatra = approxNakshatra(now);
  const vara = VARAS[now.getDay()];

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Active chart switcher */}
      <div className="rail-card">
        <div className="rail-card-title">Reading As</div>
        <ChartSwitcher />
      </div>

      {/* Today's cosmos */}
      <div className="rail-card">
        <div className="rail-card-title">Today's Cosmos</div>
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: "26px", lineHeight: 1 }} aria-hidden>{moon.glyph}</span>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "17px", color: "hsl(var(--gold-light))", letterSpacing: "0.02em" }}>
              {moon.label}
            </div>
            <div className="text-[11px]" style={{ color: "hsl(var(--text-muted))" }}>
              {moon.illumination}% illuminated
            </div>
          </div>
        </div>
        <div className="rail-stat">
          <span className="rail-stat-label">Nakshatra</span>
          <span className="rail-stat-value">{nakshatra}</span>
        </div>
        <div className="rail-stat">
          <span className="rail-stat-label">Vara</span>
          <span className="rail-stat-value">{vara.split(" ")[0]}</span>
        </div>
        <div className="rail-stat">
          <span className="rail-stat-label">Day</span>
          <span className="rail-stat-value">{now.toLocaleDateString("en-US", { weekday: "long" })}</span>
        </div>
      </div>

      {/* On this page */}
      <div className="rail-card">
        <div className="rail-card-title">On This Page</div>
        <div className="flex flex-col gap-1.5">
          {JUMP_LINKS.map(j => (
            <a
              key={j.id}
              href={`#${j.id}`}
              className="text-[12.5px] py-1.5 px-2 rounded-md transition-colors"
              style={{ color: "hsl(var(--text-secondary))" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--gold-light))")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--text-secondary))")}
            >
              <span style={{ color: "hsl(var(--gold) / 0.5)", marginRight: 8 }}>·</span>
              {j.label}
            </a>
          ))}
        </div>
      </div>

      {/* Verse */}
      <div className="rail-card">
        <div className="rail-card-title">Daily Verse</div>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          fontSize: "14px",
          lineHeight: 1.6,
          color: "hsl(var(--gold-light) / 0.85)",
        }}>
          "As above, so below — the same rhythm that turns the stars turns the breath inside you."
        </p>
      </div>
    </div>
  );
}

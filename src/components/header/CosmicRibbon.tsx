import { useEffect, useMemo, useState } from "react";
import { Crown, MapPin, Moon, Sun } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { sunTimes, moonTimes, formatHM } from "@/lib/sun-moon";

const MOON_PHASES = [
  { name: "New Moon", glyph: "🌑", min: 0, max: 0.0625 },
  { name: "Waxing Crescent", glyph: "🌒", min: 0.0625, max: 0.1875 },
  { name: "First Quarter", glyph: "🌓", min: 0.1875, max: 0.3125 },
  { name: "Waxing Gibbous", glyph: "🌔", min: 0.3125, max: 0.4375 },
  { name: "Full Moon", glyph: "🌕", min: 0.4375, max: 0.5625 },
  { name: "Waning Gibbous", glyph: "🌖", min: 0.5625, max: 0.6875 },
  { name: "Last Quarter", glyph: "🌗", min: 0.6875, max: 0.8125 },
  { name: "Waning Crescent", glyph: "🌘", min: 0.8125, max: 0.9375 },
  { name: "New Moon", glyph: "🌑", min: 0.9375, max: 1 },
];

const SIDEREAL_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/**
 * Cheap moon-phase approximation (Conway's algorithm) for ambient ribbon display.
 * Not used for any prediction — purely decorative atmosphere.
 */
function getMoonPhase(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let r = year % 100;
  r %= 19;
  if (r > 9) r -= 19;
  r = (r * 11) % 30 + month + day;
  if (month < 3) r += 2;
  r -= year < 2000 ? 4 : 8.3;
  r = Math.floor(r + 0.5) % 30;
  const fraction = (r < 0 ? r + 30 : r) / 29.53;
  const phase = MOON_PHASES.find((p) => fraction >= p.min && fraction < p.max) || MOON_PHASES[0];
  const signIndex = Math.floor(((date.getTime() / 86400000) % 27.3) / 27.3 * 12) % 12;
  return { ...phase, sign: SIDEREAL_SIGNS[signIndex] };
}

/** Format UTC offset as ±HH:MM from a Date object. */
function formatOffset(d: Date) {
  const off = -d.getTimezoneOffset(); // minutes east of UTC
  const sign = off >= 0 ? "+" : "−";
  const abs = Math.abs(off);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

/** Pull short tz abbreviation (NPT, IST, PST…) from Intl. */
function getTzAbbrev(d: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
      hour: "2-digit",
    }).formatToParts(d);
    const tz = parts.find((p) => p.type === "timeZoneName")?.value;
    return tz || "";
  } catch {
    return "";
  }
}

function formatCoord(lat: number, lng: number) {
  const latH = lat >= 0 ? "N" : "S";
  const lngH = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latH}, ${Math.abs(lng).toFixed(4)}°${lngH}`;
}

const COORD_KEY = "kundali:coords";
const PLACE_KEY = "kundali:place";

/** Coarse reverse-geocode via OSM Nominatim. Coords rounded to 0.01° (~1.1 km) before sending. */
async function fetchCoarsePlace(lat: number, lng: number): Promise<string | null> {
  const rLat = Math.round(lat * 100) / 100;
  const rLng = Math.round(lng * 100) / 100;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${rLat}&lon=${rLng}&zoom=14&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address || {};
    return (
      a.suburb || a.neighbourhood || a.village || a.town ||
      a.city_district || a.city || a.county || a.state || a.country || null
    );
  } catch {
    return null;
  }
}

export default function CosmicRibbon() {
  const { tier } = useSubscription();
  const [now, setNow] = useState<Date>(() => new Date());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const raw = sessionStorage.getItem(COORD_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") return parsed;
    } catch { /* ignore */ }
    return null;
  });
  const [place, setPlace] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem(PLACE_KEY);
      return raw ? JSON.parse(raw)?.label ?? null : null;
    } catch { return null; }
  });

  // Live clock — tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Geolocation request (non-blocking, silent fallback)
  useEffect(() => {
    if (coords) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        try { sessionStorage.setItem(COORD_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      },
      () => { /* permission denied / error — silently omit */ },
      { timeout: 5000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false }
    );
  }, [coords]);

  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const dateLabel = useMemo(
    () => now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    [now.getDate(), now.getMonth(), now.getFullYear()]  // eslint-disable-line react-hooks/exhaustive-deps
  );

  const timeLabel = useMemo(() => {
    return now.toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
  }, [now]);

  const tzAbbrev = useMemo(() => getTzAbbrev(now, timeZone), [now.getMinutes(), timeZone]); // eslint-disable-line react-hooks/exhaustive-deps
  const offset = useMemo(() => formatOffset(now), [now.getMinutes()]); // eslint-disable-line react-hooks/exhaustive-deps
  const moon = useMemo(() => getMoonPhase(now), [now.getDate(), now.getMonth(), now.getFullYear()]); // eslint-disable-line react-hooks/exhaustive-deps

  const tierLabel = tier === "jyotisha" ? "Jyotisha" : tier === "grihastha" ? "Grihastha" : tier === "sadhaka" ? "Sadhaka" : "Darshana";
  const tierColor = tier === "jyotisha" ? "hsl(var(--gold))" : tier === "grihastha" || tier === "sadhaka" ? "hsl(var(--gold-light))" : "hsl(var(--text-muted))";

  // Sun & moon rise/set times for current location & local day
  const sun = useMemo(
    () => (coords ? sunTimes(now, coords.lat, coords.lng) : null),
    [coords?.lat, coords?.lng, now.getDate(), now.getMonth(), now.getFullYear()] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const moonRS = useMemo(
    () => (coords ? moonTimes(now, coords.lat, coords.lng, timeZone) : null),
    [coords?.lat, coords?.lng, timeZone, now.getDate(), now.getMonth(), now.getFullYear()] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Coarse reverse-geocode (one fetch per session, cached by rounded coords)
  useEffect(() => {
    if (!coords) return;
    const rLat = Math.round(coords.lat * 100) / 100;
    const rLng = Math.round(coords.lng * 100) / 100;
    try {
      const cached = sessionStorage.getItem(PLACE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.lat === rLat && parsed?.lng === rLng && parsed?.label) {
          setPlace(parsed.label);
          return;
        }
      }
    } catch { /* ignore */ }
    fetchCoarsePlace(coords.lat, coords.lng).then((label) => {
      if (!label) return;
      setPlace(label);
      try { sessionStorage.setItem(PLACE_KEY, JSON.stringify({ lat: rLat, lng: rLng, label })); } catch { /* ignore */ }
    });
  }, [coords]);

  const dotStyle: React.CSSProperties = { opacity: 0.4 };

  return (
    <div
      className="sacred-wide hidden lg:flex items-center justify-between h-7"
      style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "11.5px",
        letterSpacing: "0.06em",
        color: "hsl(var(--gold) / 0.55)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="twinkle-subtle inline-block" aria-hidden style={{ fontSize: "12px" }}>
          {moon.glyph}
        </span>
        <span className="italic">{dateLabel}</span>

        <span aria-hidden style={dotStyle}>·</span>
        <span className="tabular-nums" style={{ color: "hsl(var(--gold-light) / 0.85)" }}>
          {timeLabel}
          {tzAbbrev && (
            <span className="ml-1.5" style={{ color: "hsl(var(--gold) / 0.6)" }}>{tzAbbrev}</span>
          )}
          <span className="ml-1" style={{ opacity: 0.55 }}>({offset})</span>
        </span>

        {coords && (
          <>
            <span aria-hidden style={dotStyle}>·</span>
            <span className="inline-flex items-center gap-1 tabular-nums" style={{ color: "hsl(var(--gold-light) / 0.7)" }}>
              <MapPin className="h-2.5 w-2.5" style={{ color: "hsl(var(--gold) / 0.6)" }} aria-hidden />
              {formatCoord(coords.lat, coords.lng)}
            </span>
          </>
        )}

        <span aria-hidden style={dotStyle} className="hidden xl:inline">·</span>
        <span className="hidden xl:inline">
          <span style={{ color: "hsl(var(--gold-light) / 0.7)" }}>{moon.name}</span>
          <span className="mx-1.5" style={{ opacity: 0.4 }}>in</span>
          <span style={{ color: "hsl(var(--gold-light) / 0.7)" }}>{moon.sign}</span>
        </span>

        {moonRS && (moonRS.moonrise || moonRS.moonset) && (
          <>
            <span aria-hidden style={dotStyle} className="hidden xl:inline">·</span>
            <span
              className="hidden xl:inline-flex items-center gap-1 tabular-nums"
              style={{ color: "hsl(var(--gold-light) / 0.75)" }}
              title="Moonrise → Moonset (your location)"
            >
              <Moon className="h-2.5 w-2.5" style={{ color: "hsl(var(--gold) / 0.6)" }} aria-hidden />
              {formatHM(moonRS.moonrise, timeZone)}
              <span className="mx-0.5" style={{ opacity: 0.55 }}>→</span>
              {formatHM(moonRS.moonset, timeZone)}
            </span>
          </>
        )}

        {sun && (sun.sunrise || sun.sunset) && (
          <>
            <span aria-hidden style={dotStyle} className="hidden xl:inline">·</span>
            <span
              className="hidden xl:inline-flex items-center gap-1 tabular-nums"
              style={{ color: "hsl(var(--gold-light) / 0.75)" }}
              title="Sunrise → Sunset (your location)"
            >
              <Sun className="h-2.5 w-2.5" style={{ color: "hsl(var(--gold) / 0.6)" }} aria-hidden />
              {formatHM(sun.sunrise, timeZone)}
              <span className="mx-0.5" style={{ opacity: 0.55 }}>→</span>
              {formatHM(sun.sunset, timeZone)}
            </span>
          </>
        )}

        {place && (
          <>
            <span aria-hidden style={dotStyle} className="hidden xl:inline">·</span>
            <span
              className="hidden xl:inline-flex items-center gap-1"
              style={{ color: "hsl(var(--gold-light) / 0.8)" }}
              title="Approximate location (≥ 1 km radius)"
            >
              <MapPin className="h-2.5 w-2.5" style={{ color: "hsl(var(--gold) / 0.6)" }} aria-hidden />
              <span className="italic">{place}</span>
            </span>
          </>
        )}

        <span aria-hidden style={dotStyle} className="hidden 2xl:inline">·</span>
        <span className="italic hidden 2xl:inline" style={{ opacity: 0.7 }}>All planets in motion</span>
      </div>

      <div
        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full shrink-0"
        style={{
          background: tier === "jyotisha" ? "hsl(var(--gold) / 0.10)" : "transparent",
          border: `0.5px solid ${tier === "jyotisha" ? "hsl(var(--gold) / 0.30)" : "hsl(var(--gold) / 0.12)"}`,
        }}
      >
        {tier === "jyotisha" ? (
          <Crown className="h-3 w-3" style={{ color: tierColor }} />
        ) : (
          <Moon className="h-3 w-3" style={{ color: tierColor }} />
        )}
        <span style={{ color: tierColor, letterSpacing: "0.10em", fontFamily: "'Jost', sans-serif", fontSize: "9.5px", textTransform: "uppercase" }}>
          {tierLabel}
        </span>
      </div>
    </div>
  );
}

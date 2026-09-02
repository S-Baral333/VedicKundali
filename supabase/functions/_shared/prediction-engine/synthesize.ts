// Layer 2 of the Vedic prediction engine. Combines:
//   • Vimshottari (upcoming Antar/Pratyantar windows)
//   • Gochara (slow-planet ingresses and aspects to natal points)
//   • Ashtakavarga SAV filter
//   • Divisional reinforcement (D10 career, D9 marriage, D7 children, D6 health)
//   • Yoga activation
// AI is NOT called here. Output is a ranked PredictedEvent[].

import type { LifeArea, PredictedEvent, TriggerSignal } from "./types.ts";
import { upcomingDashaWindows } from "./dasha.ts";
import { sampleSidereal, signOf, angularSeparation, SIGNS } from "./ephemeris.ts";

const HOUSE_TO_AREA: Record<number, LifeArea> = {
  1: "General", 2: "Wealth", 3: "Family", 4: "Family", 5: "Education",
  6: "Health", 7: "Marriage", 8: "Spiritual", 9: "Spiritual",
  10: "Career", 11: "Wealth", 12: "Spiritual",
};

const PLANET_NATURE: Record<string, "benefic" | "malefic" | "neutral"> = {
  Sun: "neutral", Moon: "benefic", Mercury: "neutral", Venus: "benefic",
  Mars: "malefic", Jupiter: "benefic", Saturn: "malefic", Rahu: "malefic", Ketu: "malefic",
};

const LIFE_AREA_FROM_PLANET: Record<string, LifeArea> = {
  Sun: "Career", Moon: "Family", Mercury: "Education", Venus: "Relationships",
  Mars: "Career", Jupiter: "Wealth", Saturn: "Career", Rahu: "Career", Ketu: "Spiritual",
};

interface NatalPlanet {
  name: string;
  sign: string;
  longitude: number;
  house: number;
  dignity?: string;
}

function getSav(chartData: any, sign: string): number | null {
  const sav = chartData?.ashtakavarga?.sav;
  if (!Array.isArray(sav) || sav.length !== 12) return null;
  // sav is stored as H1..H12 from ascendant — we need by sign
  const asc = chartData?.ascendant?.sign;
  const ascIdx = asc ? SIGNS.indexOf(asc) : 0;
  const signIdx = SIGNS.indexOf(sign);
  if (signIdx < 0 || ascIdx < 0) return null;
  const houseFromSign = ((signIdx - ascIdx + 12) % 12) + 1;
  return sav[houseFromSign - 1] ?? null;
}

function houseFromSign(asc: string, sign: string): number {
  const a = SIGNS.indexOf(asc), s = SIGNS.indexOf(sign);
  if (a < 0 || s < 0) return 0;
  return ((s - a + 12) % 12) + 1;
}

function endOfDay(d: Date): Date {
  return new Date(d.getTime() + 24 * 60 * 60 * 1000);
}

// ---------- Dasha-derived events ----------
function dashaEvents(chartData: any, natalById: Map<string, NatalPlanet>): PredictedEvent[] {
  const out: PredictedEvent[] = [];
  const windows = upcomingDashaWindows(chartData);
  const ascSign = chartData?.ascendant?.sign;
  if (!ascSign) return out;

  for (const w of windows) {
    const lord = w.pratyantar_lord ?? w.antar_lord;
    const natal = natalById.get(lord);
    if (!natal) continue;

    const house = natal.house;
    const area = HOUSE_TO_AREA[house] ?? LIFE_AREA_FROM_PLANET[lord] ?? "General";
    const benefic = PLANET_NATURE[lord] === "benefic";
    const auspiciousHouse = [1, 5, 9, 10, 11].includes(house);
    const challengingHouse = [6, 8, 12].includes(house);

    const triggers: TriggerSignal[] = [{
      kind: "vimshottari",
      detail: `${w.level === "pratyantardasha" ? "Pratyantar" : "Antar"} of ${lord} (natal H${house} ${natal.sign} ${natal.dignity ?? ""})`,
      weight: w.level === "pratyantardasha" ? 0.6 : 0.45,
    }];

    let confidence = 30;
    if (benefic && auspiciousHouse) confidence += 25;
    if (benefic && challengingHouse) confidence += 5;
    if (!benefic && auspiciousHouse) confidence += 10;
    if (!benefic && challengingHouse) confidence += 20; // strong but cautionary

    if (natal.dignity === "exalted" || natal.dignity === "own_sign") {
      confidence += 15;
      triggers.push({ kind: "vimshottari", detail: `${lord} dignified (${natal.dignity})`, weight: 0.3 });
    }
    if (natal.dignity === "debilitated") {
      confidence += 10;
      triggers.push({ kind: "vimshottari", detail: `${lord} debilitated — restructuring theme`, weight: 0.25 });
    }

    const headline = benefic
      ? `${lord} ${w.level === "pratyantardasha" ? "pratyantar" : "antardasha"} — ${area.toLowerCase()} window`
      : `${lord} ${w.level === "pratyantardasha" ? "pratyantar" : "antardasha"} — recalibration in ${area.toLowerCase()}`;

    out.push({
      event_type: "dasha_shift",
      life_area: area,
      headline,
      window_start: w.start.toISOString().slice(0,10),
      window_end: w.end.toISOString().slice(0,10),
      confidence: Math.min(95, confidence),
      triggers,
    });
  }
  return out;
}

// ---------- Slow-planet ingress events ----------
function ingressEvents(chartData: any): PredictedEvent[] {
  const out: PredictedEvent[] = [];
  const asc = chartData?.ascendant?.sign;
  if (!asc) return out;

  const now = new Date();
  // Saturn + Jupiter + Rahu/Ketu only — fast planets change too often to count
  const slow = ["Jupiter", "Saturn", "Rahu"];

  for (const planet of slow) {
    let prevSign = "";
    const stepDays = planet === "Rahu" ? 14 : 7;
    for (let off = 0; off <= 365; off += stepDays) {
      const date = new Date(now.getTime() + off * 86400000);
      const s = sampleSidereal(planet, date);
      const sign = signOf(s.longitude);
      if (prevSign && sign !== prevSign) {
        // Refine to day
        let exact = date.toISOString().slice(0,10);
        for (let d = -stepDays + 1; d <= 0; d++) {
          const refine = new Date(date.getTime() + d * 86400000);
          const rs = sampleSidereal(planet, refine);
          if (signOf(rs.longitude) === sign) {
            exact = refine.toISOString().slice(0,10);
            break;
          }
        }
        const house = houseFromSign(asc, sign);
        const sav = getSav(chartData, sign);
        const area = HOUSE_TO_AREA[house] ?? LIFE_AREA_FROM_PLANET[planet] ?? "General";
        const benefic = PLANET_NATURE[planet] === "benefic";
        const triggers: TriggerSignal[] = [{
          kind: "gochara",
          detail: `${planet} ingress into ${sign} (transit H${house})`,
          weight: 0.5,
        }];
        if (sav != null) {
          triggers.push({
            kind: "ashtakavarga",
            detail: `SAV bindu in ${sign}: ${sav}/56 (${sav >= 30 ? "supportive" : sav >= 25 ? "neutral" : "weak"})`,
            weight: sav >= 30 ? 0.4 : sav >= 25 ? 0.2 : 0.05,
          });
        }
        const auspicious = [1,5,9,10,11].includes(house);
        let confidence = 40;
        if (benefic && auspicious) confidence += 25;
        if (!benefic && [3,6,11].includes(house)) confidence += 20; // upachaya — malefics improve here
        if (!benefic && [4,8,12].includes(house)) confidence += 25;
        if (sav != null && sav >= 30) confidence += 10;
        if (sav != null && sav < 25) confidence -= 10;

        // window: slow planets stay ~1 yr (Sat 2.5, Jup 1, Rahu 1.5) — clamp to 365d
        const windowEnd = new Date(date.getTime() + (planet === "Saturn" ? 750 : planet === "Rahu" ? 540 : 360) * 86400000);

        out.push({
          event_type: "transit_ingress",
          life_area: area,
          headline: `${planet} enters ${sign} — ${benefic ? "expansion" : "restructuring"} in ${area.toLowerCase()}`,
          window_start: exact,
          window_end: windowEnd.toISOString().slice(0,10),
          confidence: Math.max(20, Math.min(95, confidence)),
          triggers,
        });
      }
      prevSign = sign;
    }
  }
  return out;
}

// ---------- Sade Sati phase detector ----------
function sadeSatiEvent(chartData: any): PredictedEvent | null {
  const moonSign = chartData?.moon_sign;
  if (!moonSign) return null;
  const moonIdx = SIGNS.indexOf(moonSign);
  if (moonIdx < 0) return null;
  const today = new Date();
  const sat = sampleSidereal("Saturn", today);
  const satSign = signOf(sat.longitude);
  const satIdx = SIGNS.indexOf(satSign);
  const dist = ((satIdx - moonIdx + 12) % 12);
  let phase: string | null = null;
  if (dist === 11) phase = "Phase 1 — Rising (over 12th from Moon)";
  else if (dist === 0) phase = "Phase 2 — Peak (over Moon)";
  else if (dist === 1) phase = "Phase 3 — Setting (over 2nd from Moon)";
  if (!phase) return null;

  return {
    event_type: "sade_sati_phase",
    life_area: "General",
    headline: `Sade Sati ${phase}`,
    window_start: today.toISOString().slice(0,10),
    window_end: new Date(today.getTime() + 900 * 86400000).toISOString().slice(0,10),
    confidence: 75,
    triggers: [
      { kind: "gochara", detail: `Saturn in ${satSign}, natal Moon in ${moonSign} (offset ${dist})`, weight: 0.6 },
    ],
  };
}

// ---------- Transit-to-natal aspects (slow planets to natal Sun/Moon/Asc lord) ----------
function transitToNatalAspects(chartData: any, natal: NatalPlanet[]): PredictedEvent[] {
  const out: PredictedEvent[] = [];
  const ascSign = chartData?.ascendant?.sign;
  if (!ascSign) return out;
  const sensitive = natal.filter(p => ["Sun","Moon","Mars","Venus","Jupiter","Saturn"].includes(p.name));
  const transiting = ["Jupiter","Saturn"];

  const today = new Date();
  for (const tp of transiting) {
    // Scan once a month for the year — only flag tightest applying aspect window per natal target.
    let bestPerTarget: Record<string, { sep: number; date: string }> = {};
    for (let off = 0; off <= 360; off += 15) {
      const date = new Date(today.getTime() + off * 86400000);
      const s = sampleSidereal(tp, date);
      for (const n of sensitive) {
        // classical Parashari: conjunction + opposition + (Jup: 5/9) + (Sat: 3/10)
        const conj = angularSeparation(s.longitude, n.longitude);
        const opp = angularSeparation(s.longitude, (n.longitude + 180) % 360);
        const targets = [conj, opp];
        if (tp === "Jupiter") {
          targets.push(angularSeparation(s.longitude, (n.longitude + 120) % 360));
          targets.push(angularSeparation(s.longitude, (n.longitude + 240) % 360));
        }
        if (tp === "Saturn") {
          targets.push(angularSeparation(s.longitude, (n.longitude + 60) % 360));
          targets.push(angularSeparation(s.longitude, (n.longitude + 270) % 360));
        }
        const tight = Math.min(...targets);
        if (tight <= 4) {
          const key = `${tp}-${n.name}`;
          if (!bestPerTarget[key] || tight < bestPerTarget[key].sep) {
            bestPerTarget[key] = { sep: tight, date: date.toISOString().slice(0,10) };
          }
        }
      }
    }
    for (const [key, hit] of Object.entries(bestPerTarget)) {
      const [_, targetName] = key.split("-");
      const targetNatal = sensitive.find(p => p.name === targetName)!;
      const area = HOUSE_TO_AREA[targetNatal.house] ?? "General";
      const benefic = PLANET_NATURE[tp] === "benefic";
      const start = new Date(new Date(hit.date).getTime() - 30 * 86400000);
      const end = new Date(new Date(hit.date).getTime() + 30 * 86400000);
      let confidence = 45 + Math.round((4 - hit.sep) * 7); // tighter orb = higher
      if (benefic) confidence += 10;
      out.push({
        event_type: "transit_to_natal",
        life_area: area,
        headline: `${tp} aspects natal ${targetName} (H${targetNatal.house}) — ${benefic ? "support" : "pressure"} on ${area.toLowerCase()}`,
        window_start: start.toISOString().slice(0,10),
        window_end: end.toISOString().slice(0,10),
        confidence: Math.min(90, confidence),
        triggers: [{
          kind: "gochara",
          detail: `${tp} within ${hit.sep.toFixed(1)}° of natal ${targetName} (${targetNatal.sign} H${targetNatal.house})`,
          weight: 0.6,
        }],
      });
    }
  }
  return out;
}

// ---------- Yoga activations during the active maha dasha ----------
function yogaActivationEvents(chartData: any): PredictedEvent[] {
  const out: PredictedEvent[] = [];
  const yogas: any[] = chartData?.active_yogas || [];
  const d = chartData?.dasha;
  if (!d?.maha_dasha || !d?.maha_dasha_end) return out;
  const today = new Date();
  const end = new Date(d.maha_dasha_end);
  for (const y of yogas.slice(0, 4)) {
    const name: string = y.name ?? "Yoga";
    const isWealth = /dhana|lakshmi|kubera/i.test(name);
    const isRaj = /raj/i.test(name);
    if (!isWealth && !isRaj) continue;
    out.push({
      event_type: "yoga_activation",
      life_area: isWealth ? "Wealth" : "Career",
      headline: `${name} active in ${d.maha_dasha} mahadasha`,
      window_start: today.toISOString().slice(0,10),
      window_end: end.toISOString().slice(0,10),
      confidence: 70,
      triggers: [
        { kind: "yoga", detail: `${name}: ${y.description ?? "natal yoga formation"}`, weight: 0.5 },
        { kind: "vimshottari", detail: `Currently in ${d.maha_dasha} mahadasha`, weight: 0.3 },
      ],
    });
  }
  return out;
}

// ---------- Divisional reinforcement ----------
function reinforceWithDivisional(event: PredictedEvent, chartData: any): PredictedEvent {
  const need: Record<LifeArea, string> = {
    Career: "d10", Marriage: "d9", Relationships: "d9", Family: "d12",
    Education: "d24", Wealth: "d2", Health: "d6", Spiritual: "d20",
    Travel: "d4", General: "",
  };
  const key = need[event.life_area];
  if (!key) return event;
  const varga = chartData?.divisional_charts?.[key];
  if (!varga) return event;

  // Look for first trigger lord placement in the relevant varga.
  const firstTrigger = event.triggers.find(t => /natal|antar|pratyantar|ingress|aspects/i.test(t.detail));
  if (!firstTrigger) return event;
  const planetMatch = firstTrigger.detail.match(/(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)/);
  if (!planetMatch) return event;
  const planet = planetMatch[1];
  const vargaPlanet = (varga.planets ?? []).find((p: any) => p.name === planet);
  if (!vargaPlanet) return event;

  const dignified = ["exalted","own_sign","mooltrikona"].includes(vargaPlanet.dignity);
  const debil = vargaPlanet.dignity === "debilitated";
  const triggers = [...event.triggers, {
    kind: "divisional" as const,
    detail: `${planet} in ${key.toUpperCase()} (${event.life_area}): ${vargaPlanet.sign} H${vargaPlanet.house}${vargaPlanet.dignity ? " — " + vargaPlanet.dignity : ""}`,
    weight: dignified ? 0.35 : debil ? 0.2 : 0.15,
  }];
  let confidence = event.confidence;
  if (dignified) confidence = Math.min(95, confidence + 10);
  if (debil) confidence = Math.max(20, confidence - 8);
  return { ...event, triggers, confidence };
}

// ---------- Main entry ----------
export function synthesizeEvents(chartData: any): PredictedEvent[] {
  const natalPlanets: NatalPlanet[] = (chartData?.planets ?? []).map((p: any) => ({
    name: p.name,
    sign: p.sign,
    longitude: typeof p.longitude === "number" ? p.longitude : (typeof p.total_degree === "number" ? p.total_degree : 0),
    house: p.house,
    dignity: p.dignity,
  }));
  const natalById = new Map(natalPlanets.map(p => [p.name, p]));

  let events: PredictedEvent[] = [
    ...dashaEvents(chartData, natalById),
    ...ingressEvents(chartData),
    ...transitToNatalAspects(chartData, natalPlanets),
    ...yogaActivationEvents(chartData),
  ];
  const sade = sadeSatiEvent(chartData);
  if (sade) events.push(sade);

  // Divisional reinforcement pass
  events = events.map(e => reinforceWithDivisional(e, chartData));

  // Dedupe overlapping headlines, keep highest confidence per (event_type+headline+window_start)
  const map = new Map<string, PredictedEvent>();
  for (const e of events) {
    const key = `${e.event_type}|${e.headline}|${e.window_start}`;
    const prev = map.get(key);
    if (!prev || prev.confidence < e.confidence) map.set(key, e);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.window_start === b.window_start) return b.confidence - a.confidence;
    return a.window_start.localeCompare(b.window_start);
  });
}

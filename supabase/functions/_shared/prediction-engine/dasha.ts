// Compute upcoming Antardasha (and Pratyantardasha) boundaries within the active Mahadasha.
// Reads the chart_data.dasha block written by generate-chart.

const DASHA_ORDER = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
const DASHA_YEARS: Record<string, number> = {
  Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17,
};
const TOTAL = 120;
const MS_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export interface DashaWindow {
  level: "antardasha" | "pratyantardasha";
  maha_lord: string;
  antar_lord: string;
  pratyantar_lord?: string;
  start: Date;
  end: Date;
}

export function upcomingDashaWindows(chartData: any, horizonMs: number = 730 * 24 * 60 * 60 * 1000): DashaWindow[] {
  const out: DashaWindow[] = [];
  const d = chartData?.dasha;
  if (!d?.maha_dasha || !d?.maha_dasha_start || !d?.maha_dasha_end) return out;

  const mahaLord: string = d.maha_dasha;
  const mahaStart = new Date(d.maha_dasha_start);
  const mahaEnd = new Date(d.maha_dasha_end);
  const mahaSpan = mahaEnd.getTime() - mahaStart.getTime();
  const mahaIdx = DASHA_ORDER.indexOf(mahaLord);
  if (mahaIdx < 0) return out;

  const now = Date.now();
  const horizon = now + horizonMs;

  let antarStart = mahaStart;
  for (let i = 0; i < 9; i++) {
    const antarLord = DASHA_ORDER[(mahaIdx + i) % 9];
    const antarFrac = DASHA_YEARS[antarLord] / TOTAL;
    const antarMs = mahaSpan * antarFrac;
    const antarEnd = new Date(antarStart.getTime() + antarMs);

    if (antarEnd.getTime() >= now && antarStart.getTime() <= horizon) {
      out.push({
        level: "antardasha",
        maha_lord: mahaLord,
        antar_lord: antarLord,
        start: antarStart,
        end: antarEnd,
      });

      // Pratyantar subdivisions inside the antar (only the next 6 months of pratyantars to keep noise down)
      let pStart = antarStart;
      const antarIdx = (mahaIdx + i) % 9;
      for (let j = 0; j < 9; j++) {
        const pLord = DASHA_ORDER[(antarIdx + j) % 9];
        const pFrac = DASHA_YEARS[pLord] / TOTAL;
        const pMs = antarMs * pFrac;
        const pEnd = new Date(pStart.getTime() + pMs);
        if (pEnd.getTime() >= now && pStart.getTime() <= Math.min(horizon, now + 240 * 24 * 60 * 60 * 1000)) {
          out.push({
            level: "pratyantardasha",
            maha_lord: mahaLord,
            antar_lord: antarLord,
            pratyantar_lord: pLord,
            start: pStart,
            end: pEnd,
          });
        }
        pStart = pEnd;
        if (pStart.getTime() > horizon) break;
      }
    }

    antarStart = antarEnd;
    if (antarStart.getTime() > horizon) break;
  }

  return out;
}

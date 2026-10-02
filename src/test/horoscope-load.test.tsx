// Regression tests for the daily horoscope page's load sequence: ask the server
// once, then poll until the reading lands — however long it takes, and however
// often auth hands the page equal-but-new user/chart objects meanwhile.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

type Row = { sign_name: string; valid_date: string; period: string; language: string; mode: string; status: string; content: string };
const db: { rows: Row[] } = { rows: [] };

// Minimal PostgREST stand-in: eq/in filters, and maybeSingle() errors on >1 row like the real thing.
function builder(table: string) {
  const filters: [string, string, any][] = [];
  let single = false;
  const run = () => {
    if (table !== "daily_horoscopes") return Promise.resolve({ data: single ? null : [], error: null });
    const rows = db.rows.filter((r: any) => filters.every(([op, col, v]) => (op === "eq" ? r[col] === v : (v as any[]).includes(r[col]))));
    if (single) {
      return Promise.resolve(rows.length > 1 ? { data: null, error: { code: "PGRST116" } } : { data: rows[0] ?? null, error: null });
    }
    return Promise.resolve({ data: rows, error: null });
  };
  const b: any = {
    select: () => b,
    eq: (c: string, v: any) => (filters.push(["eq", c, v]), b),
    in: (c: string, v: any[]) => (filters.push(["in", c, v]), b),
    maybeSingle: () => ((single = true), b),
    then: (res: any, rej: any) => run().then(res, rej),
  };
  return b;
}
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (t: string) => builder(t) } }));

const auth: any = { user: null, session: null, isLoading: false };
const chart: any = { activeChart: null, isLoading: true };
const rishi = { enabled: false, loading: false };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/useActiveChart", () => ({ useActiveChart: () => chart }));
vi.mock("@/hooks/useRishiGuru", () => ({ useRishiGuru: () => rishi }));

// Only the load/poll orchestration is under test; stub the rest of the page's surface.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, d?: any) => (typeof d === "string" ? d : k), i18n: { language: "en" } }),
}));
vi.mock("@/lib/i18nClient", () => ({ getCurrentLanguage: () => "en" }));
vi.mock("@/lib/panchanga-i18n", () => ({
  formatReadingDate: () => "date", localNum: (n: any) => String(n), pakshaTithiLabel: () => "", planetLabel: (_t: any, p: any) => p, signLabel: (_t: any, s: any) => s,
}));
// vi.mock factories are hoisted above module-level consts, so the helper has to be too.
const { stub } = vi.hoisted(() => ({
  stub: (testId?: string) => ({ default: () => (testId ? <div data-testid={testId} /> : null) }),
}));
vi.mock("@/components/layout/SacredPageShell", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/layout/PageNavRail", () => stub());
vi.mock("@/components/layout/CosmicFieldCard", () => stub());
vi.mock("@/components/ReadingAsChip", () => stub());
vi.mock("@/components/RishiGuruBadge", () => stub());
vi.mock("@/components/PillTabs", () => stub());
vi.mock("@/components/horoscope/NextRefreshBadge", () => stub());
vi.mock("@/components/horoscope/CosmicLoadingSkeleton", () => stub("loading"));
vi.mock("@/components/horoscope/DailyHeroCard", () => stub());
vi.mock("@/components/horoscope/YesterdayShiftCard", () => stub());
vi.mock("@/components/horoscope/ReactionStrip", () => stub());
vi.mock("@/components/horoscope/JournalPin", () => stub());
vi.mock("@/components/horoscope/ThreeActs", () => stub("acts"));
vi.mock("@/components/horoscope/IfThenStrip", () => stub());
vi.mock("@/components/horoscope/MicroRitualCard", () => stub());
vi.mock("@/components/horoscope/PersonalCallbackBanner", () => stub());
vi.mock("@/components/horoscope/GuruCitationsFooter", () => stub());
vi.mock("@/components/AstroText", () => ({ default: ({ text }: any) => <span>{text}</span> }));

import DailyHoroscopePage from "@/pages/DailyHoroscopePage";

const SIGN_KEY = "u:user-1:Cancer";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const reading = (greeting: string) => JSON.stringify({ greeting, three_acts: { morning: "m" }, guidance: "g" });
const row = (mode: string, status: string, content = "{}"): Row => ({ sign_name: SIGN_KEY, valid_date: today(), period: "daily", language: "en", mode, status, content });

let posts = 0;
/** Edge function stand-in: stamps a processing row, finishes it `genMs` later. */
function installServer(mode: string, genMs: number, greeting = "fresh") {
  posts = 0;
  (globalThis as any).fetch = vi.fn(async () => {
    posts++;
    const mine = db.rows.find((r) => r.mode === mode);
    if (mine?.status === "ready") {
      return new Response(JSON.stringify({ horoscope: mine.content, sign: "Cancer", sign_key: SIGN_KEY, valid_date: today() }), { status: 200 });
    }
    if (!mine) {
      db.rows.push(row(mode, "processing"));
      setTimeout(() => {
        const r = db.rows.find((x) => x.mode === mode)!;
        r.status = "ready";
        r.content = reading(greeting);
      }, genMs);
    }
    return new Response(JSON.stringify({ status: "processing", sign: "Cancer", sign_key: SIGN_KEY, valid_date: today(), meta: { mode } }), { status: 202 });
  });
}

const mkUser = () => ({ id: "user-1" });
const mkChart = () => ({ id: "chart-1", full_name: "Test Person", chart_data: { moon_sign: "Cancer", dasha: {} } });
const ui = () => (
  <MemoryRouter>
    <DailyHoroscopePage />
  </MemoryRouter>
);
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const state = () =>
  screen.queryByTestId("acts") ? "READING"
  : screen.queryByTestId("loading") ? "SPINNER"
  : document.body.textContent?.includes("horoscope.toast.loadFailed") ? "ERROR-CARD"
  : "BLANK";

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  db.rows = [];
  auth.user = mkUser();
  auth.session = { access_token: "tok" };
  chart.activeChart = null;
  chart.isLoading = true;
  rishi.enabled = false;
  rishi.loading = false;
  (import.meta as any).env.VITE_SUPABASE_URL = "http://x.test";
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("first load of the day (nothing generated yet)", () => {
  // genMs: how long the model takes. 95s used to outlast the client's 80s poll window.
  // churnMs: how often auth re-emits an equal user and the chart is re-fetched (tab refocus).
  for (const genMs of [12_000, 55_000, 95_000]) {
    for (const churnMs of [0, 3_000]) {
      it(`generation ${genMs / 1000}s, refocus every ${churnMs ? churnMs / 1000 + "s" : "never"} → reading shows, one request`, async () => {
        installServer("standard", genMs);
        const { rerender } = render(ui());
        await advance(300);
        // The chart provider finishes loading after the page has mounted.
        chart.activeChart = mkChart();
        chart.isLoading = false;
        rerender(ui());

        for (let t = 300; t < 200_000 && state() !== "READING"; t += 1_000) {
          await advance(1_000);
          if (churnMs && (t - 300) % churnMs === 0 && t < genMs) {
            auth.user = mkUser();
            chart.activeChart = mkChart();
            rerender(ui());
          }
        }
        expect(state()).toBe("READING");
        expect(posts).toBe(1);
      });
    }
  }

  it("does not ask the server before the chart has loaded", async () => {
    installServer("standard", 5_000);
    render(ui());
    await advance(2_000);
    expect(posts).toBe(0);
  });
});

describe("guru and standard readings share a sign key", () => {
  it("fast path shows the profile's mode, not whichever row comes first", async () => {
    db.rows = [row("guru", "ready", reading("GURU")), row("standard", "ready", reading("STANDARD"))];
    chart.activeChart = mkChart();
    chart.isLoading = false;
    render(ui());
    await advance(1_000);
    expect(screen.queryByText("STANDARD")).not.toBeNull();
    expect(screen.queryByText("GURU")).toBeNull();
  });

  it("polls through a sibling-mode row instead of erroring on two matches", async () => {
    db.rows = [row("guru", "ready", reading("GURU"))]; // yesterday's toggle
    rishi.loading = true; // mode unknown → no fast path; the server decides
    installServer("standard", 12_000, "STANDARD");
    chart.activeChart = mkChart();
    chart.isLoading = false;
    render(ui());
    await advance(30_000);
    expect(state()).toBe("READING");
    expect(screen.queryByText("STANDARD")).not.toBeNull();
  });
});

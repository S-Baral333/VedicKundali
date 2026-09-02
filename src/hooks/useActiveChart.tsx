import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface ActiveChartSummary {
  id: string;
  full_name: string;
  date_of_birth: string;
  birthplace: string;
  is_primary: boolean;
  chart_data: any;
  created_at: string;
}

export type SwitchPhase = "idle" | "pulsing" | "settled";
export interface SwitchingState {
  phase: SwitchPhase;
  targetName: string | null;
}

interface ActiveChartContextValue {
  charts: ActiveChartSummary[];
  activeChart: ActiveChartSummary | null;
  isLoading: boolean;
  switching: SwitchingState;
  setActiveChart: (chartId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ActiveChartContext = createContext<ActiveChartContextValue | undefined>(undefined);

const STORAGE_KEY = "active_chart_id";

/** Clear any chart-scoped client caches when active chart changes. */
function clearChartScopedCaches() {
  try {
    sessionStorage.removeItem("dashboard-data");
    // Wipe horoscope L1 cache (legacy and per-chart keyed)
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("horoscope-") || k.startsWith("timeline_") || k.startsWith("muhurta_")) {
        localStorage.removeItem(k);
      }
    });
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith("timeline_") || k.startsWith("muhurta_")) {
        sessionStorage.removeItem(k);
      }
    });
  } catch { /* ignore */ }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ActiveChartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [charts, setCharts] = useState<ActiveChartSummary[]>([]);
  const [activeChart, setActiveChartState] = useState<ActiveChartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [switching, setSwitching] = useState<SwitchingState>({ phase: "idle", targetName: null });

  const load = useCallback(async () => {
    if (!user) {
      setCharts([]);
      setActiveChartState(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from("birth_charts")
      .select("id, full_name, date_of_birth, birthplace, is_primary, chart_data, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const list = (data as ActiveChartSummary[]) || [];
    setCharts(list);

    // Resolution order: localStorage hint → DB primary → oldest
    const hint = localStorage.getItem(STORAGE_KEY);
    const fromHint = hint ? list.find((c) => c.id === hint) : null;
    const fromDb = list.find((c) => c.is_primary);
    const fallback = list[list.length - 1] || null;
    setActiveChartState(fromHint || fromDb || fallback);
    setIsLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const setActiveChart = useCallback(async (chartId: string) => {
    const target = charts.find((c) => c.id === chartId);
    if (!target || !user) return;
    if (activeChart?.id === chartId) return;

    const firstName = target.full_name?.trim().split(/\s+/)[0] || target.full_name || "Seeker";

    // Phase 1 — start pulsing immediately
    setSwitching({ phase: "pulsing", targetName: firstName });

    // Optimistic UI updates
    setActiveChartState(target);
    setCharts((prev) => prev.map((c) => ({ ...c, is_primary: c.id === chartId })));
    localStorage.setItem(STORAGE_KEY, chartId);
    clearChartScopedCaches();

    // Run DB write while the pulse animation is running.
    const dbPromise = supabase
      .from("birth_charts")
      .update({ is_primary: true })
      .eq("id", chartId);

    // Hold the pulsing phase for at least 1500ms so the acceleration is felt.
    const [{ error }] = await Promise.all([dbPromise, sleep(1500)]);

    if (error) {
      setSwitching({ phase: "idle", targetName: null });
      toast({ title: "Could not switch chart", description: error.message, variant: "destructive" });
      load();
      return;
    }

    // Phase 2 — settle: rings lock, "Welcome, {Name}" beat
    setSwitching({ phase: "settled", targetName: firstName });
    await sleep(1100);

    // Phase 3 — overlay fades out
    setSwitching({ phase: "idle", targetName: null });
  }, [charts, user, activeChart, load]);

  return (
    <ActiveChartContext.Provider value={{ charts, activeChart, isLoading, switching, setActiveChart, refresh: load }}>
      {children}
    </ActiveChartContext.Provider>
  );
}

// Stable no-op fallback so a transient render outside the provider (e.g. during HMR)
// never crashes the app. Real usage is always inside <ActiveChartProvider>.
const noopActiveChartContext: ActiveChartContextValue = {
  charts: [],
  activeChart: null,
  isLoading: true,
  switching: { phase: "idle", targetName: null },
  setActiveChart: async () => {},
  refresh: async () => {},
};

let warnedMissingProvider = false;

export function useActiveChart() {
  const ctx = useContext(ActiveChartContext);
  if (!ctx) {
    if (!warnedMissingProvider && typeof console !== "undefined") {
      warnedMissingProvider = true;
      console.warn("[useActiveChart] used outside ActiveChartProvider — returning empty fallback.");
    }
    return noopActiveChartContext;
  }
  return ctx;
}

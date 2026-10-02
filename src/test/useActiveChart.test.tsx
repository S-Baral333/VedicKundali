import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";

let chartFetches = 0;
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const b: any = {
        select: () => b, eq: () => b, order: () => b,
        update: () => b,
        then: (res: any, rej: any) => {
          chartFetches++;
          return Promise.resolve({ data: [{ id: "c1", full_name: "A", is_primary: true, chart_data: {}, created_at: "" }], error: null }).then(res, rej);
        },
      };
      return b;
    },
  },
}));
const auth: any = { user: null };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/i18n/config", () => ({ default: { t: (_k: string, d: string) => d } }));

import { ActiveChartProvider, useActiveChart } from "@/hooks/useActiveChart";

let latest: ReturnType<typeof useActiveChart>;
const Probe = () => ((latest = useActiveChart()), null);
const ui = () => (
  <ActiveChartProvider>
    <Probe />
  </ActiveChartProvider>
);

beforeEach(() => {
  chartFetches = 0;
  auth.user = null;
  localStorage.clear();
});

describe("ActiveChartProvider", () => {
  it("reports loading from the moment a user appears, until their charts arrive", async () => {
    const { rerender } = render(ui());
    await waitFor(() => expect(latest.isLoading).toBe(false)); // signed out: nothing to load
    auth.user = { id: "u1" };
    rerender(ui());
    // Same commit as the user appearing — before the fetch has even been issued.
    expect(latest.isLoading).toBe(true);
    await waitFor(() => expect(latest.isLoading).toBe(false));
    expect(latest.activeChart?.id).toBe("c1");
  });

  it("does not refetch charts when auth re-emits an equal user (tab refocus)", async () => {
    auth.user = { id: "u1" };
    const { rerender } = render(ui());
    await waitFor(() => expect(latest.isLoading).toBe(false));
    const before = chartFetches;
    const chartBefore = latest.activeChart;
    await act(async () => {
      auth.user = { id: "u1" }; // new object, same user
      rerender(ui());
    });
    expect(chartFetches).toBe(before);
    expect(latest.activeChart).toBe(chartBefore);
  });
});

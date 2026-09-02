import { useEffect, useState } from "react";

export type PerfTier = "high" | "medium" | "low";
export type PerfMode = "auto" | PerfTier;

/**
 * If `mode` is provided and not 'auto', returns it directly. Otherwise
 * runs heuristic device-tier detection.
 */
export function usePerformanceTier(mode: PerfMode = "auto"): PerfTier {
  const [tier, setTier] = useState<PerfTier>(mode === "auto" ? "high" : mode);

  useEffect(() => {
    if (mode !== "auto") {
      setTier(mode);
      return;
    }
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as any).deviceMemory ?? 4;
    const conn = (navigator as any).connection?.effectiveType ?? "4g";

    let t: PerfTier = "high";
    if (cores <= 2 || mem <= 2 || conn === "2g" || conn === "slow-2g") t = "low";
    else if (cores <= 4 || mem <= 4 || conn === "3g") t = "medium";

    setTier(t);
  }, [mode]);

  return tier;
}

export function scaleForTier(value: number, tier: PerfTier): number {
  if (tier === "low") return Math.round(value * 0.35);
  if (tier === "medium") return Math.round(value * 0.65);
  return value;
}

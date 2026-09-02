import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppearanceConfig, DEFAULT_APPEARANCE, matchConfig, normalizeConfig } from "@/lib/appearance-defaults";

let cache: { route_pattern: string; config: AppearanceConfig }[] | null = null;
let cacheAt = 0;
const TTL = 5 * 60 * 1000;
const inflight: { p: Promise<typeof cache> | null } = { p: null };

async function fetchConfigs() {
  const now = Date.now();
  if (cache && now - cacheAt < TTL) return cache;
  if (inflight.p) return inflight.p;
  inflight.p = (async () => {
    try {
      const { data, error } = await supabase
        .from("site_appearance_config")
        .select("route_pattern, config")
        .eq("status", "published");
      if (error) throw error;
      cache = (data ?? []).map((r) => ({
        route_pattern: r.route_pattern,
        config: (r.config as unknown as AppearanceConfig) ?? DEFAULT_APPEARANCE,
      }));
      cacheAt = Date.now();
      return cache;
    } catch {
      cache = [];
      cacheAt = Date.now();
      return cache;
    } finally {
      inflight.p = null;
    }
  })();
  return inflight.p;
}

export function invalidateAppearanceCache() {
  cache = null;
  cacheAt = 0;
}

/**
 * Subscribe to client-side route changes WITHOUT depending on react-router
 * context (so this hook works even when called outside <BrowserRouter>).
 *
 * We patch history.pushState/replaceState once, then dispatch a synthetic
 * "locationchange" event that listeners can subscribe to.
 */
let historyPatched = false;
function ensureHistoryPatched() {
  if (historyPatched || typeof window === "undefined") return;
  historyPatched = true;
  const fire = () => window.dispatchEvent(new Event("locationchange"));
  const _push = history.pushState;
  const _replace = history.replaceState;
  history.pushState = function (...args) {
    const r = _push.apply(this, args as any);
    fire();
    return r;
  };
  history.replaceState = function (...args) {
    const r = _replace.apply(this, args as any);
    fire();
    return r;
  };
  window.addEventListener("popstate", fire);
}

function usePathname(override?: string) {
  const [path, setPath] = useState<string>(() =>
    override ?? (typeof window !== "undefined" ? window.location.pathname : "/")
  );
  useEffect(() => {
    if (override !== undefined) {
      setPath(override);
      return;
    }
    ensureHistoryPatched();
    const onChange = () => setPath(window.location.pathname);
    window.addEventListener("locationchange", onChange);
    return () => window.removeEventListener("locationchange", onChange);
  }, [override]);
  return path;
}

interface UseAppearanceOptions {
  /** Override the active config (used by the Studio live preview). */
  override?: AppearanceConfig;
  /** Force a specific pathname instead of window.location (used by preview). */
  pathnameOverride?: string;
}

export function useAppearanceConfig(opts: UseAppearanceOptions = {}): AppearanceConfig {
  const path = usePathname(opts.pathnameOverride);
  const [config, setConfig] = useState<AppearanceConfig>(() =>
    opts.override ?? DEFAULT_APPEARANCE
  );

  useEffect(() => {
    if (opts.override) {
      setConfig(normalizeConfig(opts.override));
      return;
    }
    let mounted = true;
    fetchConfigs().then((rows) => {
      if (!mounted) return;
      setConfig(matchConfig(path, rows ?? []));
    });
    return () => {
      mounted = false;
    };
  }, [path, opts.override]);

  return config;
}

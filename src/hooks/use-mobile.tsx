import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export type Viewport = "mobile" | "tablet" | "desktop";

function detectViewport(): Viewport {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < MOBILE_BREAKPOINT) return "mobile";
  if (w < TABLET_BREAKPOINT) return "tablet";
  return "desktop";
}

/**
 * Reactive viewport profile. Updates on resize / orientation change so
 * rotating a phone or resizing a window re-fits the universe scene.
 *
 * Accepts an optional override (used by the admin Studio to preview a
 * different device without resizing the window).
 */
export function useViewport(override?: Viewport): Viewport {
  const [vp, setVp] = React.useState<Viewport>(() => override ?? detectViewport());

  React.useEffect(() => {
    if (override) {
      setVp(override);
      return;
    }
    const onChange = () => setVp(detectViewport());
    window.addEventListener("resize", onChange, { passive: true });
    window.addEventListener("orientationchange", onChange, { passive: true });
    onChange();
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, [override]);

  return vp;
}


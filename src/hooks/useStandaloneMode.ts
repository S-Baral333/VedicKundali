import { useEffect, useState } from "react";

export interface StandaloneState {
  isStandalone: boolean;
  installSource: string | null;
}

/**
 * Detects whether the app is running as an installed PWA, and reads
 * the `?source=` start_url marker (set to "pwa" in the manifest).
 */
export function useStandaloneMode(): StandaloneState {
  const [state, setState] = useState<StandaloneState>(() => ({
    isStandalone: false,
    installSource: null,
  }));

  useEffect(() => {
    const compute = () => {
      const mq = window.matchMedia("(display-mode: standalone)").matches;
      // iOS Safari exposes navigator.standalone
      const iosStandalone =
        typeof (navigator as unknown as { standalone?: boolean }).standalone === "boolean" &&
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      const params = new URLSearchParams(window.location.search);
      setState({
        isStandalone: mq || iosStandalone,
        installSource: params.get("source"),
      });
    };
    compute();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", compute);
    return () => mq.removeEventListener?.("change", compute);
  }, []);

  return state;
}

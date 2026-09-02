import { useEffect, useRef } from "react";

/**
 * Subscribes to device orientation. Returns a ref with normalized
 * tilt values in [-1..1] for x and y. No re-renders.
 * On iOS, requests permission on first user gesture.
 */
export function useDeviceTilt(enabled = true) {
  const tilt = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      tilt.current.x = Math.max(-1, Math.min(1, gamma / 45));
      tilt.current.y = Math.max(-1, Math.min(1, beta / 45));
    };

    const attach = () => {
      window.addEventListener("deviceorientation", onOrient, { passive: true });
    };

    const reqPerm = (DeviceOrientationEvent as any)?.requestPermission;
    if (typeof reqPerm === "function") {
      // iOS — defer until first user click
      const onFirstGesture = async () => {
        window.removeEventListener("click", onFirstGesture);
        try {
          const res = await reqPerm();
          if (res === "granted") attach();
        } catch { /* ignore */ }
      };
      window.addEventListener("click", onFirstGesture, { once: true });
    } else {
      attach();
    }

    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [enabled]);

  return tilt;
}

import { useEffect, useState } from "react";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";

/**
 * Mounts the PWA update hook only when the app is NOT running inside an
 * iframe or local dev host. The service worker itself is also disabled
 * in dev (`devOptions.enabled: false`), so this is belt-and-suspenders.
 */
function PWAUpdaterInner() {
  usePWAUpdate();
  return null;
}

export default function PWAUpdater() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }
    const host = window.location.hostname;
    const isPreview =
      host === "localhost" ||
      host === "127.0.0.1";
    if (!inIframe && !isPreview) setEnabled(true);
  }, []);

  if (!enabled) return null;
  return <PWAUpdaterInner />;
}

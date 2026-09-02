import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

/**
 * Subscribes to service-worker updates and surfaces a friendly toast
 * letting the user opt-in to reload.
 *
 * No-op in iframes / local dev hosts (the SW is not registered there).
 */
export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Periodic update check every hour while the app is open
      if (registration) {
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.warn("[PWA] SW register failed", error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success("Kundali is ready to use offline", {
        description: "Cached pages will work without an internet connection.",
        duration: 4000,
      });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast("A new version of Kundali is ready", {
        description: "Reload to apply the latest update.",
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => updateServiceWorker(true),
        },
        onDismiss: () => setNeedRefresh(false),
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);
}

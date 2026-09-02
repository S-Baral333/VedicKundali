import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X, Share } from "lucide-react";
import KundaliMark from "@/components/KundaliMark";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "kundali-install-dismissed-at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function detectIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ identifies as Mac
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIOS && isSafari;
}

export default function InstallPromptBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    const ios = detectIOSSafari();
    setIsIOS(ios);
    setVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setVisible(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
      setDeferredPrompt(null);
    } else {
      navigate("/install");
    }
  };

  if (!visible) return null;

  // iOS Safari: cannot programmatically install — guide the user to Share → Add to Home Screen.
  if (isIOS && !deferredPrompt) {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-50 flex justify-center animate-in slide-in-from-bottom-4 duration-500">
        <Card className="flex items-center gap-3 px-4 py-3 shadow-lg border-primary/20 bg-card/95 backdrop-blur-md max-w-md w-full">
          <KundaliMark size={28} />
          <p className="text-sm text-foreground flex-1 leading-snug">
            Install <strong>Kundali</strong>: tap{" "}
            <Share className="inline h-3.5 w-3.5 align-text-bottom mx-0.5" /> Share, then{" "}
            <strong>Add to Home Screen</strong>.
          </p>
          <Button variant="ghost" size="icon" onClick={dismiss} className="h-8 w-8 flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-50 flex justify-center animate-in slide-in-from-bottom-4 duration-500">
      <Card className="flex items-center gap-3 px-4 py-3 shadow-lg border-primary/20 bg-card/95 backdrop-blur-md max-w-md w-full">
        <KundaliMark size={28} />
        <p className="text-sm text-foreground flex-1">
          Install <strong>Kundali</strong> for the best experience
        </p>
        <Button size="sm" onClick={handleInstall} className="gap-1.5 flex-shrink-0">
          <Download className="h-3.5 w-3.5" /> Install
        </Button>
        <Button variant="ghost" size="icon" onClick={dismiss} className="h-8 w-8 flex-shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
}

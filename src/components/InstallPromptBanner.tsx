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

/**
 * Height reserved for the banner (card + gap) on mobile. Published as a CSS
 * variable so the page shell can pad its content and nothing hides behind it.
 */
const BANNER_RESERVED_PX = 60;

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

  // Let the layout reserve space under the content while the banner is showing.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--install-banner-h", visible ? `${BANNER_RESERVED_PX}px` : "0px");
    return () => root.style.setProperty("--install-banner-h", "0px");
  }, [visible]);

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

  // Mobile: sits directly above the bottom dock (dock height + safe-area + gap).
  // Desktop: bottom-right corner card.
  const wrapperClass =
    "fixed z-40 left-3 right-3 flex justify-center animate-in slide-in-from-bottom-4 duration-500 " +
    "bottom-[calc(var(--mobile-dock-h,64px)+env(safe-area-inset-bottom,0px)+8px)] md:bottom-6 md:left-auto md:right-6";
  const cardClass =
    "flex items-center gap-2.5 pl-3 pr-1 py-1.5 shadow-lg border-primary/25 bg-card/95 backdrop-blur-md w-full max-w-md md:w-auto";

  const closeButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={dismiss}
      aria-label="Dismiss install prompt"
      className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-foreground"
    >
      <X className="h-4 w-4" />
    </Button>
  );

  // iOS Safari: cannot programmatically install — guide the user to Share → Add to Home Screen.
  if (isIOS && !deferredPrompt) {
    return (
      <div className={wrapperClass} role="status">
        <Card className={cardClass}>
          <KundaliMark size={24} />
          <p className="text-[13px] text-foreground flex-1 leading-snug min-w-0">
            Install <strong>Kundali</strong>: tap{" "}
            <Share className="inline h-3.5 w-3.5 align-text-bottom mx-0.5" aria-label="Share" /> then{" "}
            <strong>Add to Home Screen</strong>
          </p>
          {closeButton}
        </Card>
      </div>
    );
  }

  return (
    <div className={wrapperClass} role="status">
      <Card className={cardClass}>
        <KundaliMark size={24} />
        <p className="text-[13px] text-foreground flex-1 leading-snug min-w-0">
          Install <strong>Kundali</strong> for the best experience
        </p>
        <Button size="sm" onClick={handleInstall} className="gap-1.5 flex-shrink-0 h-9">
          <Download className="h-3.5 w-3.5" /> Install
        </Button>
        {closeButton}
      </Card>
    </div>
  );
}

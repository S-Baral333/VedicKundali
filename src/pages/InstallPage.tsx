import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, ArrowLeft, Check, Share, MoreVertical, Plus } from "lucide-react";
import KundaliMark from "@/components/KundaliMark";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) setPlatform("ios");
    else if (/Android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Already Installed!</h1>
            <p className="text-muted-foreground">Kundali is installed on your device. Open it from your home screen for the best experience.</p>
            <Button asChild variant="outline">
              <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to App</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="text-center mb-10">
          <div className="mb-4 flex justify-center">
            <KundaliMark size={64} glow />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Install Kundali</h1>
          <p className="text-muted-foreground">Add Kundali to your home screen for instant access — no app store needed.</p>
        </div>

        {/* Native install prompt (Chrome/Edge) */}
        {deferredPrompt && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="pt-6 text-center space-y-4">
              <Download className="h-10 w-10 text-primary mx-auto" />
              <p className="text-foreground font-medium">Your browser supports direct installation!</p>
              <Button onClick={handleInstall} size="lg" className="gap-2">
                <Download className="h-4 w-4" /> Install Kundali
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Platform-specific instructions */}
        <div className="space-y-6">
          {(platform === "ios" || platform === "desktop") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5 text-primary" /> iPhone & iPad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Step num={1} icon={<Share className="h-4 w-4" />} text='Tap the Share button in Safari' />
                <Step num={2} icon={<Plus className="h-4 w-4" />} text='Scroll down and tap "Add to Home Screen"' />
                <Step num={3} icon={<Check className="h-4 w-4" />} text='Tap "Add" to confirm' />
              </CardContent>
            </Card>
          )}

          {(platform === "android" || platform === "desktop") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5 text-primary" /> Android
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Step num={1} icon={<MoreVertical className="h-4 w-4" />} text='Tap the menu (⋮) in Chrome' />
                <Step num={2} icon={<Download className="h-4 w-4" />} text='Tap "Install app" or "Add to Home Screen"' />
                <Step num={3} icon={<Check className="h-4 w-4" />} text='Tap "Install" to confirm' />
              </CardContent>
            </Card>
          )}

          {platform === "desktop" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Monitor className="h-5 w-5 text-primary" /> Desktop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Step num={1} icon={<Download className="h-4 w-4" />} text='Click the install icon in the address bar (Chrome/Edge)' />
                <Step num={2} icon={<Check className="h-4 w-4" />} text='Click "Install" in the dialog' />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ num, icon, text }: { num: number; icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
        {num}
      </div>
      <div className="flex items-center gap-2 text-foreground pt-0.5">
        {icon}
        <span>{text}</span>
      </div>
    </div>
  );
}

import { Lock, Sparkles, Crown, Zap, ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TIERS, type Tier, type FeatureKey, FEATURE_COPY, requiredTierFor,
} from "@/lib/tiers";
import { UPGRADE_EVENT, type UpgradeEventDetail } from "@/hooks/useSubscription";

const TIER_ICONS: Record<Tier, typeof Sparkles> = {
  darshana: Sparkles,
  sadhaka: Sparkles,
  grihastha: Crown,
  jyotisha: Zap,
};

const BENEFITS: Record<Tier, string[]> = {
  darshana: [],
  sadhaka: [
    "Up to 3 charts (you + family)",
    "Full Vedic reading + South Indian view",
    "Destiny Timeline & Muhurta",
    "20 dream interpretations / month",
    "30 Guru questions / month",
    "Sacred Kundali PDF download",
  ],
  grihastha: [
    "Up to 7 charts — family + close ones",
    "Kundali Milan compatibility",
    "All divisional charts (D1–D60)",
    "Transit overlays & Sade Sati tracker",
    "50 Guru questions / month (Hindi too)",
    "50 dream interpretations / month",
  ],
  jyotisha: [
    "Everything unlimited",
    "Voice Guru & client dashboard",
    "Batch chart generation",
    "White-label PDF with your logo",
    "Full Panchangam ephemeris",
  ],
};

/** Global mount — listens for UPGRADE_EVENT and shows the modal. Place once in App. */
export default function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<UpgradeEventDetail>({});
  const navigate = useNavigate();

  useEffect(() => {
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<UpgradeEventDetail>;
      setDetail(ce.detail ?? {});
      setOpen(true);
    };
    window.addEventListener(UPGRADE_EVENT, onOpen);
    return () => window.removeEventListener(UPGRADE_EVENT, onOpen);
  }, []);

  const required: Tier =
    detail.requiredTier ??
    (detail.feature ? requiredTierFor(detail.feature) : "sadhaka");
  const cfg = TIERS[required];
  const Icon = TIER_ICONS[required];
  const feat = detail.feature ? FEATURE_COPY[detail.feature] : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="p-6 space-y-5 bg-gradient-to-b from-card to-background">
          <DialogHeader className="text-center items-center space-y-3">
            <div className="relative inline-flex">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-3.5 rounded-full border border-primary/30">
                <Lock className="h-7 w-7 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-serif font-bold">
              {feat ? `Unlock ${feat.name}` : `${cfg.sanskrit} required`}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {feat?.description ?? "This feature is available on a higher tier."}
              <br />
              <span className="text-primary font-medium">
                Available from {cfg.sanskrit} {cfg.devanagari} onward.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-medium">{cfg.sanskrit} Plan</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-serif text-primary">
                  AUD ${cfg.priceMonthlyAud.toFixed(2)}
                  <span className="text-xs text-muted-foreground font-sans">/mo</span>
                </div>
                {cfg.priceAnnualAud > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    or ${cfg.priceAnnualAud}/yr — save 17%
                  </div>
                )}
              </div>
            </div>
            <ul className="space-y-1.5">
              {BENEFITS[required].slice(0, 4).map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => { setOpen(false); navigate("/pricing"); }}
            >
              Upgrade to {cfg.sanskrit} <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
                onClick={() => { setOpen(false); navigate("/pricing"); }}
              >
                Compare all plans
              </button>
              <span>7-day trial · Cancel anytime</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

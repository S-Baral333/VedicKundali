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
import { useTranslation } from "react-i18next";

const TIER_ICONS: Record<Tier, typeof Sparkles> = {
  darshana: Sparkles,
  sadhaka: Sparkles,
  grihastha: Crown,
  jyotisha: Zap,
};

const BENEFITS: Record<Tier, { key: string; text: string }[]> = {
  darshana: [],
  sadhaka: [
    { key: "ui.upgradeModal.sadhaka1", text: "Up to 3 charts (you + family)" },
    { key: "ui.upgradeModal.sadhaka2", text: "Full Vedic reading + South Indian view" },
    { key: "ui.upgradeModal.sadhaka3", text: "Destiny Timeline & Muhurta" },
    { key: "ui.upgradeModal.sadhaka4", text: "20 dream interpretations / month" },
    { key: "ui.upgradeModal.sadhaka5", text: "30 Guru questions / month" },
    { key: "ui.upgradeModal.sadhaka6", text: "Sacred Kundali PDF download" },
  ],
  grihastha: [
    { key: "ui.upgradeModal.grihastha1", text: "Up to 7 charts — family + close ones" },
    { key: "ui.upgradeModal.grihastha2", text: "Kundali Milan compatibility" },
    { key: "ui.upgradeModal.grihastha3", text: "All divisional charts (D1–D60)" },
    { key: "ui.upgradeModal.grihastha4", text: "Transit overlays & Sade Sati tracker" },
    { key: "ui.upgradeModal.grihastha5", text: "50 Guru questions / month (Hindi too)" },
    { key: "ui.upgradeModal.grihastha6", text: "50 dream interpretations / month" },
  ],
  jyotisha: [
    { key: "ui.upgradeModal.jyotisha1", text: "Everything unlimited" },
    { key: "ui.upgradeModal.jyotisha2", text: "Voice Guru & client dashboard" },
    { key: "ui.upgradeModal.jyotisha3", text: "Batch chart generation" },
    { key: "ui.upgradeModal.jyotisha4", text: "White-label PDF with your logo" },
    { key: "ui.upgradeModal.jyotisha5", text: "Full Panchangam ephemeris" },
  ],
};

/** Global mount — listens for UPGRADE_EVENT and shows the modal. Place once in App. */
export default function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<UpgradeEventDetail>({});
  const navigate = useNavigate();
  const { t } = useTranslation();

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
  const featRaw = detail.feature ? FEATURE_COPY[detail.feature] : null;
  const feat = featRaw && detail.feature
    ? {
        name: t("pages:ui.upgradeModal.feat_" + detail.feature + "_name", featRaw.name),
        description: t("pages:ui.upgradeModal.feat_" + detail.feature + "_desc", featRaw.description),
      }
    : null;

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
              {feat ? t("pages:ui.upgradeModal.unlockFeature", "Unlock {{feature}}", { feature: feat.name }) : t("pages:ui.upgradeModal.tierRequired", "{{tier}} required", { tier: cfg.sanskrit })}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {feat?.description ?? t("pages:ui.upgradeModal.higherTier", "This feature is available on a higher tier.")}
              <br />
              <span className="text-primary font-medium">
                {t("pages:ui.upgradeModal.availableFrom", "Available from {{tier}} {{devanagari}} onward.", { tier: cfg.sanskrit, devanagari: cfg.devanagari })}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-medium">{t("pages:ui.upgradeModal.plan", "{{tier}} Plan", { tier: cfg.sanskrit })}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-serif text-primary">
                  AUD ${cfg.priceMonthlyAud.toFixed(2)}
                  <span className="text-xs text-muted-foreground font-sans">{t("pages:ui.upgradeModal.perMonth", "/mo")}</span>
                </div>
                {cfg.priceAnnualAud > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    {t("pages:ui.upgradeModal.annual", "or ${{price}}/yr — save 17%", { price: cfg.priceAnnualAud })}
                  </div>
                )}
              </div>
            </div>
            <ul className="space-y-1.5">
              {BENEFITS[required].slice(0, 4).map((b) => (
                <li key={b.key} className="flex items-start gap-2 text-sm">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{t("pages:" + b.key, b.text)}</span>
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
              {t("pages:ui.upgradeModal.upgradeTo", "Upgrade to {{tier}}", { tier: cfg.sanskrit })} <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
                onClick={() => { setOpen(false); navigate("/pricing"); }}
              >
                {t("pages:ui.upgradeModal.compare", "Compare all plans")}
              </button>
              <span>{t("pages:ui.upgradeModal.trial", "7-day trial · Cancel anytime")}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

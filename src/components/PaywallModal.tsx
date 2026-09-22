import { Lock, Sparkles, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: "dreams" | "oracle" | "sacred_pdf";
}

const FEATURE_CONFIG = {
  dreams: {
    title: "Monthly Limit Reached",
    titleKey: "ui.paywallModal.limitTitle",
    subtitle: "You've used all your free dream interpretations this month.",
    subtitleKey: "ui.paywallModal.dreamsSubtitle",
  },
  oracle: {
    title: "Monthly Limit Reached",
    titleKey: "ui.paywallModal.limitTitle",
    subtitle: "You've used all your free Guru questions this month.",
    subtitleKey: "ui.paywallModal.oracleSubtitle",
  },
  sacred_pdf: {
    title: "An Elite Ritual",
    titleKey: "ui.paywallModal.eliteTitle",
    subtitleKey: "ui.paywallModal.pdfSubtitle",
    subtitle:
      "The Sacred Kundali PDF — a 10-page parchment scripture with mantras, dasha, yogas and remedies — is reserved for Elite seekers.",
  },
};

const PREMIUM_BENEFITS = [
  { key: "ui.paywallModal.benefitTimeline", text: "Destiny Timeline & Dasha Predictions" },
  { key: "ui.paywallModal.benefitMuhurta", text: "Muhurta Calculator for Auspicious Timing" },
  { key: "ui.paywallModal.benefitMilan", text: "Kundali Milan Compatibility Reports" },
  { key: "ui.paywallModal.benefitDreams20", text: "20 Dream Interpretations / month" },
  { key: "ui.paywallModal.benefitGuru15", text: "15 Guru Questions / month" },
];

const ELITE_BENEFITS = [
  { key: "ui.paywallModal.benefitUnlimited", text: "Unlimited Dreams & Guru Questions" },
  { key: "ui.paywallModal.benefitPriorityAi", text: "Priority AI — deeper, more nuanced readings" },
  { key: "ui.paywallModal.benefitDivisional", text: "Divisional Charts (D9/D10/D7/D12)" },
  { key: "ui.paywallModal.benefitYogini", text: "Yogini Dasha Analysis" },
  { key: "ui.paywallModal.benefitMonthly", text: "Monthly Prediction Reports" },
];

export default function PaywallModal({ open, onOpenChange, feature }: PaywallModalProps) {
  const config = FEATURE_CONFIG[feature];
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center space-y-4">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-4 rounded-full border border-primary/30">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>

          <DialogTitle className="text-2xl font-serif font-bold">
            {t("pages:" + config.titleKey, config.title)}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t("pages:" + config.subtitleKey, config.subtitle)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Premium Benefits */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {t("pages:ui.paywallModal.premiumIncludes", "Premium includes:")}
            </p>
            {PREMIUM_BENEFITS.map((benefit) => (
              <div key={benefit.key} className="flex items-center gap-2 text-sm text-foreground">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span>{t("pages:" + benefit.key, benefit.text)}</span>
              </div>
            ))}
          </div>

          {/* Elite Benefits */}
          <div className="bg-primary/5 rounded-lg p-4 space-y-2 border border-primary/20">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> {t("pages:ui.paywallModal.eliteIncludes", "Elite includes everything above, plus:")}
            </p>
            {ELITE_BENEFITS.map((benefit) => (
              <div key={benefit.key} className="flex items-center gap-2 text-sm text-foreground">
                <Zap className="h-4 w-4 text-primary shrink-0" />
                <span>{t("pages:" + benefit.key, benefit.text)}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            size="lg"
            className="w-full gap-2 text-base"
            onClick={() => { onOpenChange(false); navigate("/pricing"); }}
          >
            <Crown className="h-5 w-5" />
            {t("pages:ui.paywallModal.viewPlans", "View Plans & Pricing")}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {t("pages:ui.paywallModal.comingSoon", "Coming soon • Be the first to know")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

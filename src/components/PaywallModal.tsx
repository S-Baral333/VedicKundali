import { Lock, Sparkles, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: "dreams" | "oracle" | "sacred_pdf";
}

const FEATURE_CONFIG = {
  dreams: {
    title: "Monthly Limit Reached",
    subtitle: "You've used all your free dream interpretations this month.",
  },
  oracle: {
    title: "Monthly Limit Reached",
    subtitle: "You've used all your free Guru questions this month.",
  },
  sacred_pdf: {
    title: "An Elite Ritual",
    subtitle:
      "The Sacred Kundali PDF — a 10-page parchment scripture with mantras, dasha, yogas and remedies — is reserved for Elite seekers.",
  },
};

const PREMIUM_BENEFITS = [
  "Destiny Timeline & Dasha Predictions",
  "Muhurta Calculator for Auspicious Timing",
  "Kundali Milan Compatibility Reports",
  "20 Dream Interpretations / month",
  "15 Guru Questions / month",
];

const ELITE_BENEFITS = [
  "Unlimited Dreams & Guru Questions",
  "Priority AI — deeper, more nuanced readings",
  "Divisional Charts (D9/D10/D7/D12)",
  "Yogini Dasha Analysis",
  "Monthly Prediction Reports",
];

export default function PaywallModal({ open, onOpenChange, feature }: PaywallModalProps) {
  const config = FEATURE_CONFIG[feature];
  const navigate = useNavigate();

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
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {config.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Premium Benefits */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Premium includes:
            </p>
            {PREMIUM_BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-sm text-foreground">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Elite Benefits */}
          <div className="bg-primary/5 rounded-lg p-4 space-y-2 border border-primary/20">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Elite includes everything above, plus:
            </p>
            {ELITE_BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-sm text-foreground">
                <Zap className="h-4 w-4 text-primary shrink-0" />
                <span>{benefit}</span>
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
            View Plans & Pricing
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Coming soon • Be the first to know
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

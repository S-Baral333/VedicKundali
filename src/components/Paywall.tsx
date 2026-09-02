import { ReactNode } from "react";
import { Lock, Sparkles, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

interface PaywallProps {
  children: ReactNode;
  feature: string;
  description?: string;
}

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

export default function Paywall({ children, feature, description }: PaywallProps) {
  const { isPremium, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading || isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[60vh]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="blur-sm opacity-30 pointer-events-none select-none">
          {children}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-primary/20 bg-card/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="pt-8 pb-6 text-center space-y-6">
            <div className="relative inline-flex">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-4 rounded-full border border-primary/30">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                Premium Feature
              </h2>
              <p className="text-lg text-primary font-medium">{feature}</p>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">
              {description || 
                "Unlock predictive insights and actionable cosmic intelligence with a Premium subscription."}
            </p>

            {/* Premium Benefits */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
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
            <div className="bg-primary/5 rounded-lg p-4 space-y-2 text-left border border-primary/20">
              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Elite adds:
              </p>
              {ELITE_BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-sm text-foreground">
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full gap-2 text-base"
              onClick={() => navigate("/pricing")}
            >
              <Crown className="h-5 w-5" />
              View Plans & Pricing
            </Button>

            <p className="text-xs text-muted-foreground">
              Coming soon • Be the first to know
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

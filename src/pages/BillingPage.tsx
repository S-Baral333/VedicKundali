import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, CreditCard, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { TIERS } from "@/lib/tiers";
import TierBadge from "@/components/subscription/TierBadge";
import UsageBar from "@/components/subscription/UsageBar";
import SacredPageShell from "@/components/layout/SacredPageShell";
import PageNavRail from "@/components/layout/PageNavRail";
import CosmicFieldCard from "@/components/layout/CosmicFieldCard";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(future: string | null): number {
  if (!future) return 0;
  return Math.max(0, Math.ceil((new Date(future).getTime() - Date.now()) / 86_400_000));
}

export default function BillingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");
  const { tier, status, trialEndsAt, periodEndsAt, config, isLoading } = useSubscription();
  const trialDaysLeft = status === "trialing" ? daysBetween(trialEndsAt) : 0;

  return (
    <div className="min-h-screen sacred-page">
      <SacredPageShell
        leftRail={<PageNavRail title="Billing" hint="Your plan, usage, and renewal." showChartSwitcher={false} sections={[{ id: "plan", label: "Plan" }, { id: "usage", label: "Usage" }, { id: "status", label: "Status" }]} />}
        rightRail={<CosmicFieldCard />}
        className="space-y-8"
      >
        <div className="space-y-2">
          <h1 className="font-serif text-3xl text-primary">{t("billing.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("billing.subtitle")}</p>
        </div>

        {/* Trial banner */}
        {status === "trialing" && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="py-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="flex-1 text-sm">
                {t("billing.trialBanner", { days: trialDaysLeft, tier: TIERS[tier].sanskrit, date: formatDate(trialEndsAt) })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current plan */}
        <Card id="plan" className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="font-serif text-2xl flex items-center gap-3">
                  {t("billing.currentPlan")} <TierBadge tier={tier} size="md" showDevanagari />
                </CardTitle>
                <p className="text-sm text-muted-foreground italic mt-1">{config.meaning}</p>
              </div>
              <Button onClick={() => navigate("/pricing")} className="gap-2" disabled={isLoading}>
                {tier === "darshana" ? t("billing.upgradeButton") : t("billing.changePlan")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("billing.priceLabel")}</div>
                <div className="text-foreground font-medium">
                  {config.priceMonthlyAud === 0 ? "Free" : `AUD $${config.priceMonthlyAud}/mo`}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("billing.statusLabel")}</div>
                <div className="text-foreground font-medium capitalize">{status}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("billing.renewsLabel")}</div>
                <div className="text-foreground font-medium">{formatDate(periodEndsAt)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("billing.currencyLabel")}</div>
                <div className="text-foreground font-medium">AUD</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card id="usage">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <Calendar className="h-5 w-5 text-primary" />
              {t("billing.usageTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageBar resource="ai_chat" />
            <UsageBar resource="dream" />
            <UsageBar resource="ai_reading" />
            <UsageBar resource="pdf_download" />
          </CardContent>
        </Card>

        {/* Plan benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">{t("billing.whatsIncluded")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {Object.entries(config.features)
                .filter(([, v]) => v)
                .map(([k]) => (
                  <li key={k} className="flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/80 capitalize">{k.replace(/_/g, " ")}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>

        {/* Payment placeholder */}
        <Card className="border-dashed border-border/60">
          <CardContent className="py-6 flex items-center gap-3 text-sm text-muted-foreground">
            <CreditCard className="h-5 w-5" />
            <div>
              {t("billing.paymentPlaceholder")}
              <Badge variant="outline" className="ml-2 text-[10px]">{t("billing.waitlistBadge")}</Badge>
            </div>
          </CardContent>
        </Card>
      </SacredPageShell>
    </div>
  );
}

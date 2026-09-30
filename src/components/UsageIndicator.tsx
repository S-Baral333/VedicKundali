import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";

interface UsageIndicatorProps {
  feature: "dreams" | "oracle";
  label?: string;
  /**
   * Whether this row carries the "Free" tier badge.
   *
   * The badge describes the plan, not the feature, so it is only honest once
   * per surface. A card stacking several meters (the dashboard's Your Plan)
   * shows it in its own header and passes false here; a lone indicator with no
   * such header keeps it, since otherwise nothing names the tier.
   */
  showTierBadge?: boolean;
}

export default function UsageIndicator({ feature, label, showTierBadge = true }: UsageIndicatorProps) {
  const { t } = useTranslation();
  const { tier, usage, limits, isPremium } = useSubscription();

  const count = feature === "dreams" ? usage.dream : usage.ai_chat;
  const limit = limits[feature];

  const featureLabel = label || (feature === "dreams" ? t("pages:ui.usageIndicator.dreams", "Dream Interpretations") : t("pages:ui.usageIndicator.guru", "Guru Questions"));

  // -1 is the unlimited sentinel. Guard it before any arithmetic: dividing by
  // it yields a negative percentage, and `max(-1 - count, 0)` is 0, which would
  // otherwise render as "0 / -1" flagged in red as if the limit were reached.
  if (limit === -1) {
    return (
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Crown className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0">{t("pages:ui.usageIndicator.unlimited", "Unlimited {{feature}}", { feature: featureLabel })}</span>
      </div>
    );
  }

  // 0 means the tier does not include this resource at all.
  if (limit === 0) {
    return (
      <div className="flex items-start justify-between gap-2 text-sm">
        <span className="min-w-0 text-muted-foreground">{featureLabel}</span>
        <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
          {t("pages:ui.usageIndicator.notIncluded", "Not included")}
        </Badge>
      </div>
    );
  }

  const percentage = Math.min((count / limit) * 100, 100);
  const isAtLimit = count >= limit;

  return (
    <div className="space-y-2">
      {/* The right rail leaves this row ~236px, so the label always wraps. Keep
          the count group out of that negotiation: without shrink-0 it gets
          squeezed too and "0 / 3" breaks at its spaces, stacking the limit onto
          a second line. items-start pairs the count with the label's first line
          rather than floating it between two. */}
      <div className="flex items-start justify-between gap-2 text-sm">
        <span className="min-w-0 text-muted-foreground">{t("pages:ui.usageIndicator.thisMonth", "{{feature}} this month", { feature: featureLabel })}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`whitespace-nowrap tabular-nums ${isAtLimit ? "text-destructive font-medium" : "text-foreground"}`}>
            {count} / {limit}
          </span>
          {!isPremium && showTierBadge && (
            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
              {t("pages:ui.usageIndicator.free", "Free")}
            </Badge>
          )}
        </div>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : ""}`}
      />
      {isAtLimit && !isPremium && (
        <p className="text-xs text-destructive">
          {t("pages:ui.usageIndicator.limitReached", "Monthly limit reached. Upgrade to Premium for more.")}
        </p>
      )}
    </div>
  );
}

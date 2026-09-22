import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";

interface UsageIndicatorProps {
  feature: "dreams" | "oracle";
  label?: string;
}

export default function UsageIndicator({ feature, label }: UsageIndicatorProps) {
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Crown className="h-4 w-4 text-primary" />
        <span>{t("pages:ui.usageIndicator.unlimited", "Unlimited {{feature}}", { feature: featureLabel })}</span>
      </div>
    );
  }

  // 0 means the tier does not include this resource at all.
  if (limit === 0) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{featureLabel}</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {t("pages:ui.usageIndicator.notIncluded", "Not included")}
        </Badge>
      </div>
    );
  }

  const percentage = Math.min((count / limit) * 100, 100);
  const isAtLimit = count >= limit;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("pages:ui.usageIndicator.thisMonth", "{{feature}} this month", { feature: featureLabel })}</span>
        <div className="flex items-center gap-2">
          <span className={isAtLimit ? "text-destructive font-medium" : "text-foreground"}>
            {count} / {limit}
          </span>
          {!isPremium && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
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

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface UsageIndicatorProps {
  feature: "dreams" | "oracle";
  label?: string;
}

export default function UsageIndicator({ feature, label }: UsageIndicatorProps) {
  const { tier, usage, limits, isPremium } = useSubscription();

  const count = feature === "dreams" ? usage.dream : usage.ai_chat;
  const limit = limits[feature];
  const percentage = Math.min((count / limit) * 100, 100);
  const remaining = Math.max(limit - count, 0);
  const isAtLimit = remaining === 0;

  const featureLabel = label || (feature === "dreams" ? "Dream Interpretations" : "Guru Questions");

  if (isPremium && limit >= 999) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Crown className="h-4 w-4 text-primary" />
        <span>Unlimited {featureLabel}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{featureLabel} this month</span>
        <div className="flex items-center gap-2">
          <span className={isAtLimit ? "text-destructive font-medium" : "text-foreground"}>
            {count} / {limit}
          </span>
          {!isPremium && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Free
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
          Monthly limit reached. Upgrade to Premium for more.
        </p>
      )}
    </div>
  );
}

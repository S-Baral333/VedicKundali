import { Progress } from "@/components/ui/progress";
import { Infinity as InfinityIcon } from "lucide-react";
import { FEATURE_COPY, type ResourceKey } from "@/lib/tiers";
import { useSubscription } from "@/hooks/useSubscription";

export default function UsageBar({ resource, compact = false }: { resource: ResourceKey; compact?: boolean }) {
  const { usage, config, openUpgrade } = useSubscription();
  const limit = (config.limits as any)[resource] as number;
  const used = (usage as any)[resource] as number;
  const label = FEATURE_COPY[resource].name;

  if (limit === -1) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <InfinityIcon className="h-3.5 w-3.5 text-primary" />
        <span>Unlimited {label}</span>
      </div>
    );
  }

  if (limit === 0) {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <button onClick={() => openUpgrade({ feature: resource })} className="text-primary hover:underline">
          Unlock
        </button>
      </div>
    );
  }

  const pct = Math.min((used / limit) * 100, 100);
  const atLimit = used >= limit;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={atLimit ? "text-destructive font-medium" : "text-foreground"}>
          {used} / {limit}
        </span>
      </div>
      <Progress value={pct} className={`h-1.5 ${atLimit ? "[&>div]:bg-destructive" : ""}`} />
      {atLimit && (
        <button
          onClick={() => openUpgrade({ feature: resource })}
          className="text-[11px] text-primary hover:underline"
        >
          Limit reached — upgrade for more
        </button>
      )}
    </div>
  );
}

import { Sparkles, Crown, Zap } from "lucide-react";
import { TIERS, type Tier } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const ICONS: Record<Tier, typeof Sparkles> = {
  darshana: Sparkles, sadhaka: Sparkles, grihastha: Crown, jyotisha: Zap,
};

const STYLES: Record<Tier, string> = {
  darshana:  "bg-muted/40 text-muted-foreground border-muted-foreground/20",
  sadhaka:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
  grihastha: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  jyotisha:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export default function TierBadge({ tier, size = "md", showDevanagari = false, className }: {
  tier: Tier; size?: "sm" | "md" | "lg"; showDevanagari?: boolean; className?: string;
}) {
  const cfg = TIERS[tier];
  const Icon = ICONS[tier];
  const sizeCls = size === "sm" ? "text-[10px] px-2 py-0.5" : size === "lg" ? "text-sm px-3 py-1.5" : "text-xs px-2.5 py-1";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider", STYLES[tier], sizeCls, className)}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{cfg.sanskrit}</span>
      {showDevanagari && <span className="font-serif opacity-70">{cfg.devanagari}</span>}
    </span>
  );
}

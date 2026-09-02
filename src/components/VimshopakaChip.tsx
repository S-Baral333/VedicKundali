import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface VimshopakaChipProps {
  score: number;
  max?: number;
  vargottamaCount?: number;
  className?: string;
}

/**
 * Vimshopaka Bala — weighted strength across the Shodashavarga (out of 20).
 * Shows a small, premium chip with score / max and an optional vargottama
 * confirmation count. Color tier maps to classical strength bands.
 */
export default function VimshopakaChip({ score, max = 20, vargottamaCount, className }: VimshopakaChipProps) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const tier =
    pct >= 75 ? "elite"
    : pct >= 55 ? "strong"
    : pct >= 35 ? "mixed"
    : "weak";

  const tierClass = {
    elite:  "from-amber-400/25 to-yellow-500/10 border-amber-400/40 text-amber-200",
    strong: "from-emerald-400/25 to-teal-500/10 border-emerald-400/40 text-emerald-200",
    mixed:  "from-primary/20 to-primary/5 border-primary/30 text-primary",
    weak:   "from-muted/30 to-muted/10 border-border text-muted-foreground",
  }[tier];

  const tierLabel = {
    elite:  "Excellent",
    strong: "Strong",
    mixed:  "Mixed",
    weak:   "Weak",
  }[tier];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-gradient-to-r px-2 py-0.5 text-[10px] font-medium",
        tierClass,
        className,
      )}
      title={`Vimshopaka Bala: ${score}/${max} — ${tierLabel}${vargottamaCount ? ` · Vargottama in ${vargottamaCount} of 16 vargas` : ""}`}
    >
      <Sparkles className="h-2.5 w-2.5" />
      <span className="tabular-nums">{score}/{max}</span>
      {vargottamaCount && vargottamaCount >= 3 && (
        <span className="rounded-full bg-foreground/10 px-1 text-[9px]">×{vargottamaCount}</span>
      )}
    </div>
  );
}

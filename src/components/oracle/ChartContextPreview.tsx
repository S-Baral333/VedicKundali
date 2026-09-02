import { useActiveChart } from "@/hooks/useActiveChart";
import { Sparkles } from "lucide-react";

export default function ChartContextPreview({ godMode = false }: { godMode?: boolean }) {
  const { activeChart } = useActiveChart();
  if (!activeChart) return null;
  const cd: any = activeChart.chart_data || {};
  const firstName = activeChart.full_name?.trim().split(/\s+/)[0] || "Seeker";
  const lagna = cd?.ascendant?.sign;
  const moon = cd?.moon_sign;
  const dasha = cd?.dasha?.maha_dasha;

  const parts = [
    lagna && `${lagna} ascendant`,
    moon && `${moon} moon`,
    dasha && `${dasha} dasha`,
  ].filter(Boolean);

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] border ${
        godMode
          ? "border-primary/40 bg-primary/5 text-foreground/90"
          : "border-border/60 bg-card/50 text-muted-foreground"
      }`}
    >
      <Sparkles className={`h-3 w-3 shrink-0 ${godMode ? "text-primary" : "text-primary/70"}`} />
      <span className="truncate">
        Reading for <span className="font-medium text-foreground">{firstName}</span>
        {parts.length > 0 && <span className="text-muted-foreground"> · {parts.join(" · ")}</span>}
      </span>
    </div>
  );
}

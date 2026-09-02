import { Flame } from "lucide-react";
import { useRishiGuru } from "@/hooks/useRishiGuru";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  size?: "sm" | "md";
  tooltip?: string;
  className?: string;
}

const RishiGuruBadge = ({ size = "sm", tooltip, className = "" }: Props) => {
  const { enabled } = useRishiGuru();
  if (!enabled) return null;

  const padding = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const text = size === "md" ? "text-[11px]" : "text-[10px]";
  const icon = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  const chip = (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 ${padding} ${text} font-mono uppercase tracking-wider text-primary ${className}`}
    >
      <Flame className={icon} />
      Rishi Guru
    </span>
  );

  if (!tooltip) return chip;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RishiGuruBadge;

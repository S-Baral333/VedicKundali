import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PillTabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  badge?: number | string;
}

interface PillTabsProps {
  items: PillTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export default function PillTabs({ items, value, onValueChange, className }: PillTabsProps) {
  return (
    <div className={cn("flex overflow-x-auto scrollbar-hide gap-1.5 p-1.5 rounded-full glass-card", className)}>
      {items.map((item) => {
        const isActive = value === item.value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            onClick={() => onValueChange(item.value)}
            disabled={item.disabled}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 disabled:opacity-50",
              isActive
                ? "bg-background/80 text-primary border border-primary/60 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {item.label}
            {item.badge != null && (
              <span className="inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-primary/20 text-primary text-[10px] font-bold px-1">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

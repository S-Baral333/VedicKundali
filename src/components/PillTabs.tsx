import { useEffect, useRef, type LucideIcon } from "react";
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
  const rowRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // When the row scrolls (narrow screens), keep the selected pill in view.
  useEffect(() => {
    const row = rowRef.current;
    const btn = activeRef.current;
    if (!row || !btn) return;
    if (row.scrollWidth <= row.clientWidth) return; // nothing to scroll
    const rowBox = row.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    if (btnBox.left < rowBox.left || btnBox.right > rowBox.right) {
      btn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [value]);

  return (
    <div
      ref={rowRef}
      className={cn(
        "flex items-center overflow-x-auto scrollbar-hide gap-1.5 p-1.5 rounded-full glass-card",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = value === item.value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            ref={isActive ? activeRef : undefined}
            onClick={() => onValueChange(item.value)}
            disabled={item.disabled}
            className={cn(
              // shrink-0 is load-bearing: without it flex compresses every pill to
              // fit, squeezing the labels against their padding and leaving the row
              // visibly uneven, instead of letting it scroll as overflow-x intends.
              "shrink-0 flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 disabled:opacity-50",
              isActive
                ? "bg-background/80 text-primary border border-primary/60 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent",
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
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

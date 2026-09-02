import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Star, Plus, Settings, Check, Sparkles } from "lucide-react";
import { useActiveChart } from "@/hooks/useActiveChart";
import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ChartSwitcher() {
  const { charts, activeChart, isLoading, setActiveChart } = useActiveChart();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isLoading) return null;

  // Empty state — encourage chart creation (visible on mobile as compact icon, expanded on desktop)
  if (charts.length === 0) {
    return (
      <Link
        to="/chart"
        className="flex items-center gap-1.5 h-9 rounded-full border transition-all duration-300 hover:bg-[hsl(var(--gold)/0.15)]"
        style={{
          borderColor: "hsl(var(--glass-border-soft))",
          color: "hsl(var(--gold-light))",
          fontSize: "12px",
          letterSpacing: "0.04em",
          paddingLeft: isMobile ? "10px" : "12px",
          paddingRight: isMobile ? "10px" : "12px",
        }}
        aria-label="Create your birth chart"
        title="Create your birth chart"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        {!isMobile && <span>Create chart</span>}
      </Link>
    );
  }

  const labelName = activeChart?.full_name || "Select chart";
  // Mobile compact: only icon + first name first letter
  const compact = isMobile;

  // Show the active person's first name on the trigger pill (no star).
  const firstName = labelName.trim().split(/\s+/)[0] || labelName;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 h-9 rounded-full border transition-all duration-300 hover:bg-[hsl(var(--gold)/0.15)] hover:border-[hsl(var(--gold)/0.32)] max-w-[200px]"
          style={{
            borderColor: "hsl(var(--gold) / 0.22)",
            color: "hsl(var(--gold-light))",
            fontSize: "12px",
            letterSpacing: "0.04em",
            paddingLeft: "12px",
            paddingRight: "10px",
            background: "hsl(var(--gold) / 0.04)",
          }}
          aria-label={`Active chart: ${labelName}. Tap to switch.`}
          title={`Reading as ${labelName}`}
        >
          <span
            className="truncate"
            style={{
              color: "hsl(var(--gold-light))",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500,
              fontSize: "13px",
              letterSpacing: "0.01em",
              maxWidth: "150px",
            }}
          >
            {firstName}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 border"
        style={{
          background: "hsl(var(--ink-2))",
          borderColor: "hsl(var(--glass-border))",
          color: "hsl(var(--text-primary))",
        }}
      >
        <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest" style={{ color: "hsl(var(--text-muted))" }}>
          Reading as
        </div>
        {charts.map((c) => {
          const isActive = c.id === activeChart?.id;
          return (
            <DropdownMenuItem
              key={c.id}
              onClick={() => setActiveChart(c.id)}
              className="flex items-center gap-2 cursor-pointer focus:bg-[hsl(var(--gold)/0.1)]"
              style={{ color: isActive ? "hsl(var(--gold-light))" : "hsl(var(--text-secondary))" }}
            >
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {isActive ? (
                  <Check className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold))" }} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--text-muted))" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm">{c.full_name}</p>
                <p className="truncate text-[10px]" style={{ color: "hsl(var(--text-muted))" }}>
                  {c.birthplace} · {c.date_of_birth}
                </p>
              </div>
              {c.is_primary && (
                <Star className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--gold))", fill: "hsl(var(--gold))" }} />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator style={{ background: "hsl(var(--glass-border))" }} />
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-[hsl(var(--gold)/0.1)]">
          <Link to="/chart" className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-sm">Add new chart</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-[hsl(var(--gold)/0.1)]">
          <Link to="/chart" className="flex items-center gap-2">
            <Settings className="h-3.5 w-3.5" />
            <span className="text-sm">Manage charts</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

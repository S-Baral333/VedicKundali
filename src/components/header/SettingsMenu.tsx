import { Link } from "react-router-dom";
import { Settings, Download, Star, Plus, Keyboard, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActiveChart } from "@/hooks/useActiveChart";

interface SettingsMenuProps {
  isStandalone: boolean;
}

export default function SettingsMenu({ isStandalone }: SettingsMenuProps) {
  const { charts, activeChart, setActiveChart } = useActiveChart();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 hover:bg-[hsl(var(--gold)/0.12)] hover:border-[hsl(var(--gold)/0.30)]"
          style={{
            borderColor: "hsl(var(--glass-border-soft))",
            color: "hsl(var(--text-secondary))",
          }}
          aria-label="Settings"
        >
          <Settings className="h-[15px] w-[15px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-72 glass-stone p-2"
        style={{ borderColor: "hsl(var(--gold) / 0.20)" }}
      >
        {charts.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest px-2" style={{ color: "hsl(var(--text-muted))" }}>
              Reading As
            </DropdownMenuLabel>
            {charts.slice(0, 4).map((c) => {
              const active = c.id === activeChart?.id;
              return (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => setActiveChart(c.id)}
                  className="cursor-pointer focus:bg-[hsl(var(--gold)/0.10)] rounded-lg flex items-center gap-2 py-2"
                >
                  <div className="w-4 flex items-center justify-center shrink-0">
                    {active ? (
                      <Check className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold))" }} />
                    ) : (
                      <span className="w-1 h-1 rounded-full" style={{ background: "hsl(var(--text-muted))" }} />
                    )}
                  </div>
                  <span className="text-sm flex-1 truncate" style={{ color: active ? "hsl(var(--gold-light))" : "hsl(var(--text-primary))" }}>
                    {c.full_name}
                  </span>
                  {c.is_primary && <Star className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--gold))", fill: "hsl(var(--gold))" }} />}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuItem asChild className="cursor-pointer focus:bg-[hsl(var(--gold)/0.10)] rounded-lg">
              <Link to="/chart" className="flex items-center gap-2 py-2">
                <div className="w-4 flex items-center justify-center shrink-0">
                  <Plus className="h-3.5 w-3.5" style={{ color: "hsl(var(--text-muted))" }} />
                </div>
                <span className="text-sm" style={{ color: "hsl(var(--text-secondary))" }}>Add or manage charts</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator style={{ background: "hsl(var(--gold) / 0.10)" }} />
          </>
        )}

        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest px-2" style={{ color: "hsl(var(--text-muted))" }}>
          App
        </DropdownMenuLabel>

        {!isStandalone && (
          <DropdownMenuItem asChild className="cursor-pointer focus:bg-[hsl(var(--gold)/0.10)] rounded-lg">
            <Link to="/install" className="flex items-center gap-2 py-2">
              <Download className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold-light))" }} />
              <span className="text-sm" style={{ color: "hsl(var(--text-primary))" }}>Install app</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem className="cursor-default focus:bg-transparent rounded-lg flex flex-col items-start gap-1 py-2">
          <div className="flex items-center gap-2">
            <Keyboard className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold-light))" }} />
            <span className="text-sm" style={{ color: "hsl(var(--text-primary))" }}>Keyboard shortcuts</span>
          </div>
          <p className="text-[10px] pl-5.5" style={{ color: "hsl(var(--text-muted))", paddingLeft: "22px" }}>
            Alt + 1–9 to jump between sections
          </p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

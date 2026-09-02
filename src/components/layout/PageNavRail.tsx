import { useEffect, useState } from "react";
import ChartSwitcher from "@/components/ChartSwitcher";

export interface PageNavSection {
  id: string;
  label: string;
}

interface PageNavRailProps {
  title: string;
  sections?: PageNavSection[];
  showChartSwitcher?: boolean;
  hint?: string;
  extras?: React.ReactNode;
}

export default function PageNavRail({
  title,
  sections = [],
  showChartSwitcher = true,
  hint,
  extras,
}: PageNavRailProps) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (sections.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);

  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="rail-card">
        <div className="rail-card-title">Page</div>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "22px",
            fontWeight: 400,
            color: "hsl(var(--gold-light))",
            letterSpacing: "0.01em",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h2>
        {hint && (
          <p className="mt-1.5 text-[12px]" style={{ color: "hsl(var(--text-muted))", lineHeight: 1.5 }}>
            {hint}
          </p>
        )}
      </div>

      {showChartSwitcher && (
        <div className="rail-card">
          <div className="rail-card-title">Reading As</div>
          <ChartSwitcher />
        </div>
      )}

      {sections.length > 0 && (
        <div className="rail-card">
          <div className="rail-card-title">On This Page</div>
          <div className="flex flex-col gap-1">
            {sections.map((s) => {
              const isActive = active === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-[12.5px] py-1.5 px-2 rounded-md transition-all duration-200 flex items-center gap-2"
                  style={{
                    color: isActive ? "hsl(var(--gold-light))" : "hsl(var(--text-secondary))",
                    background: isActive ? "hsl(var(--gold) / 0.08)" : "transparent",
                  }}
                >
                  <span
                    style={{
                      width: isActive ? 18 : 12,
                      height: 1,
                      background: isActive ? "hsl(var(--gold))" : "hsl(var(--gold) / 0.3)",
                      transition: "all 200ms",
                      flexShrink: 0,
                    }}
                  />
                  {s.label}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {extras}
    </div>
  );
}

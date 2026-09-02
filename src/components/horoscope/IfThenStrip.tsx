import { GitBranch } from "lucide-react";

interface IfThen { when?: string; if?: string; then?: string; }

export default function IfThenStrip({ items }: { items?: IfThen[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold))" }} />
        <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "hsl(var(--text-muted))" }}>
          Today's Choreography
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.slice(0, 3).map((it, i) => (
          <div
            key={i}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid hsl(var(--gold) / 0.14)" }}
          >
            {it.when && (
              <span className="inline-block px-2 py-0.5 rounded-full text-[9px] tracking-[0.16em] uppercase mb-2"
                style={{ background: "hsl(var(--gold) / 0.10)", color: "hsl(var(--gold))" }}>
                {it.when}
              </span>
            )}
            {it.if && (
              <p className="text-[12px] leading-snug mb-1.5" style={{ color: "hsl(var(--text-muted))", fontFamily: "'Jost', sans-serif" }}>
                <span className="uppercase tracking-wider text-[9px] mr-1.5" style={{ color: "hsl(var(--gold))" }}>If</span>
                {it.if}
              </p>
            )}
            {it.then && (
              <p className="text-[13.5px] leading-snug" style={{ color: "hsl(var(--text-primary))", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                <span className="uppercase tracking-wider text-[9px] not-italic mr-1.5" style={{ color: "hsl(var(--gold))", fontFamily: "'Jost', sans-serif" }}>Then</span>
                {it.then}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

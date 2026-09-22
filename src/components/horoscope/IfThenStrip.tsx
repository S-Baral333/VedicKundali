import { useTranslation } from "react-i18next";
import { GitBranch } from "lucide-react";

interface IfThen { when?: string; if?: string; then?: string; }

export default function IfThenStrip({ items }: { items?: IfThen[] }) {
  const { t } = useTranslation();
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold))" }} />
        <span className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "hsl(var(--text-muted))" }}>
          {t("pages:ui.ifThenStrip.todaysChoreography", "Today's Choreography")}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 m-flat-list">
        {items.slice(0, 3).map((it, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 m-flat"
            style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid hsl(var(--gold) / 0.14)" }}
          >
            {it.when && (
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] tracking-[0.16em] uppercase mb-2"
                style={{ background: "hsl(var(--gold) / 0.10)", color: "hsl(var(--gold))" }}>
                {it.when}
              </span>
            )}
            {it.if && (
              <p className="text-[12px] leading-snug mb-1.5" style={{ color: "hsl(var(--text-muted))", fontFamily: "'Jost', sans-serif" }}>
                <span className="uppercase tracking-wider text-[11px] mr-1.5" style={{ color: "hsl(var(--gold))" }}>{t("pages:ui.ifThenStrip.if", "If")}</span>
                {it.if}
              </p>
            )}
            {it.then && (
              <p className="text-[13.5px] leading-snug" style={{ color: "hsl(var(--text-primary))", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                <span className="uppercase tracking-wider text-[11px] not-italic mr-1.5" style={{ color: "hsl(var(--gold))", fontFamily: "'Jost', sans-serif" }}>{t("pages:ui.ifThenStrip.then", "Then")}</span>
                {it.then}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

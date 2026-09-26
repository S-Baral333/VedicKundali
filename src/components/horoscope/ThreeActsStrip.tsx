import { useTranslation } from "react-i18next";
import { Sun, Cloud, Moon } from "lucide-react";
import AstroText from "@/components/AstroText";

interface Acts {
  morning?: string;
  afternoon?: string;
  evening?: string;
}

const ACTS: { key: keyof Acts; label: string; Icon: typeof Sun; tint: string }[] = [
  { key: "morning",   label: "Morning",   Icon: Sun,   tint: "rgba(255,196,87,0.06)" },
  { key: "afternoon", label: "Afternoon", Icon: Cloud, tint: "rgba(255,255,255,0.025)" },
  { key: "evening",   label: "Evening",   Icon: Moon,  tint: "rgba(120,140,200,0.06)" },
];

/**
 * @param dropCap Let the first act open the reading with a drop cap. The page
 *   passes this only when no guidance blob precedes the acts, so a reading
 *   never carries two.
 */
export default function ThreeActsStrip({ acts, dropCap }: { acts?: Acts; dropCap?: boolean }) {
  const { t } = useTranslation();
  if (!acts) return null;
  const filled = ACTS.filter(({ key }) => !!acts[key]);
  if (filled.length === 0) return null;
  return (
    <div
      className="grid gap-3 grid-cols-1 sm:[grid-template-columns:var(--cols)] m-flat-list"
      style={{ ["--cols" as any]: `repeat(${filled.length}, minmax(0, 1fr))` }}
    >
      {filled.map(({ key, label, Icon, tint }, i) => {
        const txt = acts[key]!;
        return (
          <div
            key={key}
            className="rounded-2xl p-4 transition-transform hover:-translate-y-[1px] m-flat"
            style={{ background: tint, border: "0.5px solid hsl(var(--gold) / 0.14)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold))" }} />
              <span className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "hsl(var(--text-muted))" }}>{t("pages:ui.threeActsStrip." + key, label)}</span>
            </div>
            <p className={`text-[14px] leading-[1.65]${dropCap && i === 0 ? " m-dropcap" : ""}`} style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}>
              <AstroText text={txt} />
            </p>
          </div>
        );
      })}
    </div>
  );
}

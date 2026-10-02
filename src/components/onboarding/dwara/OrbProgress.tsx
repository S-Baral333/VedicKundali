import { useTranslation } from "react-i18next";

const SIZE = 44;
const C = SIZE / 2;
const ORBIT = 15;

/**
 * Progress as a small solar system: one body per world, orbiting a core, each
 * igniting as its world opens. Replaces the "step 2 of 4" dots — the person
 * should feel another layer of the portal opening, not a form filling in.
 */
export default function OrbProgress({ lit, total = 5 }: { lit: number; total?: number }) {
  const { t } = useTranslation();
  return (
    <svg
      className="dw-orbs"
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={t("onboarding:dwara.progress", { n: lit, total })}
    >
      <circle cx={C} cy={C} r={ORBIT} fill="none" stroke="hsl(var(--dw-gold) / 0.22)" strokeWidth="0.8" />
      <circle
        cx={C}
        cy={C}
        r={1.6 + lit * 0.45}
        className="dw-orb-core"
        style={{ opacity: 0.3 + lit * 0.13 }}
      />
      <g className="dw-orbit">
        {Array.from({ length: total }).map((_, i) => {
          const a = -Math.PI / 2 + (i / total) * Math.PI * 2;
          const on = i < lit;
          return (
            <circle
              key={i}
              cx={C + Math.cos(a) * ORBIT}
              cy={C + Math.sin(a) * ORBIT}
              r={on ? 2.7 : 2}
              className={on ? "dw-orb dw-orb-on" : "dw-orb"}
            />
          );
        })}
      </g>
    </svg>
  );
}

import { ReactNode } from "react";

interface SacredPageShellProps {
  leftRail?: ReactNode;
  rightRail?: ReactNode;
  children: ReactNode;
  /** Vertical padding override (default: py-8 md:py-12) */
  py?: string;
  /** Extra classes on the outer wrapper */
  className?: string;
}

/**
 * Sacred Wide editorial shell — universal page wrapper that replaces
 * `container mx-auto max-w-Xxl`. Provides a 3-rail grid (240 / fluid / 320)
 * that gracefully collapses on tablet (1 rail) and mobile (no rails).
 */
export default function SacredPageShell({
  leftRail,
  rightRail,
  children,
  py = "py-8 md:py-12",
  className = "",
}: SacredPageShellProps) {
  let gridClass = "sacred-grid";
  if (!leftRail && !rightRail) gridClass = "";
  else if (!leftRail) gridClass = "sacred-grid-no-left";
  else if (!rightRail) gridClass = "sacred-grid-no-right";

  return (
    <div className={`sacred-wide ${py} relative ${className}`}>
      <div className={gridClass}>
        {leftRail && <aside className="sacred-rail sacred-rail-left">{leftRail}</aside>}
        <main className="sacred-prose">{children}</main>
        {rightRail && <aside className="sacred-rail sacred-rail-right">{rightRail}</aside>}
      </div>
    </div>
  );
}

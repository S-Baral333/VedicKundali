import { forwardRef } from "react";
// Wheel-only mandala for inline brand-mark use (header/nav/footer).
// The full lockup (with wordmark + tagline) lives at /favicon.svg and
// the PWA icons under public/icons/* — used wherever the mark stands alone.
import logoUrl from "@/assets/kundali-mark.svg";

interface KundaliMarkProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

// Native aspect of the wheel-only SVG (viewBox 680x760)
const ASPECT = 680 / 760;

/**
 * Brand mandala mark — sacred wheel with full Sanskrit inscription.
 * Replaces all 🔱/🕉️ brand-emoji uses across the app.
 * `size` = display height in px. Width is derived from the native aspect so
 *   the wheel never squashes when callers pass an arbitrary size.
 * `glow` adds a soft gold halo for hero / login / cover surfaces.
 */
const KundaliMark = forwardRef<HTMLImageElement, KundaliMarkProps>(
  ({ size = 28, glow = false, className = "" }, ref) => {
    const height = size;
    const width = Math.round(size * ASPECT);
    return (
      <img
        ref={ref}
        src={logoUrl}
        alt="Kundali"
        width={width}
        height={height}
        className={className}
        style={{
          display: "inline-block",
          flexShrink: 0,
          filter: glow
            ? "drop-shadow(0 0 14px hsl(var(--gold) / 0.45)) drop-shadow(0 0 4px hsl(var(--gold) / 0.55))"
            : "drop-shadow(0 0 6px hsl(var(--gold) / 0.25))",
        }}
      />
    );
  }
);

KundaliMark.displayName = "KundaliMark";

export default KundaliMark;

import { useMemo, type ElementType, type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type TwinkleIntensity = "subtle" | "aura" | "star";

interface TwinkleTextProps {
  children: ReactNode;
  intensity?: TwinkleIntensity;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

const INTENSITY_CLASS: Record<TwinkleIntensity, string> = {
  subtle: "twinkle-subtle",
  aura: "twinkle-aura",
  star: "twinkle-star",
};

const INTENSITY_DELAY_RANGE: Record<TwinkleIntensity, number> = {
  subtle: 6,
  aura: 4,
  star: 3,
};

/**
 * TwinkleText — adds an organic, star-like luminance to text.
 * Each instance receives a randomized animation-delay so multiple twinkles
 * never pulse in lockstep, mirroring the night sky.
 *
 * Respects prefers-reduced-motion (handled in CSS).
 */
export default function TwinkleText({
  children,
  intensity = "subtle",
  as: Tag = "span",
  className,
  style,
}: TwinkleTextProps) {
  const delay = useMemo(
    () => `-${(Math.random() * INTENSITY_DELAY_RANGE[intensity]).toFixed(2)}s`,
    [intensity]
  );

  return (
    <Tag
      className={cn(INTENSITY_CLASS[intensity], className)}
      style={{ animationDelay: delay, ...style }}
    >
      {children}
    </Tag>
  );
}

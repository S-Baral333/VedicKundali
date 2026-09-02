import { useMemo } from "react";
import guruAsset from "@/assets/guru-lotus-mudra.png.asset.json";

type Intensity = "idle" | "focused" | "consulting";

interface Props {
  intensity?: Intensity;
  size?: number;
}

/**
 * Sacred Rishi portrait with breathing aura, slow-rotating geometry ring,
 * and optional orbiting particles when the input is engaged.
 * Pure CSS — no canvas, no three.js, cheap on low-tier devices.
 */
export default function GuruPortrait({ intensity = "idle", size = 220 }: Props) {
  const auraOpacity = intensity === "consulting" ? 0.95 : intensity === "focused" ? 0.75 : 0.5;
  const haloScale   = intensity === "consulting" ? 1.18 : intensity === "focused" ? 1.10 : 1.0;
  const showParticles = intensity !== "idle";

  const particles = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      delay: i * 1.3,
      duration: 7 + (i % 3),
      offset: (360 / 6) * i,
    })),
    []
  );

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width: size, height: size }}
    >
      {/* Outer breathing halo */}
      <div
        className="absolute inset-[-22%] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.32) 0%, hsl(var(--primary) / 0.10) 40%, transparent 70%)",
          opacity: auraOpacity,
          transform: `scale(${haloScale})`,
          transition: "opacity 1.2s ease, transform 1.6s ease",
          animation: "guru-breathing 6s ease-in-out infinite",
        }}
      />

      {/* Slow rotating sacred-geometry ring (SVG mandala stroke) */}
      <svg
        className="absolute inset-[-12%] pointer-events-none"
        viewBox="0 0 200 200"
        style={{ animation: "rotate-slow 60s linear infinite", opacity: 0.35 }}
      >
        <circle cx="100" cy="100" r="92" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.4" strokeDasharray="2 4" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeDasharray="1 3" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x = 100 + Math.cos(angle) * 92;
          const y = 100 + Math.sin(angle) * 92;
          return <circle key={i} cx={x} cy={y} r="1.2" fill="hsl(var(--primary))" opacity="0.7" />;
        })}
      </svg>

      {/* Counter-rotating inner ring */}
      <svg
        className="absolute inset-[2%] pointer-events-none"
        viewBox="0 0 200 200"
        style={{ animation: "rotate-slow 90s linear infinite reverse", opacity: 0.25 }}
      >
        <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3" />
      </svg>

      {/* Orbiting particle sparkles */}
      {showParticles && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                background: "hsl(var(--primary))",
                boxShadow: "0 0 8px hsl(var(--primary) / 0.9)",
                marginLeft: -3,
                marginTop: -3,
                animation: `guru-orbit ${p.duration}s linear infinite`,
                animationDelay: `${p.delay}s`,
                transform: `rotate(${p.offset}deg) translateX(${size * 0.55}px)`,
              }}
            />
          ))}
        </div>
      )}

      {/* The portrait itself — masked into a soft circle */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          boxShadow:
            "inset 0 0 30px hsl(var(--primary) / 0.25), 0 0 40px hsl(var(--primary) / 0.18)",
          border: "1px solid hsl(var(--primary) / 0.35)",
        }}
      >
        <img
          src={guruAsset.url}
          alt="Rishi Guru in deep meditation"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover"
          style={{
            objectPosition: "center 18%",
            filter:
              intensity === "consulting"
                ? "brightness(1.06) saturate(1.05)"
                : intensity === "focused"
                ? "brightness(1.03)"
                : "brightness(0.96)",
            transition: "filter 1.2s ease",
          }}
        />
        {/* Soft inner vignette for sacred mood */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, transparent 50%, hsl(var(--background) / 0.55) 100%)",
          }}
        />
      </div>
    </div>
  );
}

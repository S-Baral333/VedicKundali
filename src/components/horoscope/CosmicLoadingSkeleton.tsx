import { useEffect, useState } from "react";

type Period = "daily" | "tomorrow" | "weekly" | "monthly" | "yearly";

// Approximate wait times per period (seconds) — used to pace phase messages.
const PERIOD_WAIT_SECONDS: Record<Period, number> = {
  daily: 8,
  tomorrow: 10,
  weekly: 20,
  monthly: 35,
  yearly: 55,
};

const MESSAGES: Record<Period, string[]> = {
  daily: [
    "Consulting today's stars…",
    "Reading the cosmic alignment…",
    "Weaving your guidance…",
    "Almost ready…",
  ],
  tomorrow: [
    "Gazing into tomorrow's sky…",
    "Mapping tomorrow's planetary paths…",
    "Composing what awaits…",
    "Finalising your tomorrow…",
  ],
  weekly: [
    "Charting the week ahead…",
    "Tracing seven days of planetary motion…",
    "Weighing each day's energy…",
    "Nearly there — weekly arcs take a moment…",
  ],
  monthly: [
    "Mapping the month's celestial movements…",
    "Reading major ingresses and dasha shifts…",
    "Thirty days of karma, unfolding…",
    "The cosmos does not rush — almost there…",
  ],
  yearly: [
    "Entering deep meditation for your year ahead…",
    "Three hundred and sixty-five days of dharma, mapped…",
    "This is a long reading — the stars require time…",
    "Almost there — your year unfolds across the heavens…",
  ],
};

interface Props {
  period: Period;
}

export default function CosmicLoadingSkeleton({ period }: Props) {
  const [elapsed, setElapsed] = useState(0);

  const expectedWait = PERIOD_WAIT_SECONDS[period];
  const messages = MESSAGES[period];

  useEffect(() => {
    setElapsed(0);
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [period]);

  const ratio = elapsed / expectedWait;
  const phase = ratio >= 0.75 ? 3 : ratio >= 0.45 ? 2 : ratio >= 0.2 ? 1 : 0;
  const messageIndex = Math.min(phase, messages.length - 1);
  const progressPct = Math.min(100, (elapsed / expectedWait) * 100);

  const shimmerLines = [
    { w: "45%", h: 20 },
    { w: "100%", h: 14 },
    { w: "100%", h: 14 },
    { w: "88%", h: 14 },
    { w: "100%", h: 14 },
    { w: "72%", h: 14 },
  ];

  return (
    <div className="w-full sacred-reveal" style={{ animationDelay: "0.05s" }}>
      {/* Guru meditation indicator */}
      <div className="flex flex-col items-center gap-4 mb-7 text-center">
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: "1px solid hsl(var(--gold) / 0.22)",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "2rem",
            color: "hsl(var(--gold) / 0.7)",
            animation: "cosmicLoaderPulse 2.8s ease-in-out infinite",
          }}
          aria-hidden
        >
          <span
            className="absolute"
            style={{
              inset: -10,
              borderRadius: "50%",
              border: "1px solid hsl(var(--gold) / 0.1)",
              animation: "cosmicLoaderPulse 2.8s ease-in-out infinite 0.4s",
            }}
          />
          ॐ
        </div>

        <div
          key={messageIndex}
          className="cosmic-loader-fade"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontSize: "0.95rem",
            color: "hsl(var(--text-secondary))",
            letterSpacing: "0.04em",
            minHeight: "1.4rem",
          }}
        >
          {messages[messageIndex]}
        </div>

        <div className="w-full" style={{ maxWidth: 320 }}>
          <div
            style={{
              height: 2,
              background: "hsl(var(--gold) / 0.08)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background:
                  "linear-gradient(90deg, hsl(var(--gold) / 0.3), hsl(var(--gold) / 0.85))",
                borderRadius: 2,
                transition: "width 0.9s ease",
              }}
            />
          </div>
          {phase >= 2 && (
            <p
              className="cosmic-loader-fade mt-2 italic"
              style={{
                fontSize: "0.7rem",
                color: "hsl(var(--text-muted))",
                fontFamily: "'Jost', sans-serif",
              }}
            >
              {period === "yearly" || period === "monthly"
                ? "Longer readings are generated fresh and may take up to a minute."
                : "Composing your personalised reading — almost there."}
            </p>
          )}
        </div>
      </div>

      {/* Sacred manuscript shimmer card */}
      <div
        className="relative overflow-hidden horo-glass-card"
        style={{ borderRadius: 20 }}
      >
        {/* Corner ornaments */}
        {[
          { top: 10, left: 10, borderTop: 1, borderLeft: 1 },
          { top: 10, right: 10, borderTop: 1, borderRight: 1 },
          { bottom: 10, left: 10, borderBottom: 1, borderLeft: 1 },
          { bottom: 10, right: 10, borderBottom: 1, borderRight: 1 },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              width: 16,
              height: 16,
              top: c.top,
              left: c.left,
              right: c.right,
              bottom: c.bottom,
              borderTop: c.borderTop ? "1px solid hsl(var(--gold) / 0.25)" : undefined,
              borderLeft: c.borderLeft ? "1px solid hsl(var(--gold) / 0.25)" : undefined,
              borderRight: c.borderRight ? "1px solid hsl(var(--gold) / 0.25)" : undefined,
              borderBottom: c.borderBottom ? "1px solid hsl(var(--gold) / 0.25)" : undefined,
            }}
          />
        ))}

        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent 35%, hsl(var(--gold) / 0.05) 50%, transparent 65%)",
            animation: "cosmicLoaderSweep 2.4s ease-in-out infinite",
          }}
          aria-hidden
        />

        {/* Title shimmer */}
        <div
          style={{
            height: 18,
            width: "55%",
            margin: "0 auto 1.25rem",
            borderRadius: 6,
            background: "hsl(var(--gold) / 0.08)",
            animation: "cosmicLoaderFade 1.8s ease-in-out infinite",
          }}
        />

        {/* Divider ornament */}
        <div className="flex items-center gap-2 mb-5 opacity-30">
          <div className="flex-1" style={{ height: 1, background: "hsl(var(--gold) / 0.4)" }} />
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "hsl(var(--gold) / 0.5)" }} />
          <div className="flex-1" style={{ height: 1, background: "hsl(var(--gold) / 0.4)" }} />
        </div>

        {/* Text line shimmers */}
        <div className="flex flex-col gap-2.5">
          {shimmerLines.map((line, i) => (
            <div
              key={i}
              style={{
                height: line.h,
                width: line.w,
                borderRadius: 4,
                background: "hsl(var(--text-secondary) / 0.06)",
                animation: "cosmicLoaderFade 1.8s ease-in-out infinite",
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>

        {/* Planet chips shimmer row */}
        <div className="flex flex-wrap gap-2 mt-6">
          {[80, 65, 90, 70].map((w, i) => (
            <div
              key={i}
              style={{
                height: 26,
                width: w,
                borderRadius: 13,
                background: "hsl(var(--gold) / 0.07)",
                animation: "cosmicLoaderFade 1.8s ease-in-out infinite",
                animationDelay: `${0.7 + i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes cosmicLoaderPulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--gold) / 0); opacity: 0.65; }
          50%      { box-shadow: 0 0 26px 6px hsl(var(--gold) / 0.12); opacity: 1; }
        }
        @keyframes cosmicLoaderSweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes cosmicLoaderFade {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        .cosmic-loader-fade { animation: cosmicLoaderFadeIn 0.5s ease; }
        @keyframes cosmicLoaderFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cosmic-loader-fade { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

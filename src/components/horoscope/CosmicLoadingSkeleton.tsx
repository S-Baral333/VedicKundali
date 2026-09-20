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

  // The estimate is only a guess, so the bar must never sit at a full 100%
  // while the reading is still being generated — that reads as "stuck". It
  // fills to 90% over the expected wait, then hands over to an indeterminate
  // sweep that keeps moving for as long as the request actually takes.
  const overrunning = elapsed >= expectedWait;
  const progressPct = Math.min(90, ratio * 90);

  // Long readings are genuinely slow, so set the expectation immediately
  // rather than waiting until the user is already wondering if it broke.
  const isLongPeriod = period === "weekly" || period === "monthly" || period === "yearly";
  const helperText = overrunning
    ? "Still composing — this one is taking a little longer than usual."
    : isLongPeriod
      ? `${period === "yearly" ? "Yearly" : period === "monthly" ? "Monthly" : "Weekly"} readings are generated fresh and take around ${expectedWait} seconds.`
      : "Composing your personalised reading…";

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
      <div className="flex flex-col items-center gap-3 sm:gap-4 mb-5 sm:mb-7 text-center">
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{
            width: 60,
            height: 60,
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
            role="progressbar"
            aria-label="Generating your reading"
            aria-valuetext={overrunning ? "Still generating" : `About ${Math.round(progressPct)}% complete`}
            style={{
              height: 4,
              background: "hsl(var(--gold) / 0.16)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {overrunning ? (
              // Indeterminate: a sweep that never implies a finish line.
              <div
                className="cosmic-loader-indeterminate"
                style={{
                  height: "100%",
                  width: "40%",
                  background:
                    "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.85), transparent)",
                  borderRadius: 4,
                }}
              />
            ) : (
              <div
                className="cosmic-loader-sheen"
                style={{
                  position: "relative",
                  height: "100%",
                  width: `${progressPct}%`,
                  background:
                    "linear-gradient(90deg, hsl(var(--gold) / 0.45), hsl(var(--gold) / 0.9))",
                  borderRadius: 4,
                  transition: "width 0.9s ease",
                  overflow: "hidden",
                }}
              />
            )}
          </div>
          <p
            key={helperText}
            className="cosmic-loader-fade mt-2.5 italic"
            style={{
              fontSize: "0.72rem",
              lineHeight: 1.5,
              color: "hsl(var(--text-muted))",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {helperText}
          </p>
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
        /* Travelling highlight so a slow-filling bar still reads as alive */
        .cosmic-loader-sheen::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.35), transparent);
          animation: cosmicLoaderSheen 1.6s ease-in-out infinite;
        }
        @keyframes cosmicLoaderSheen {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .cosmic-loader-indeterminate {
          animation: cosmicLoaderIndeterminate 1.5s ease-in-out infinite;
        }
        @keyframes cosmicLoaderIndeterminate {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cosmic-loader-fade,
          .cosmic-loader-sheen::after { animation: none !important; }
          .cosmic-loader-indeterminate { animation-duration: 3s; }
        }
      `}</style>
    </div>
  );
}

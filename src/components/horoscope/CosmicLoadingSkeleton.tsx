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
  /** Real chart context, surfaced in the step list so the wait shows actual work. */
  chartName?: string | null;
  moonSign?: string | null;
  dasha?: { maha_dasha?: string; antar_dasha?: string; pratyantar_dasha?: string } | null;
  dateLabel?: string;
}

/**
 * Relative cost of each pipeline step. The final AI composition dominates the
 * wall clock, so the earlier steps must not be spread evenly across the
 * estimate or they would crawl while the real work is still queued.
 */
const STEP_WEIGHTS = [0.08, 0.12, 0.1, 0.1, 0.6];

export default function CosmicLoadingSkeleton({
  period,
  chartName,
  moonSign,
  dasha,
  dateLabel,
}: Props) {
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

  // The steps below mirror what generate-horoscope actually does, in order, and
  // name the reader's real placements where we already have them client-side.
  // Nothing here is invented: if a value is missing we fall back to the generic
  // phrasing rather than inventing a placement.
  const dashaLine = [dasha?.maha_dasha && `${dasha.maha_dasha} mahadasha`, dasha?.antar_dasha && `${dasha.antar_dasha} antardasha`]
    .filter(Boolean)
    .join(" · ");

  const steps: string[] = [
    chartName ? `Locating ${chartName}'s chart` : "Locating your birth chart",
    dateLabel ? `Computing planetary transits for ${dateLabel}` : "Computing planetary transits",
    dashaLine ? `Tracing ${dashaLine}` : "Tracing your dasha periods",
    moonSign ? `Weighing Moon in ${moonSign} against the natal chart` : "Weighing transits against the natal chart",
    "Composing your reading",
  ];

  // Walk the weighted timeline to find which step the elapsed time lands in.
  let stepIndex = 0;
  {
    let acc = 0;
    for (let i = 0; i < STEP_WEIGHTS.length; i++) {
      acc += STEP_WEIGHTS[i];
      if (ratio < acc) { stepIndex = i; break; }
      stepIndex = i;
    }
  }
  // Once past the estimate we hold on the final step rather than ticking
  // everything to done — the work demonstrably isn't finished.
  const activeStep = overrunning ? steps.length - 1 : stepIndex;

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

      {/* Live pipeline — shows the real work behind the wait */}
      <div className="relative overflow-hidden horo-glass-card" style={{ borderRadius: 20 }}>
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

        <p
          className="text-[11px] uppercase mb-4"
          style={{
            color: "hsl(var(--gold) / 0.7)",
            letterSpacing: "0.2em",
            fontFamily: "'Jost', sans-serif",
          }}
        >
          Casting your chart
        </p>

        <ol className="flex flex-col gap-3" aria-live="polite">
          {steps.map((label, i) => {
            const done = i < activeStep;
            const active = i === activeStep;
            return (
              <li key={label} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 16, height: 16, marginTop: 2 }}
                >
                  {done ? (
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                      <path
                        d="M3.5 8.5l3 3 6-7"
                        stroke="hsl(var(--gold) / 0.85)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : active ? (
                    <span
                      className="cosmic-step-spinner"
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        border: "1.5px solid hsl(var(--gold) / 0.25)",
                        borderTopColor: "hsl(var(--gold))",
                        display: "block",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "hsl(var(--text-muted) / 0.35)",
                        display: "block",
                      }}
                    />
                  )}
                </span>
                <span
                  style={{
                    fontSize: "0.82rem",
                    lineHeight: 1.45,
                    fontFamily: "'Jost', sans-serif",
                    color: active
                      ? "hsl(var(--text-primary))"
                      : done
                        ? "hsl(var(--text-secondary) / 0.75)"
                        : "hsl(var(--text-muted) / 0.55)",
                    transition: "color 0.4s ease",
                  }}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
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
        .cosmic-step-spinner { animation: cosmicStepSpin 0.9s linear infinite; }
        @keyframes cosmicStepSpin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cosmic-loader-fade,
          .cosmic-loader-sheen::after { animation: none !important; }
          .cosmic-loader-indeterminate { animation-duration: 3s; }
          .cosmic-step-spinner { animation-duration: 2.4s; }
        }
      `}</style>
    </div>
  );
}

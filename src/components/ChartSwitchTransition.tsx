import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useActiveChart } from "@/hooks/useActiveChart";

/**
 * Cinematic full-screen overlay shown while switching the active chart.
 *
 * Phases (driven by useActiveChart.switching):
 *   - "pulsing": gold rings pulse, starting slow and accelerating; orb micro-vibrates.
 *   - "settled": pulses lock into a single steady glow; "Welcome, {name}" headline.
 *   - "idle":    overlay is removed.
 */
export default function ChartSwitchTransition() {
  const { switching } = useActiveChart();
  const visible = switching.phase !== "idle";
  const settled = switching.phase === "settled";
  const name = switching.targetName || "Seeker";

  // Acceleration: tween the pulse duration from 1.6s -> 0.55s while pulsing.
  const [pulseDuration, setPulseDuration] = useState(1.6);
  useEffect(() => {
    if (switching.phase !== "pulsing") {
      setPulseDuration(1.6);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 1.6;
    const to = 0.55;
    const span = 1400; // ms over which acceleration occurs
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / span);
      // ease-in for a "winding up" feel
      const eased = t * t;
      setPulseDuration(from + (to - from) * eased);
      if (t < 1 && switching.phase === "pulsing") {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [switching.phase]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="chart-switch-overlay"
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(circle at center, hsl(var(--ink) / 0.88) 0%, hsl(var(--ink) / 0.96) 70%)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          {/* Concentric pulse rings */}
          <div className="relative w-[260px] h-[260px] flex items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute rounded-full"
                style={{
                  width: 120,
                  height: 120,
                  border: "1px solid hsl(var(--gold) / 0.55)",
                  boxShadow:
                    "0 0 30px -6px hsl(var(--gold) / 0.45), inset 0 0 18px hsl(var(--gold) / 0.18)",
                }}
                animate={
                  settled
                    ? { scale: 1, opacity: 0.65 }
                    : {
                        scale: [1, 2.1],
                        opacity: [0.7, 0],
                      }
                }
                transition={
                  settled
                    ? { duration: 0.5, ease: "easeOut" }
                    : {
                        duration: pulseDuration,
                        ease: "easeOut",
                        repeat: Infinity,
                        delay: i * (pulseDuration / 3),
                      }
                }
              />
            ))}

            {/* Central orb (with micro-vibration during pulsing) */}
            <motion.div
              className="relative w-[88px] h-[88px] rounded-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--gold)) 0%, hsl(var(--crimson)) 75%, hsl(var(--ink-2)) 100%)",
                border: "1.5px solid hsl(var(--gold))",
                boxShadow:
                  "0 0 32px hsl(var(--gold) / 0.55), inset 0 0 18px hsl(var(--ink) / 0.45)",
              }}
              animate={
                settled
                  ? { x: 0, y: 0, scale: 1.05 }
                  : {
                      x: [-1.2, 1.2, -1.5, 1.5, -1, 1, 0],
                      y: [1, -1, -1.5, 1.5, 1.2, -1, 0],
                      scale: [1, 1.04, 1, 1.05, 1, 1.04, 1],
                    }
              }
              transition={
                settled
                  ? { duration: 0.5, ease: "easeOut" }
                  : {
                      duration: Math.max(0.35, pulseDuration * 0.55),
                      ease: "easeInOut",
                      repeat: Infinity,
                    }
              }
            >
              <span
                className="text-2xl"
                style={{
                  color: "hsl(var(--ink))",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                }}
                aria-hidden
              >
                {(name.charAt(0) || "✦").toUpperCase()}
              </span>
            </motion.div>
          </div>

          {/* Caption */}
          <div className="mt-8 text-center px-6">
            <AnimatePresence mode="wait">
              {settled ? (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <p
                    className="text-[10px] uppercase mb-2"
                    style={{
                      color: "hsl(var(--gold) / 0.7)",
                      fontFamily: "'Jost', sans-serif",
                      letterSpacing: "0.32em",
                    }}
                  >
                    Reading As
                  </p>
                  <p
                    className="text-2xl md:text-3xl"
                    style={{
                      color: "hsl(var(--gold-light))",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 500,
                      letterSpacing: "0.01em",
                    }}
                  >
                    Welcome, {name}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="aligning"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <p
                    className="text-[10px] uppercase mb-2"
                    style={{
                      color: "hsl(var(--gold) / 0.55)",
                      fontFamily: "'Jost', sans-serif",
                      letterSpacing: "0.32em",
                    }}
                  >
                    Switching Reading
                  </p>
                  <p
                    className="text-xl md:text-2xl italic"
                    style={{
                      color: "hsl(var(--text-secondary))",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 400,
                    }}
                  >
                    Aligning the stars with {name}…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

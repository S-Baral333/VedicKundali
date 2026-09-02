/**
 * Shape-matching skeletons for the Admin → AI Engine page.
 * Each skeleton mirrors the final layout so first-paint never flickers.
 * Shimmer is driven by Tailwind's animate-pulse; reduced-motion users see
 * a static placeholder (handled globally by the project's CSS).
 */
import { Flame, FileText, Scale } from "lucide-react";

const GLASS =
  "bg-background/40 backdrop-blur-[14px] border border-primary/20 rounded-[20px]";

const Bar = ({ w = "100%", h = "0.75rem", className = "" }: { w?: string; h?: string; className?: string }) => (
  <div
    className={`rounded bg-primary/10 animate-pulse ${className}`}
    style={{ width: w, height: h }}
  />
);

const Pip = ({ w = "2.5rem" }: { w?: string }) => (
  <div className="inline-block h-3 rounded bg-primary/15 animate-pulse align-middle" style={{ width: w }} />
);

// ─── Header ───────────────────────────────────────────────────────
export function HeaderSkeleton() {
  return (
    <div
      className={`${GLASS} relative overflow-hidden p-5 sm:p-6`}
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--background) / 0.55))",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center border animate-pulse"
            style={{
              borderColor: "hsl(var(--primary) / 0.35)",
              background: "hsl(var(--primary) / 0.08)",
            }}
          >
            <Flame className="h-6 w-6 text-primary/40" />
          </div>
          <div className="space-y-2">
            <Bar w="280px" h="1.5rem" />
            <Bar w="220px" h="0.75rem" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SkelChip icon={<FileText className="h-3 w-3" />} label="Layers" />
          <SkelChip icon={<Scale className="h-3 w-3" />} label="Laws" />
          <SkelChip label="Last published" />
        </div>
      </div>
    </div>
  );
}

function SkelChip({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
      style={{
        background: "hsl(var(--primary) / 0.05)",
        border: "1px solid hsl(var(--primary) / 0.2)",
      }}
    >
      {icon && <span className="text-primary/40">{icon}</span>}
      <span className="text-muted-foreground/70 uppercase tracking-[0.14em] text-[10px]">
        {label}
      </span>
      <Pip w="2rem" />
    </div>
  );
}

// ─── Layer rail ───────────────────────────────────────────────────
export function RailSkeleton() {
  return (
    <div className={`${GLASS} p-3`}>
      <div className="px-2 pb-2.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
        Manuscript
      </div>
      <div className="relative pl-3">
        <div
          className="absolute left-[14px] top-1 bottom-1 w-px"
          style={{ background: "hsl(var(--primary) / 0.12)" }}
        />
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="relative pl-6 pr-3 py-2">
              <span
                className="absolute left-[10px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary/15 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <span className="text-primary/30 text-xs w-6 shrink-0 font-mono">
                    {["I", "II", "III", "IV", "V", "VI", "VII", "∞"][i]}
                  </span>
                  <Bar w="70%" h="0.85rem" />
                </div>
              </div>
              <div className="pl-8 mt-1.5">
                <Bar w="50%" h="0.5rem" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Editor frame ─────────────────────────────────────────────────
export function EditorSkeleton() {
  return (
    <div className={`${GLASS} flex flex-col`}>
      <div className="px-5 py-4 border-b border-primary/15">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2 flex-1">
            <Bar w="180px" h="0.6rem" />
            <Bar w="220px" h="1.4rem" />
            <Bar w="60%" h="0.65rem" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="h-6 w-20 rounded-full animate-pulse"
              style={{ background: "hsl(var(--primary) / 0.1)" }}
            />
            <div
              className="h-8 w-[140px] rounded-md animate-pulse"
              style={{ background: "hsl(var(--primary) / 0.08)" }}
            />
          </div>
        </div>
      </div>
      <div className="p-5 flex-1">
        <div
          className="rounded-xl p-4 space-y-2.5"
          style={{
            background: "hsl(var(--primary) / 0.03)",
            border: "1px solid hsl(var(--primary) / 0.18)",
            minHeight: "480px",
          }}
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded bg-primary/8 animate-pulse"
              style={{
                width: `${65 + ((i * 23) % 30)}%`,
                animationDelay: `${i * 60}ms`,
                background: "hsl(var(--primary) / 0.08)",
              }}
            />
          ))}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-primary/15 flex flex-wrap gap-2 justify-end">
        <div className="h-8 w-20 rounded-md bg-primary/10 animate-pulse" />
        <div className="h-8 w-36 rounded-md bg-primary/10 animate-pulse" />
        <div className="h-8 w-24 rounded-md bg-primary/15 animate-pulse" />
      </div>
    </div>
  );
}

// ─── Codex (12 Laws) ──────────────────────────────────────────────
export function CodexSkeleton() {
  return (
    <div className="space-y-3">
      <div className={`${GLASS} p-4 flex items-center justify-between`}>
        <Bar w="50%" h="0.75rem" />
        <div className="h-8 w-24 rounded-md bg-primary/10 animate-pulse" />
      </div>
      <div className={`${GLASS} divide-y divide-primary/10`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 shrink-0 text-right pt-1">
                <span
                  className="block text-2xl text-primary/20 font-mono animate-pulse"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  {romanize(i + 1)}
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <Bar w="40%" h="1rem" />
                <Bar w="95%" h="0.7rem" />
                <Bar w="80%" h="0.7rem" />
              </div>
              <div className="flex flex-col items-center gap-1.5 pt-1">
                <div className="h-7 w-7 rounded-full bg-primary/10 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function romanize(n: number): string {
  const map: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let x = n;
  for (const [v, s] of map) {
    while (x >= v) { out += s; x -= v; }
  }
  return out;
}

// ─── Persona ──────────────────────────────────────────────────────
export function PersonaSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`${GLASS} p-5`}>
          <div
            className="h-12 w-12 rounded-full mx-auto mb-4 animate-pulse"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              border: "1px solid hsl(var(--primary) / 0.25)",
              animationDelay: `${i * 80}ms`,
            }}
          />
          <div className="mx-auto mb-2 w-2/3">
            <Bar w="100%" h="1.1rem" />
          </div>
          <div className="space-y-1.5">
            <Bar w="100%" h="0.65rem" />
            <Bar w="90%" h="0.65rem" />
            <Bar w="75%" h="0.65rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Voice Demo ───────────────────────────────────────────────────
export function VoiceSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`${GLASS} p-5 space-y-3`}>
          <div className="flex items-center justify-between">
            <div
              className="h-5 w-16 rounded-full bg-primary/10 animate-pulse"
              style={{ animationDelay: `${i * 90}ms` }}
            />
            <div className="h-4 w-4 rounded bg-primary/10 animate-pulse" />
          </div>
          <div
            className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] space-y-1.5"
            style={{ background: "hsl(var(--muted) / 0.4)" }}
          >
            <Bar w="90%" h="0.7rem" />
            <Bar w="60%" h="0.7rem" />
          </div>
          <div
            className="rounded-2xl rounded-tr-sm px-3.5 py-3 ml-auto max-w-[92%] space-y-1.5"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.03))",
              border: "1px solid hsl(var(--primary) / 0.2)",
            }}
          >
            <Bar w="95%" h="0.75rem" />
            <Bar w="85%" h="0.75rem" />
            <Bar w="70%" h="0.75rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Engine (constellation dim) ───────────────────────────────────
export function EngineSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`${GLASS} p-5 space-y-3`}>
        <Bar w="40%" h="0.6rem" />
        <Bar w="60%" h="1.2rem" />
        <div
          className="rounded-lg p-4 space-y-2"
          style={{
            background: "hsl(var(--background) / 0.4)",
            border: "1px solid hsl(var(--primary) / 0.12)",
          }}
        >
          <Bar w="80%" h="0.7rem" />
          <Bar w="95%" h="0.7rem" />
          <Bar w="55%" h="0.7rem" />
        </div>
      </div>
      <div className={`${GLASS} p-5 space-y-4`}>
        <Bar w="35%" h="0.6rem" />
        <Bar w="55%" h="1.2rem" />
        <div className="relative h-[260px] flex items-center justify-center">
          <div
            className="h-16 w-16 rounded-full animate-pulse"
            style={{
              background: "hsl(var(--primary) / 0.18)",
              border: "1px solid hsl(var(--primary) / 0.5)",
              boxShadow: "0 0 24px hsl(var(--primary) / 0.25)",
            }}
          />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * 110;
            const y = Math.sin(angle) * 100;
            return (
              <div
                key={i}
                className="absolute h-5 w-20 rounded-full bg-primary/8 animate-pulse"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  border: "1px solid hsl(var(--primary) / 0.2)",
                  animationDelay: `${i * 90}ms`,
                }}
              />
            );
          })}
        </div>
        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
          Mapping consumers…
        </p>
      </div>
    </div>
  );
}

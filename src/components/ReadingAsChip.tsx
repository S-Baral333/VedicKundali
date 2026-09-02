import { useActiveChart } from "@/hooks/useActiveChart";

interface ReadingAsChipProps {
  /** Override the leading label, e.g. "Primary" on compatibility. */
  label?: string;
  /** Show the full name instead of just the first name. */
  fullName?: boolean;
  className?: string;
}

/**
 * Compact gold pill that names the chart currently driving the page's content.
 *
 * Drop it under a page title so users always know which "Reading As" their
 * personalised data belongs to. Hides itself when there is no active chart.
 */
export default function ReadingAsChip({
  label = "Reading as",
  fullName = false,
  className = "",
}: ReadingAsChipProps) {
  const { activeChart } = useActiveChart();
  if (!activeChart) return null;

  const name = fullName
    ? activeChart.full_name
    : activeChart.full_name?.trim().split(/\s+/)[0] || activeChart.full_name;

  return (
    <span
      key={activeChart.id}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full animate-fade-in ${className}`}
      style={{
        border: "0.5px solid hsl(var(--gold) / 0.28)",
        background: "hsl(var(--gold) / 0.06)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      aria-label={`${label} ${name}`}
      title={`${label} ${activeChart.full_name}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: "hsl(var(--gold))",
          boxShadow: "0 0 8px hsl(var(--gold) / 0.7)",
        }}
        aria-hidden
      />
      <span
        className="text-[9.5px] uppercase"
        style={{
          fontFamily: "'Jost', sans-serif",
          letterSpacing: "0.24em",
          color: "hsl(var(--gold) / 0.7)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 500,
          fontSize: "13px",
          letterSpacing: "0.01em",
          color: "hsl(var(--gold-light))",
        }}
      >
        {name}
      </span>
    </span>
  );
}

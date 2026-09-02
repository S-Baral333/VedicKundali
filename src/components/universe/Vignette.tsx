interface Props { intensity: number }
export default function Vignette({ intensity }: Props) {
  if (intensity <= 0) return null;
  const a = Math.min(1, intensity);
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${a * 0.85}) 100%)`,
      }}
    />
  );
}

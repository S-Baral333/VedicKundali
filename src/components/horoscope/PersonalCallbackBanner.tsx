import { Flame } from "lucide-react";

export default function PersonalCallbackBanner({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div
      className="rounded-2xl px-5 py-4 flex items-start gap-3 sacred-reveal"
      style={{
        background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))",
        border: "0.5px solid hsl(var(--gold) / 0.32)",
      }}
    >
      <Flame className="h-4 w-4 mt-1 shrink-0" style={{ color: "hsl(var(--gold))" }} />
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase mb-1.5" style={{ color: "hsl(var(--gold))" }}>
          Rishi Guru · Reading From Your Chart
        </p>
        <p
          className="text-[1.1rem] leading-[1.55] italic"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--text-primary))" }}
        >
          "{text}"
        </p>
      </div>
    </div>
  );
}

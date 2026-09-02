import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";

interface Props {
  citations?: string[];
  dharmicClose?: string;
  lifeAreaLens?: { area: string; guidance: string }[];
}

export default function GuruCitationsFooter({ citations, dharmicClose, lifeAreaLens }: Props) {
  const [open, setOpen] = useState(false);
  if (!citations?.length && !dharmicClose && !lifeAreaLens?.length) return null;

  return (
    <div
      className="rounded-2xl p-4 mt-2"
      style={{
        background: "rgba(201,168,76,0.03)",
        border: "0.5px solid hsl(var(--gold) / 0.18)",
      }}
    >
      {!!lifeAreaLens?.length && (
        <div className="mb-3 space-y-2.5">
          {lifeAreaLens.map((l, i) => (
            <div key={i}>
              <span className="inline-block text-[9px] tracking-[0.18em] uppercase mb-1 px-1.5 py-0.5 rounded"
                style={{ background: "hsl(var(--gold) / 0.10)", color: "hsl(var(--gold))" }}>
                {l.area}
              </span>
              <p className="text-[13.5px] leading-[1.65]" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, color: "hsl(var(--text-secondary))" }}>
                {l.guidance}
              </p>
            </div>
          ))}
        </div>
      )}

      {dharmicClose && (
        <p
          className="text-center my-3 text-[15px] italic"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold-pale, var(--gold)))" }}
        >
          {dharmicClose}
        </p>
      )}

      {!!citations?.length && (
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 text-[10px] tracking-[0.18em] uppercase pt-2"
          style={{ color: "hsl(var(--text-muted))", borderTop: "0.5px solid hsl(var(--gold) / 0.14)" }}
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-3 w-3" />
            Sources ({citations.length})
          </span>
          <ChevronDown className="h-3 w-3 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
        </button>
      )}
      {open && !!citations?.length && (
        <ul className="mt-2 space-y-1.5">
          {citations.map((c, i) => (
            <li key={i} className="text-[12px] leading-snug" style={{ color: "hsl(var(--text-muted))", fontFamily: "'Jost', sans-serif" }}>
              · {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

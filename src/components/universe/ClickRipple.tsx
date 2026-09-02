import { useEffect, useState } from "react";

interface Ripple { id: number; x: number; y: number }

interface Props { color?: string }

export default function ClickRipple({ color = "hsl(var(--gold) / 0.7)" }: Props) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    let id = 0;
    const onClick = (e: MouseEvent) => {
      const r: Ripple = { id: ++id, x: e.clientX, y: e.clientY };
      setRipples((cur) => [...cur, r]);
      window.setTimeout(() => {
        setRipples((cur) => cur.filter((x) => x.id !== r.id));
      }, 900);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full border"
          style={{
            left: r.x - 6,
            top: r.y - 6,
            width: 12,
            height: 12,
            borderColor: color,
            animation: "click-ripple 900ms ease-out forwards",
          }}
        />
      ))}
      <style>{`
        @keyframes click-ripple {
          from { transform: scale(0.5); opacity: 0.9; }
          to   { transform: scale(8);   opacity: 0;   }
        }
      `}</style>
    </div>
  );
}

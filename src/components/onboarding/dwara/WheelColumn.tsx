import { useId, useLayoutEffect, useRef } from "react";

/** Row height in px. Mirrored by --dw-item in dwara.css. */
export const WHEEL_ITEM = 40;

interface WheelColumnProps {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  /** Called on a real gesture (touch, wheel, key, tap) — never on a programmatic move. */
  onTouch: () => void;
  label: string;
  format: (v: number) => string;
  /** Until the person has turned it, the default is shown dimmed — it is not an answer yet. */
  touched: boolean;
}

/**
 * One column of a scroll-snap picker. The selected row is whichever sits under
 * the centre band; a listbox underneath keeps it operable by keyboard and
 * readable by a screen reader.
 */
export default function WheelColumn({ values, value, onChange, onTouch, label, format, touched }: WheelColumnProps) {
  const uid = useId();
  const ref = useRef<HTMLDivElement>(null);
  const idx = Math.max(0, values.indexOf(value));

  // A scroll we caused ourselves must not be read back as the person's input,
  // or the wheel fights its own animation.
  const quietUntil = useRef(0);
  // The index the last user scroll produced, so the effect below can tell
  // "the parent echoed my scroll" from "something else moved the value".
  const emitted = useRef(-1);
  const mounted = useRef(false);
  const typed = useRef({ buffer: "", at: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (emitted.current !== idx) {
      const target = idx * WHEEL_ITEM;
      if (Math.abs(el.scrollTop - target) >= 1) {
        const smooth =
          mounted.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        quietUntil.current = performance.now() + (smooth ? 500 : 80);
        el.scrollTo({ top: target, behavior: smooth ? "smooth" : "auto" });
      }
    }
    emitted.current = -1;
    mounted.current = true;
  }, [idx, values.length]);

  const onScroll = () => {
    const el = ref.current;
    if (!el || performance.now() < quietUntil.current) return;
    const i = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / WHEEL_ITEM)));
    if (i !== idx) {
      emitted.current = i;
      onChange(values[i]);
    }
  };

  const move = (to: number) => {
    const i = Math.min(values.length - 1, Math.max(0, to));
    if (i !== idx) onChange(values[i]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 };
    if (e.key in step) {
      e.preventDefault();
      onTouch();
      move(idx + step[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      onTouch();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onTouch();
      move(values.length - 1);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Type "19" then "97" to jump to a year; "dec" to jump to December.
      const now = performance.now();
      const t = typed.current;
      t.buffer = now - t.at > 900 ? e.key.toLowerCase() : t.buffer + e.key.toLowerCase();
      t.at = now;
      const hit = values.findIndex(
        (v) => String(v).startsWith(t.buffer) || format(v).toLowerCase().startsWith(t.buffer)
      );
      if (hit >= 0) {
        onTouch();
        move(hit);
      }
    }
  };

  return (
    <div className="dw-wheel" data-idle={!touched}>
      <span className="dw-wheel-label">{label}</span>
      <div
        ref={ref}
        role="listbox"
        tabIndex={0}
        aria-label={label}
        aria-activedescendant={`${uid}-${idx}`}
        className="dw-wheel-scroll"
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onPointerDown={onTouch}
        onWheel={onTouch}
      >
        {values.map((v, i) => (
          <div
            key={v}
            id={`${uid}-${i}`}
            role="option"
            aria-selected={i === idx}
            className="dw-wheel-item"
            onClick={() => {
              onTouch();
              onChange(v);
            }}
          >
            {format(v)}
          </div>
        ))}
      </div>
    </div>
  );
}

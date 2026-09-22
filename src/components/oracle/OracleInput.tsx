import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

const ROTATING_PLACEHOLDERS = [
  { key: "ph1", text: "What weighs on your heart today?" },
  { key: "ph2", text: "Why am I stuck?" },
  { key: "ph3", text: "What lesson am I learning?" },
  { key: "ph4", text: "What does my chart reveal?" },
  { key: "ph5", text: "Ask the universe…" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onFocusChange?: (focused: boolean) => void;
  onSubmit?: () => void;
  disabled?: boolean;
}

export default function OracleInput({ value, onChange, onFocusChange, onSubmit, disabled }: Props) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [phIndex, setPhIndex] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Rotate placeholder only when empty + unfocused
  useEffect(() => {
    if (focused || value.length > 0) return;
    const id = window.setInterval(() => {
      setPhIndex((i) => (i + 1) % ROTATING_PLACEHOLDERS.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [focused, value]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="relative">
      {/* Shimmer border */}
      <div
        aria-hidden
        className="absolute -inset-px rounded-[26px] pointer-events-none"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(var(--primary) / 0.0) 0%, hsl(var(--primary) / 0.55) 25%, hsl(var(--primary) / 0.0) 50%, hsl(var(--primary) / 0.35) 75%, hsl(var(--primary) / 0.0) 100%)",
          animation: "oracle-shimmer 8s linear infinite",
          opacity: focused ? 0.95 : 0.55,
          transition: "opacity 0.6s ease",
          filter: "blur(0.5px)",
        }}
      />
      <div
        className="relative rounded-[24px] backdrop-blur-xl"
        style={{
          background: "linear-gradient(180deg, hsl(var(--background) / 0.55), hsl(var(--background) / 0.35))",
          boxShadow: focused
            ? "inset 0 0 60px hsl(var(--primary) / 0.18), 0 0 40px hsl(var(--primary) / 0.20)"
            : "inset 0 0 40px hsl(var(--primary) / 0.10), 0 0 20px hsl(var(--primary) / 0.10)",
          border: "1px solid hsl(var(--primary) / 0.20)",
          transition: "box-shadow 0.6s ease",
        }}
      >
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { setFocused(true); onFocusChange?.(true); }}
          onBlur={() => { setFocused(false); onFocusChange?.(false); }}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={t("pages:ui.oracleInput." + ROTATING_PLACEHOLDERS[phIndex].key, ROTATING_PLACEHOLDERS[phIndex].text)}
          className="min-h-[140px] resize-none border-0 bg-transparent text-base md:text-lg leading-relaxed px-6 py-5 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}
          maxLength={500}
        />
      </div>
    </div>
  );
}

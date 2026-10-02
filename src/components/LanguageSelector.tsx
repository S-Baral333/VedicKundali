import { LANGUAGES } from "@/i18n/languages";
import { useLanguage } from "@/hooks/useLanguage";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LanguageSelectorProps {
  variant?: "grid" | "list";
  onChange?: (code: string) => void;
}

/**
 * Reusable language picker. Renders each option in its own script so users
 * can recognize their native tongue without reading English first.
 */
export default function LanguageSelector({ variant = "grid", onChange }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const handle = async (code: string) => {
    await setLanguage(code);
    onChange?.(code);
  };

  return (
    <div
      className={
        variant === "grid"
          ? "grid grid-cols-2 sm:grid-cols-3 gap-2"
          : "flex flex-col gap-2"
      }
      role="radiogroup"
      aria-label={t("pages:ui.languageSelector.language", "Language")}
    >
      {LANGUAGES.map((lang) => {
        const active = language === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => handle(lang.code)}
            // Tight gaps and a 32px glyph on purpose. At three columns the chip
            // is ~139px, and the glyph, both gaps and the tick are all fixed
            // width, so whatever they leave is the label's entire budget. At
            // gap-3 with a 36px glyph that budget was 39px, which clipped
            // "English" (45px) and "తెలుగు" (41px); this leaves 55px.
            className="group relative flex items-center gap-2 rounded-2xl border px-2.5 py-3 text-left transition-all duration-300"
            style={{
              background: active ? "hsl(var(--gold) / 0.08)" : "hsl(var(--ink-2) / 0.4)",
              borderColor: active ? "hsl(var(--gold) / 0.5)" : "hsl(var(--glass-border-soft))",
              boxShadow: active ? "0 0 0 1px hsl(var(--gold) / 0.25)" : "none",
            }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-base"
              style={{
                borderColor: "hsl(var(--gold) / 0.3)",
                color: "hsl(var(--gold))",
                fontFamily: lang.fontFamily ?? "'Cormorant Garamond', serif",
                background: "hsl(var(--ink) / 0.5)",
              }}
              aria-hidden
            >
              {lang.glyph}
            </span>
            <span className="flex-1 min-w-0">
              <span
                className="block text-sm font-medium truncate"
                style={{
                  color: "hsl(var(--text-primary))",
                  fontFamily: lang.fontFamily ?? "inherit",
                }}
              >
                {lang.nativeName}
              </span>
              <span
                className="block text-[11px] truncate"
                style={{ color: "hsl(var(--text-muted))" }}
              >
                {lang.name}
              </span>
            </span>
            {/* Always rendered so the text column keeps its width: hiding the
                tick instead of unmounting it stops the label truncating when
                an option becomes active. aria-checked above carries the state. */}
            <Check
              className="h-4 w-4 shrink-0"
              style={{ color: "hsl(var(--gold))", opacity: active ? 1 : 0 }}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

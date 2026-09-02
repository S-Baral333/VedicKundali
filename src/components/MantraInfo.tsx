import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MantraInfoProps {
  /** The Sanskrit mantra text (always rendered in Devanagari, never translated). */
  mantra: string;
  /** Optional key into the `mantras` translation namespace (e.g. "shani.beej"). */
  meaningKey?: string;
  /** Inline className for the wrapper. */
  className?: string;
}

/**
 * Renders a Sanskrit mantra alongside a small ⓘ button. Tapping the icon opens
 * a popover with the mantra's meaning in the user's chosen language.
 *
 * Phase 2 will fill in the `mantras` translation dictionary. Until then the
 * popover shows a friendly "meaning coming soon" message in the active language.
 */
export function MantraInfo({ mantra, meaningKey, className }: MantraInfoProps) {
  const { t } = useTranslation(["mantras", "common"]);

  const meaning = meaningKey
    ? t(meaningKey, {
        ns: "mantras",
        defaultValue: t("mantraMeaningComingSoon", { ns: "common" }),
      })
    : t("mantraMeaningComingSoon", { ns: "common" });

  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className="font-serif italic text-foreground" lang="sa">
        {mantra}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("mantraMeaningAria", { ns: "common", defaultValue: "Show mantra meaning" })}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-primary/70 hover:text-primary transition-colors translate-y-[1px]"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="max-w-[280px] text-xs leading-relaxed border-primary/30"
        >
          <div className="space-y-2">
            <div className="font-serif text-sm text-primary" lang="sa">{mantra}</div>
            <div className="text-foreground/90">{meaning}</div>
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}

export default MantraInfo;

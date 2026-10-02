import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { BIRTH_PERIODS, precisionNote } from "@/lib/birth-time";

interface TimeControlsProps {
  time: string;
  period: string;
  /** "I don't know the exact time". */
  unknown: boolean;
  onChange: (next: { time: string; period: string; unknown: boolean }) => void;
}

/**
 * Birth time, with an honest fallback when it is not known. Shares its lib and
 * its wording (`pages:ui.birthTime.*`) with BirthTimeField on the Profile page,
 * because the sentence that says what a rough time costs has to read the same
 * in both places.
 *
 * "I don't know" must end in a named part of the day: the chart is cast from a
 * clock time, and a period midpoint is the only honest one we can offer.
 */
export default function TimeControls({ time, period, unknown, onChange }: TimeControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="dw-time-wrap">
      {!unknown ? (
        <input
          className="dw-time"
          type="time"
          aria-label={t("pages:ui.onboardingPage.timeOfBirth", "Time of Birth")}
          value={time}
          onChange={(e) => onChange({ time: e.target.value, period, unknown: false })}
        />
      ) : (
        <div className="dw-periods" role="radiogroup" aria-label={t("pages:ui.birthTime.pickPeriod", "Roughly when were you born?")}>
          <p className="dw-periods-hint">{t("pages:ui.birthTime.pickPeriod", "Roughly when were you born?")}</p>
          {BIRTH_PERIODS.map((bp) => {
            const active = period === bp.key;
            return (
              <button
                key={bp.key}
                type="button"
                role="radio"
                aria-checked={active}
                className="dw-period"
                data-active={active}
                onClick={() => onChange({ time: "", period: bp.key, unknown: true })}
              >
                <span className="dw-period-name">{t(`pages:ui.birthTime.${bp.labelKey}`, bp.label)}</span>
                <span className="dw-period-sub">
                  {bp.sanskrit} · {bp.from}–{bp.to}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={unknown}
        className="dw-switch"
        onClick={() => onChange({ time: unknown ? time : "", period: unknown ? "" : period, unknown: !unknown })}
      >
        <span className="dw-switch-track" aria-hidden>
          <span className="dw-switch-knob" />
        </span>
        <span>{t("pages:ui.birthTime.dontKnow", "I don't know it")}</span>
      </button>

      {unknown && period && (
        <p className="dw-note">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{t("pages:ui.birthTime.note_period", precisionNote("period") ?? "")}</span>
        </p>
      )}
    </div>
  );
}

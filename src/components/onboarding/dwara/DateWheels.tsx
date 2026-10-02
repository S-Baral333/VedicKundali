import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { localNum } from "@/lib/panchanga-i18n";
import WheelColumn from "./WheelColumn";
import {
  YEAR_SPAN, clampYMD, dateToAngle, maxDay, maxMonth, monthNames, parseISO, toISO, type YMD,
} from "./date-utils";

interface DateWheelsProps {
  /** ISO date already chosen (coming back to this step), or "". */
  value: string;
  /**
   * Fires with the ISO date once all three wheels have been turned, and with ""
   * until then. The default positions are placeholders, not an answer: a person
   * born on exactly the default date still has to confirm it by touching each
   * wheel, otherwise "I didn't scroll" silently becomes a birth date.
   */
  onChange: (iso: string, angle: number | null) => void;
}

const DEFAULT: YMD = { y: 1995, m: 6, d: 15 };

export default function DateWheels({ value, onChange }: DateWheelsProps) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? "en").split("-")[0];

  const initial = useMemo(() => parseISO(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [ymd, setYmd] = useState<YMD>(initial ?? DEFAULT);
  const [touched, setTouched] = useState({ d: !!initial, m: !!initial, y: !!initial });

  const thisYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: YEAR_SPAN + 1 }, (_, i) => thisYear - i), [thisYear]);
  const months = useMemo(() => Array.from({ length: maxMonth(ymd.y) }, (_, i) => i + 1), [ymd.y]);
  const days = useMemo(() => Array.from({ length: maxDay(ymd.y, ymd.m) }, (_, i) => i + 1), [ymd.y, ymd.m]);
  const names = useMemo(() => monthNames(lang), [lang]);

  const lastEmitted = useRef<string | null>(null);
  useEffect(() => {
    const all = touched.d && touched.m && touched.y;
    const iso = all ? toISO(ymd) : "";
    if (iso === lastEmitted.current) return;
    lastEmitted.current = iso;
    onChange(iso, all ? dateToAngle(ymd) : null);
  }, [ymd, touched, onChange]);

  const touch = (k: "d" | "m" | "y") => () => setTouched((prev) => (prev[k] ? prev : { ...prev, [k]: true }));

  return (
    <div className="dw-wheels" role="group" aria-label={t("pages:ui.onboardingPage.dateOfBirth", "Date of Birth")}>
      <div className="dw-wheel-band" aria-hidden />
      <WheelColumn
        label={t("onboarding:dwara.day")}
        values={days}
        value={ymd.d}
        touched={touched.d}
        onTouch={touch("d")}
        onChange={(d) => setYmd((p) => clampYMD({ ...p, d }))}
        format={(v) => localNum(lang, v)}
      />
      <WheelColumn
        label={t("onboarding:dwara.month")}
        values={months}
        value={ymd.m}
        touched={touched.m}
        onTouch={touch("m")}
        onChange={(m) => setYmd((p) => clampYMD({ ...p, m }))}
        format={(v) => names[v - 1]}
      />
      <WheelColumn
        label={t("onboarding:dwara.year")}
        values={years}
        value={ymd.y}
        touched={touched.y}
        onTouch={touch("y")}
        onChange={(y) => setYmd((p) => clampYMD({ ...p, y }))}
        format={(v) => localNum(lang, v)}
      />
    </div>
  );
}

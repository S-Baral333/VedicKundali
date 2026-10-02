import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import { LIFE_PRIORITIES, GUIDANCE_STYLES } from "@/lib/onboarding-constants";
import { EMPTY_RESULT, type OnboardingResult } from "@/lib/onboarding-profile";
import { getPeriod } from "@/lib/birth-time";
import { hapticConfirm } from "@/lib/haptics";
import type { ResolvedPlace } from "@/lib/geocode";
import DwaraSky from "./DwaraSky";
import OrbProgress from "./OrbProgress";
import DateWheels from "./DateWheels";
import PlaceFinder from "./PlaceFinder";
import TimeControls from "./TimeControls";
import { MOODS, SkyController, type SkyTargets } from "./sky-state";
import { timeToAngle } from "./date-utils";
import "./dwara.css";

/**
 * Dwara — the onboarding portal.
 *
 * Five worlds, each a little brighter than the last: the Void (language and
 * welcome), the Self (a name), the Moment (date, time, place), Intent
 * (priorities and tone) and the Crossing. One question per screen; the sky
 * behind it reacts to every answer.
 *
 * This component owns the journey and nothing about persistence. `onSave` does
 * the real write and the crossing waits on it, so "your sky is ready" is only
 * ever said after it is true.
 */

type Step =
  | "language" | "welcome" | "name"
  | "date" | "time" | "place"
  | "intent" | "tone"
  | "crossing" | "arrival";

const ORDER: Step[] = ["language", "welcome", "name", "date", "time", "place", "intent", "tone", "crossing", "arrival"];

/** How many orbs are lit at each step. */
const WORLD: Record<Step, number> = {
  language: 0, welcome: 1, name: 2, date: 3, time: 3, place: 3, intent: 4, tone: 4, crossing: 5, arrival: 5,
};

const MAX_PRIORITIES = 3;
const LEAVE_MS = 360;

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/**
 * The visible part of the screen. With the on-screen keyboard up, a
 * `position: fixed; bottom: 0` card sits behind it on both iOS and Chrome
 * Android, so the whole stage is sized to the visual viewport instead.
 */
function useVisibleViewport() {
  const read = () => {
    const vv = window.visualViewport;
    return { height: Math.round(vv?.height ?? window.innerHeight), top: Math.round(vv?.offsetTop ?? 0) };
  };
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setVp(read());
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return { ...vp, keyboardOpen: vp.height < window.innerHeight * 0.78 };
}

function StarGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path d="M12 1.5c.7 5.6 4.9 9.8 10.5 10.5-5.6.7-9.8 4.9-10.5 10.5C11.3 16.9 7.1 12.7 1.5 12 7.1 11.3 11.3 7.1 12 1.5Z" fill="currentColor" />
    </svg>
  );
}

interface DwaraFlowProps {
  initialName?: string;
  /** Skip the language step when the person has already chosen one. */
  languageChosen: boolean;
  /** The real write. Resolve when saved; reject to show a retry. */
  onSave: (result: OnboardingResult) => Promise<void>;
  /** The person stepped through. */
  onDone: () => void;
}

export default function DwaraFlow({ initialName = "", languageChosen, onSave, onDone }: DwaraFlowProps) {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();
  const viewport = useVisibleViewport();

  const [sky] = useState(() => new SkyController());
  const [step, setStep] = useState<Step>(languageChosen ? "welcome" : "language");
  const [leaving, setLeaving] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [data, setData] = useState<OnboardingResult>({ ...EMPTY_RESULT, name: initialName });
  const [momentSkipped, setMomentSkipped] = useState(false);
  const [crossFailed, setCrossFailed] = useState(false);
  const [dateAngle, setDateAngle] = useState<number | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const stepRef = useRef(step);
  stepRef.current = step;
  const busy = useRef(false);
  const mounted = useRef(true);
  const run = useRef(0);
  const firstStep = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // ── moving between beats ────────────────────────────────────────────────
  const goTo = useCallback(
    (next: Step) =>
      new Promise<void>((resolve) => {
        if (reduce) {
          setStep(next);
          resolve();
          return;
        }
        setLeaving(true);
        window.setTimeout(() => {
          setStep(next);
          setLeaving(false);
          resolve();
        }, LEAVE_MS);
      }),
    [reduce]
  );

  /** Advance once; ignore a second tap while the first is still travelling. */
  const advance = useCallback(
    async (next: Step, pulse = 0) => {
      if (busy.current) return;
      busy.current = true;
      if (pulse) sky.pulse(pulse);
      await goTo(next);
      busy.current = false;
    },
    [goTo, sky]
  );

  // ── what the sky should look like ───────────────────────────────────────
  useEffect(() => {
    sky.set({ visibleH: viewport.height });
  }, [sky, viewport.height]);

  useEffect(() => {
    if (step === "crossing" || step === "arrival") return; // the crossing drives its own sky
    const base: Partial<SkyTargets> =
      step === "language" ? MOODS.language
      : step === "welcome" ? MOODS.welcome
      : step === "name" ? MOODS.self
      : step === "intent" || step === "tone"
        ? { ...MOODS.intent, grahas: Math.min(1, 0.45 + 0.18 * data.lifePriorities.length) }
        : MOODS.moment;

    // Once the date is set the sign wheel appears, and the sun joins it with the time.
    const showWheel = ["time", "place", "intent", "tone"].includes(step) && dateAngle !== null && !momentSkipped;
    const sunTime = data.skipBirthTime ? getPeriod(data.birthPeriod)?.midpoint ?? "" : data.birthTime;
    const sun = showWheel ? timeToAngle(sunTime) : null;

    sky.set({
      ...base,
      ...(viewport.keyboardOpen ? { cyFrac: 0.17, scale: (base.scale ?? 0.7) * 0.55 } : null),
      signs: showWheel ? 1 : 0,
      // Rotates in from zero, so the wheel visibly aligns itself to the day.
      signsAngle: showWheel ? dateAngle ?? 0 : 0,
      sun,
      globe: step === "place" ? 1 : 0,
      pin: step === "place" && data.place ? { lat: data.place.lat, lng: data.place.lng } : null,
      lines: 0,
      bloom: 0,
      spin: 1,
    });
  }, [sky, step, viewport.keyboardOpen, data.lifePriorities.length, data.birthTime, data.birthPeriod, data.skipBirthTime, data.place, dateAngle, momentSkipped]);

  // ── focus: announce each new beat without popping the keyboard on touch ─
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    if (leaving) return;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (step === "name" && finePointer) nameRef.current?.focus({ preventScroll: true });
    else cardRef.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [step, leaving]);

  // ── beat handlers ───────────────────────────────────────────────────────
  const set = <K extends keyof OnboardingResult>(key: K, value: OnboardingResult[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const onDate = useCallback((iso: string, angle: number | null) => {
    setData((d) => ({ ...d, dateOfBirth: iso }));
    setDateAngle(angle);
  }, []);

  const onPlace = useCallback(
    (place: ResolvedPlace | null) => {
      setData((d) => ({ ...d, place }));
      if (place) sky.pulse(0.6);
    },
    [sky]
  );

  const skipMoment = () => {
    setMomentSkipped(true);
    setDateAngle(null);
    setData((d) => ({ ...d, dateOfBirth: "", birthTime: "", skipBirthTime: false, birthPeriod: "", place: null }));
    void advance("intent", 0.4);
  };

  const confirmDate = () => {
    setMomentSkipped(false);
    void advance("time", 0.8);
  };

  const skipPlace = () => {
    set("place", null);
    void advance("intent", 0.4);
  };

  const togglePriority = (id: string) => {
    setData((d) => {
      const has = d.lifePriorities.includes(id);
      if (!has && d.lifePriorities.length >= MAX_PRIORITIES) return d;
      if (!has) sky.pulse(0.35);
      return { ...d, lifePriorities: has ? d.lifePriorities.filter((p) => p !== id) : [...d.lifePriorities, id] };
    });
  };

  const back = () => {
    const prev: Partial<Record<Step, Step>> = {
      name: "welcome",
      date: "name",
      time: "date",
      place: "time",
      intent: momentSkipped ? "date" : "place",
      tone: "intent",
    };
    const to = prev[step];
    if (to) void advance(to);
  };

  // ── the crossing ────────────────────────────────────────────────────────
  const cross = async () => {
    if (busy.current) return;
    busy.current = true;
    const id = ++run.current;
    const alive = () => mounted.current && run.current === id;
    hapticConfirm();

    setCrossFailed(false);
    if (stepRef.current !== "crossing") await goTo("crossing");
    if (!alive()) return;

    const result: OnboardingResult = momentSkipped
      ? { ...data, dateOfBirth: "", birthTime: "", skipBirthTime: false, birthPeriod: "", place: null }
      : data;

    // The geometry gathers while the real work happens underneath it.
    sky.set({ glow: 1.1, spin: 3, lines: 1, rings: 1, grahas: 1, scale: 0.8, speed: 0.4, cyFrac: 0.32 });
    sky.pulse(1);
    const saving = onSave(result).then(
      () => true,
      (e) => {
        console.error("Onboarding save failed:", e);
        return false;
      }
    );
    const [ok] = await Promise.all([saving, wait(reduce ? 500 : 2400)]);
    if (!alive()) return;

    if (!ok) {
      sky.set({ glow: 0.6, spin: 1, speed: 0.05, lines: 0.5 });
      setCrossFailed(true);
      busy.current = false;
      return;
    }

    if (!reduce) {
      setHidden(true); // everything goes silent
      sky.set({ speed: 4, scale: 2.2, spin: 6, glow: 1.5 });
      await wait(1300);
      if (!alive()) return;
      sky.set({ bloom: 1 });
      await wait(1100);
      if (!alive()) return;
    }
    sky.set({ speed: 0.05, scale: 0.9, spin: 0.6, glow: 1, bloom: 0, lines: 1 });
    setStep("arrival");
    setHidden(false);
    busy.current = false;
  };

  // ── render ──────────────────────────────────────────────────────────────
  const eyebrow = useMemo(() => {
    const key: Partial<Record<Step, string>> = {
      language: "gate", welcome: "gate", name: "self",
      date: "moment", time: "moment", place: "moment",
      intent: "intent", tone: "intent", crossing: "crossing", arrival: "arrival",
    };
    return key[step] ? t(`onboarding:dwara.eyebrow.${key[step]}`) : null;
  }, [step, t]);

  const showSigil = !!data.name.trim() && ORDER.indexOf(step) > ORDER.indexOf("name");
  const canGoBack = ["name", "date", "time", "place", "intent", "tone"].includes(step);
  // The chart needs a date and a place; without both, "your sky is ready" would be untrue.
  const castable = !momentSkipped && !!data.dateOfBirth && !!data.place;

  const timeReady = data.skipBirthTime ? !!data.birthPeriod : !!data.birthTime;

  return (
    <div
      className="dw-root"
      style={{ height: viewport.height, top: viewport.top, ["--dw-vh" as string]: `${viewport.height}px` }}
      data-step={step}
    >
      {/* Clipped in a wrapper of its own: the fog overhangs the stage, and an
          overhang inside the root makes the root scrollable — focusing an input
          would then scroll the whole portal up under the keyboard. */}
      <div className="dw-sky" aria-hidden>
        <div className="dw-fog" />
        <DwaraSky sky={sky} />
      </div>

      <div className="dw-stage">
        <header className="dw-top">
          {canGoBack && (
            <button type="button" className="dw-back" onClick={back} aria-label={t("onboarding:dwara.back")}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>{t("onboarding:dwara.back")}</span>
            </button>
          )}
          <OrbProgress lit={WORLD[step]} />
          {showSigil && !viewport.keyboardOpen && (
            <div className="dw-sigil">
              <StarGlyph className="dw-sigil-star" />
              <span>{data.name.trim()}</span>
            </div>
          )}
        </header>

        <div className="dw-spacer" />

        <section className="dw-dock" data-hidden={hidden}>
          <div
            key={step}
            ref={cardRef}
            className="dw-card"
            data-leaving={leaving}
            data-hidden={hidden}
          >
            {eyebrow && <p className="dw-eyebrow">{eyebrow}</p>}

            {step === "language" && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>{t("onboarding:askLanguageTitle")}</h1>
                <p className="dw-sub">{t("onboarding:askLanguageHelper")}</p>
                <LanguageSelector onChange={() => void advance("welcome", 0.5)} />
              </>
            )}

            {step === "welcome" && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>{t("onboarding:dwara.welcomeTitle")}</h1>
                <p className="dw-sub">{t("onboarding:dwara.welcomeSub")}</p>
                <button type="button" className="dw-btn" onClick={() => void advance("name", 0.6)}>
                  {t("onboarding:dwara.begin")}
                </button>
              </>
            )}

            {step === "name" && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>{t("onboarding:dwara.nameTitle")}</h1>
                <p className="dw-sub">{t("onboarding:dwara.nameSub")}</p>
                <input
                  ref={nameRef}
                  className="dw-input"
                  type="text"
                  autoComplete="given-name"
                  enterKeyHint="next"
                  maxLength={40}
                  aria-label={t("pages:ui.onboardingPage.yourName", "Your name")}
                  placeholder={t("pages:ui.onboardingPage.yourName", "Your name")}
                  value={data.name}
                  onChange={(e) => set("name", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && data.name.trim()) {
                      set("name", data.name.trim());
                      void advance("date", 0.7);
                    }
                  }}
                />
                <button
                  type="button"
                  className="dw-btn"
                  disabled={!data.name.trim()}
                  onClick={() => {
                    set("name", data.name.trim());
                    void advance("date", 0.7);
                  }}
                >
                  {t("onboarding:continueBtn")}
                </button>
              </>
            )}

            {step === "date" && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>{t("onboarding:dwara.dateTitle")}</h1>
                <p className="dw-sub">{t("onboarding:dwara.dateSub")}</p>
                <DateWheels value={data.dateOfBirth} onChange={onDate} />
                <button type="button" className="dw-btn" disabled={!data.dateOfBirth} onClick={confirmDate}>
                  {t("onboarding:dwara.setDay")}
                </button>
                {!data.dateOfBirth && <p className="dw-hint">{t("onboarding:dwara.dateHint")}</p>}
                <button type="button" className="dw-link" onClick={skipMoment}>
                  {t("onboarding:dwara.skipMoment")}
                </button>
              </>
            )}

            {step === "time" && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>{t("onboarding:dwara.timeTitle")}</h1>
                {/* The period picker asks the same question in its own words. */}
                {!data.skipBirthTime && <p className="dw-sub">{t("onboarding:dwara.timeSub")}</p>}
                <TimeControls
                  time={data.birthTime}
                  period={data.birthPeriod}
                  unknown={data.skipBirthTime}
                  onChange={({ time, period, unknown }) =>
                    setData((d) => ({ ...d, birthTime: time, birthPeriod: period, skipBirthTime: unknown }))
                  }
                />
                <button type="button" className="dw-btn" disabled={!timeReady} onClick={() => void advance("place", 0.8)}>
                  {t("onboarding:dwara.setHour")}
                </button>
              </>
            )}

            {step === "place" && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>{t("onboarding:dwara.placeTitle")}</h1>
                <p className="dw-sub">{t("onboarding:dwara.placeSub")}</p>
                <PlaceFinder place={data.place} onPlace={onPlace} />
                <button type="button" className="dw-btn" disabled={!data.place} onClick={() => void advance("intent", 0.8)}>
                  {t("onboarding:dwara.setPlace")}
                </button>
                <button type="button" className="dw-link" onClick={skipPlace}>
                  {t("onboarding:dwara.skipPlace")}
                </button>
              </>
            )}

            {step === "intent" && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>{t("onboarding:dwara.intentTitle")}</h1>
                <p className="dw-sub">{t("onboarding:dwara.intentSub")}</p>
                <div className="dw-slots" aria-hidden>
                  {Array.from({ length: MAX_PRIORITIES }).map((_, i) => (
                    <StarGlyph key={i} className={i < data.lifePriorities.length ? "dw-slot dw-slot-on" : "dw-slot"} />
                  ))}
                </div>
                <div className="dw-chips" role="group" aria-label={t("onboarding:dwara.intentTitle")}>
                  {LIFE_PRIORITIES.map((p) => {
                    const on = data.lifePriorities.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="dw-chip"
                        data-on={on}
                        aria-pressed={on}
                        disabled={!on && data.lifePriorities.length >= MAX_PRIORITIES}
                        onClick={() => togglePriority(p.id)}
                      >
                        <StarGlyph className="dw-chip-star" />
                        <span>{t(`pages:ui.onboardingPage.priority_${p.id}`, p.label)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="dw-count">{t("onboarding:selectedCount", { n: data.lifePriorities.length })}</p>
                <button
                  type="button"
                  className="dw-btn"
                  disabled={data.lifePriorities.length === 0}
                  onClick={() => void advance("tone", 0.5)}
                >
                  {t("onboarding:continueBtn")}
                </button>
              </>
            )}

            {step === "tone" && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>{t("onboarding:dwara.toneTitle")}</h1>
                <p className="dw-sub">{t("onboarding:dwara.toneSub")}</p>
                <div className="dw-options" role="radiogroup" aria-label={t("onboarding:dwara.toneTitle")}>
                  {GUIDANCE_STYLES.map((g) => {
                    const on = data.guidanceStyle === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className="dw-option"
                        data-on={on}
                        onClick={() => set("guidanceStyle", g.id)}
                      >
                        <span className="dw-option-name">{t(`pages:ui.onboardingPage.style_${g.id}`, g.label)}</span>
                        <span className="dw-option-desc">{t(`pages:ui.onboardingPage.styleDesc_${g.id}`, g.desc)}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="dw-btn" onClick={() => void cross()}>
                  {t("onboarding:dwara.cast")}
                </button>
              </>
            )}

            {step === "crossing" && !crossFailed && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>{t("onboarding:dwara.castingTitle")}</h1>
                <p className="dw-sub">{t("onboarding:dwara.castingSub")}</p>
                <Loader2 className="dw-spinner" aria-hidden />
              </>
            )}

            {step === "crossing" && crossFailed && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>{t("onboarding:dwara.castFailedTitle")}</h1>
                <p className="dw-sub" role="alert">{t("onboarding:dwara.castFailedSub")}</p>
                <button type="button" className="dw-btn" onClick={() => void cross()}>
                  {t("onboarding:dwara.retry")}
                </button>
              </>
            )}

            {step === "arrival" && (
              <>
                <h1 className="dw-h1" tabIndex={-1}>
                  {t(castable ? "onboarding:dwara.arrivalTitle" : "onboarding:dwara.arrivalTitleSkipped", { name: data.name.trim() })}
                </h1>
                <p className="dw-sub">
                  {t(castable ? "onboarding:dwara.arrivalSub" : "onboarding:dwara.arrivalSubSkipped")}
                </p>
                <button type="button" className="dw-btn" onClick={onDone}>
                  {t("onboarding:dwara.reveal")}
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

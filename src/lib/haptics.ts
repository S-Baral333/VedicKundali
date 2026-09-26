/**
 * Haptic feedback for confirming an action the user took deliberately.
 *
 * `navigator.vibrate` exists on Android browsers and is absent on iOS Safari
 * and on desktop, so every call is a progressive enhancement — never the only
 * signal that something happened. It also needs a user gesture, so these are
 * only ever called from an event handler.
 *
 * Gated on prefers-reduced-motion: there is no media query for "no haptics",
 * and someone who has asked the interface to stop moving is the closest signal
 * we have to someone who does not want it buzzing either.
 */

const canVibrate = () =>
  typeof navigator !== "undefined" &&
  typeof navigator.vibrate === "function" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function vibrate(pattern: number | number[]) {
  if (!canVibrate()) return;
  // Safari throws on some patterns rather than returning false.
  try {
    navigator.vibrate(pattern);
  } catch {
    /* unsupported — the visual confirmation still runs */
  }
}

/** A task completed: two short beats, like a tick landing. */
export const hapticConfirm = () => vibrate([14, 38, 22]);

/** A state reversed: one soft beat, quieter than confirming. */
export const hapticUndo = () => vibrate(10);

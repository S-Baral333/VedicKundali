/** Follow-up question chips offered after an oracle answer, by mode.
 *  Displayed text is translated via `pages:ui.followUpChips.<mode>.<index>`. */
export const FOLLOW_UP_CHIPS_BY_MODE: Record<string, string[]> = {
  insight: ["Why is this so?", "What's the deeper karma?", "Which planet rules this?"],
  prediction: ["What's the exact timing?", "What signs to watch for?", "Any window to avoid?"],
  guidance: ["What practice helps?", "Any Vedic remedy?", "How do I align with this?"],
};

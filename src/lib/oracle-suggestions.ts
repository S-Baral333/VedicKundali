export interface SuggestedQuestion {
  short: string;
  full: string;
}

export const SUGGESTIONS_BY_CATEGORY: Record<string, SuggestedQuestion[]> = {
  general: [
    { short: "Career phase?", full: "Am I currently in a favorable career phase?" },
    { short: "Marriage soon?", full: "Is marriage likely within 2 years?" },
    { short: "Karmic lesson?", full: "What karmic lesson am I in right now?" },
    { short: "Financial growth?", full: "Will I experience financial growth this year?" },
    { short: "Health outlook?", full: "What does my health outlook look like?" },
  ],
  career: [
    { short: "Promotion timing?", full: "When is my next career promotion likely?" },
    { short: "Switch jobs?", full: "Is this a good time to switch jobs?" },
    { short: "Start business?", full: "Is this period favorable to start my own business?" },
    { short: "Best field?", full: "Which professional field suits my chart best?" },
    { short: "Recognition?", full: "When will I receive recognition for my work?" },
  ],
  relationships: [
    { short: "Marriage window?", full: "What is my most likely marriage window?" },
    { short: "Soulmate?", full: "What kind of partner is most compatible with me?" },
    { short: "Heal a rift?", full: "Will this current relationship rift heal?" },
    { short: "Children timing?", full: "When is childbirth most favorable for me?" },
    { short: "Past karma?", full: "What past-life karma shapes my relationships?" },
  ],
  finance: [
    { short: "Wealth peak?", full: "When will I reach my financial peak?" },
    { short: "Invest now?", full: "Is this a favorable period to invest aggressively?" },
    { short: "Property buy?", full: "Is now a good time to buy property?" },
    { short: "Debt clearance?", full: "When will I be free of debt?" },
    { short: "Hidden gains?", full: "Are there hidden financial gains coming?" },
  ],
  health: [
    { short: "Vitality dip?", full: "Is a vitality dip likely in the coming months?" },
    { short: "Chronic issue?", full: "What does my chart say about my chronic issue?" },
    { short: "Best routine?", full: "What daily routine best supports my chart?" },
    { short: "Mental peace?", full: "How can I cultivate mental peace right now?" },
    { short: "Surgery timing?", full: "Is this a safe period for elective surgery?" },
  ],
  spiritual: [
    { short: "Dharma path?", full: "What is my dharma in this lifetime?" },
    { short: "Sadhana?", full: "Which spiritual practice is best for my chart?" },
    { short: "Guru appears?", full: "When will my spiritual guide appear?" },
    { short: "Past life?", full: "What past life karma am I resolving now?" },
    { short: "Moksha mark?", full: "Are there moksha indicators in my chart?" },
  ],
};

export function getSuggestionsFor(category: string): SuggestedQuestion[] {
  return SUGGESTIONS_BY_CATEGORY[category] ?? SUGGESTIONS_BY_CATEGORY.general;
}

export const FOLLOW_UP_CHIPS_BY_MODE: Record<string, string[]> = {
  insight: ["Why is this so?", "What's the deeper karma?", "Which planet rules this?"],
  prediction: ["What's the exact timing?", "What signs to watch for?", "Any window to avoid?"],
  guidance: ["What practice helps?", "Any Vedic remedy?", "How do I align with this?"],
};

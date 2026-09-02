// Shared language helpers for edge functions.
// Keep this list in sync with src/i18n/languages.ts.

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  ne: "Nepali (नेपाली)",
  mr: "Marathi (मराठी)",
  bn: "Bengali (বাংলা)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (తెలుగు)",
};

export const SUPPORTED_LANGUAGE_CODES = Object.keys(LANGUAGE_NAMES);

export function normalizeLanguage(input: unknown): string {
  if (typeof input !== "string") return "en";
  const code = input.toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGE_CODES.includes(code) ? code : "en";
}

export function languageName(code: string): string {
  return LANGUAGE_NAMES[normalizeLanguage(code)] || "English";
}

/**
 * Returns a system-prompt fragment that instructs the model to reply in the
 * user's chosen language while preserving Sanskrit mantras and astrology terms.
 * Returns an empty string for English so we don't waste tokens.
 */
export function buildLanguageInstruction(code: string): string {
  const lang = normalizeLanguage(code);
  if (lang === "en") return "";
  const name = languageName(lang);
  return `

LANGUAGE — MANDATORY:
Respond entirely in ${name}. Every narrative field, heading, and explanation must be written in ${name}.
- Keep Sanskrit mantras (beej and longer mantras) in their original Devanagari script — never transliterate or translate them.
- Keep canonical astrology terms (planet names like Surya/Chandra/Mangal, sign names like Mesha/Vrishabha, nakshatras, dashas, yogas) in their Sanskrit/IAST form, then add a short gloss in ${name} on first use.
- All other prose — greetings, guidance, action items, emotional forecast, narrative — must be in natural, flowing ${name}.
- Do NOT mix English sentences into the narrative. If a JSON field expects a sentence, that sentence must be in ${name}.`;
}

export interface LanguageDef {
  code: string;
  /** English name */
  name: string;
  /** Name in its own script */
  nativeName: string;
  /** Script glyph used as a visual chip */
  glyph: string;
  /** font-family stack hint for body text in this language */
  fontFamily?: string;
}

export const LANGUAGES: LanguageDef[] = [
  { code: "en", name: "English",  nativeName: "English",       glyph: "A" },
  { code: "hi", name: "Hindi",    nativeName: "हिन्दी",         glyph: "अ", fontFamily: "'Noto Sans Devanagari', 'Jost', sans-serif" },
  { code: "ne", name: "Nepali",   nativeName: "नेपाली",         glyph: "न", fontFamily: "'Noto Sans Devanagari', 'Jost', sans-serif" },
  { code: "mr", name: "Marathi",  nativeName: "मराठी",          glyph: "म", fontFamily: "'Noto Sans Devanagari', 'Jost', sans-serif" },
  { code: "bn", name: "Bengali",  nativeName: "বাংলা",         glyph: "অ", fontFamily: "'Noto Sans Bengali', 'Jost', sans-serif" },
  { code: "ta", name: "Tamil",    nativeName: "தமிழ்",          glyph: "அ", fontFamily: "'Noto Sans Tamil', 'Jost', sans-serif" },
  { code: "te", name: "Telugu",   nativeName: "తెలుగు",         glyph: "అ", fontFamily: "'Noto Sans Telugu', 'Jost', sans-serif" },
];

export const DEFAULT_LANGUAGE = "en";
export const SUPPORTED_CODES = LANGUAGES.map((l) => l.code);
export const LANGUAGE_STORAGE_KEY = "kundali.lang";

export function getLanguageDef(code: string | null | undefined): LanguageDef {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

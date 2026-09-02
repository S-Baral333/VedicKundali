import i18n from "@/i18n/config";
import { LANGUAGE_STORAGE_KEY, SUPPORTED_CODES, DEFAULT_LANGUAGE } from "@/i18n/languages";

/**
 * Returns the user's currently active UI language code (e.g. "en", "hi").
 * Falls back to localStorage and finally to the default — used when injecting
 * the `language` field into every edge-function invocation so AI replies in
 * the user's chosen tongue.
 */
export function getCurrentLanguage(): string {
  const fromI18n = (i18n.language || "").toLowerCase().split("-")[0];
  if (SUPPORTED_CODES.includes(fromI18n)) return fromI18n;
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_CODES.includes(stored)) return stored;
  } catch { /* SSR / privacy modes */ }
  return DEFAULT_LANGUAGE;
}

/** Convenience: merges `language` into a body object for supabase.functions.invoke. */
export function withLanguage<T extends Record<string, unknown>>(body: T): T & { language: string } {
  return { ...body, language: getCurrentLanguage() };
}

---
name: i18n language system (multi-language UI + AI)
description: Multi-language support — UI keys, language-aware AI prompts, per-language daily_horoscopes cache key, MantraInfo Sanskrit-preserving popover. Supports en/hi/ne/mr/bn/ta/te.
type: feature
---

# i18n Language System

Seven languages: English (en), Hindi (hi), Nepali (ne), Marathi (mr), Bengali (bn), Tamil (ta), Telugu (te).

## Frontend
- `src/i18n/config.ts` — registers `common, nav, profile, onboarding, pages, mantras` namespaces. EN inlined; others fetched from `/public/locales/{lng}/{ns}.json` via i18next-http-backend.
- `src/i18n/languages.ts` — supported codes + script-aware font map.
- `src/hooks/useLanguage.ts` — syncs `profiles.language` with localStorage.
- `src/components/LanguageSelector.tsx` — picker (used in Onboarding step 0 and Profile).
- `src/components/MantraInfo.tsx` — wraps Sanskrit mantra text + ⓘ popover showing meaning from the `mantras` namespace (Phase 2 will populate the dictionary).
- `src/lib/i18nClient.ts` — `getCurrentLanguage()` + `withLanguage(body)` helpers; **every edge-function invocation that produces narrative content must include the user's language**.

## Backend
- `supabase/functions/_shared/languages.ts` — `LANGUAGE_NAMES`, `normalizeLanguage`, `buildLanguageInstruction`. The instruction tells the model to reply entirely in the chosen language, **keep Sanskrit mantras in Devanagari**, and keep canonical astrology terms (Surya/Mesha/nakshatras/dashas) in Sanskrit/IAST with a gloss on first use.
- Wired into: `generate-horoscope`, `interpret-dream`, `generate-decision` (both job path and SSE stream path), `generate-remedies`. Other functions (`generate-timeline`, `generate-muhurta`, `generate-compatibility`, `generate-varshaphal`, `generate-predictions`, `generate-reading`, `generate-onboarding-insight`) accept the `language` param from the client; appending `buildLanguageInstruction()` to their system prompts is a quick follow-up.

## Database
- `profiles.language text NOT NULL DEFAULT 'en'`
- `daily_horoscopes.language text NOT NULL DEFAULT 'en'` + unique index `(sign_type, sign_name, period, valid_date, mode, language)` — each language gets its own cached reading.

## Rules
- Sanskrit mantras NEVER translate — always Devanagari, with ⓘ icon for meaning.
- Astrology technical terms stay in Sanskrit/IAST; only prose translates.
- Language updates write to `profiles.language` AND localStorage (`kundali.lang`).

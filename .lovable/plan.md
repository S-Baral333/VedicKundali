
# Language Functionality — Current Status & Closing the Gaps

## What's working today

**Frontend → Backend (language is sent):**
- Daily Horoscope (`DailyHoroscopePage`, `UserDashboard` prefetch)
- Oracle (`AskOraclePage`)
- Dream Interpretation (`DreamInterpretationPage`)
- Remedies (`PrescriptionRemedies`)
- Timeline (`TimelinePage`)
- Muhurta (`MuhurtaPage`)
- Predictions (`UpcomingEventsPanel`)
- Varshaphal (`VarshaphalCard`)

**Backend → AI (language instruction is injected into the system prompt):**
- `generate-horoscope` ✅
- `interpret-dream` ✅
- `generate-decision` (Oracle, both job + SSE paths) ✅
- `generate-remedies` ✅

**Infra that's solid:**
- 7 languages registered (`en, hi, ne, mr, bn, ta, te`) with script-aware fonts.
- `profiles.language` + `daily_horoscopes.language` columns + per-language cache key.
- `useLanguage` reconciles browser ↔ profile.
- `MantraInfo` preserves Sanskrit and exposes ⓘ glosses.
- Locale JSONs exist for every language across `common/nav/profile/onboarding/pages/mantras`.

## What's NOT working / inconsistent

### A. Backend functions that receive `language` but ignore it in the prompt
These currently still respond in English even when the user picked Hindi/Tamil/etc.:
1. `generate-timeline`
2. `generate-muhurta`
3. `generate-compatibility`
4. `generate-varshaphal`
5. `generate-predictions` (and `compute-predictions` synth)
6. `generate-reading`
7. `generate-onboarding-insight`
8. `generate-preview` (pre-auth Oracle/Horoscope/Dream/Chart demos on the landing page)

Fix per file: import `normalizeLanguage` + `buildLanguageInstruction` from `_shared/languages.ts`, normalize the incoming `language`, append `buildLanguageInstruction(language)` to the system prompt (right after the Guru block when Guru is on).

### B. Frontend surfaces that don't pass `language` at all
1. `CompatibilityPage` — its `generate-compatibility` invoke has no `language` field. Wrap the body in `withLanguage(...)`.
2. Landing-page previews (`OraclePreview`, `HoroscopePreview`, `DreamPreview`, `ChartPreview`) — pre-auth users have a language in localStorage but it's never forwarded. Wrap each body in `withLanguage(...)`.

### C. Locale coverage gaps in UI
- `pages` namespace exists for every language file, but most non-EN translations are still placeholder/partial (need a spot-check). Many user-visible strings in pages (e.g. error toasts, button labels inside Oracle/Dream/Compatibility) are still hard-coded English literals — they bypass i18n entirely.
- `nav` namespace looks complete for the 7 languages.
- `mantras` namespace is intentionally empty; the ⓘ popover shows "Meaning coming soon" — confirm that's acceptable for v1.

### D. Cache-key consistency
- `daily_horoscopes` cache key includes `language` ✅
- Per-user readings (oracle_readings, dream_interpretations, predicted_events, compatibility_reports, etc.) do NOT stamp `language`. If a user switches language, they'll see their old reading in the previous language with no regeneration. Add `language` column + include it when reading the latest cached row (or invalidate on language change in `useLanguage.setLanguage`).

## Plan

### Step 1 — Backend prompt instruction (the highest-impact fix)
Add `buildLanguageInstruction(language)` to the system prompt in these edge functions:
`generate-timeline`, `generate-muhurta`, `generate-compatibility`, `generate-varshaphal`, `generate-predictions`, `generate-reading`, `generate-onboarding-insight`, `generate-preview`.

Pattern (matches what `generate-remedies` already does):
```ts
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";
const language = normalizeLanguage(body?.language);
const systemPrompt = `${baseSystem}${buildLanguageInstruction(language)}`;
```

### Step 2 — Frontend: forward `language` from missing surfaces
- `src/pages/CompatibilityPage.tsx`: wrap invoke body in `withLanguage(...)`.
- `src/pages/preview/*.tsx` (4 files): wrap invoke bodies in `withLanguage(...)`.

### Step 3 — Per-user cache stamping (optional but recommended)
Add `language text NOT NULL DEFAULT 'en'` to: `oracle_readings`, `dream_interpretations`, `compatibility_reports`, `predicted_events`. Update each function to write and read by language.

Lighter alternative (no migration): in `useLanguage.setLanguage`, after the profile update, broadcast an event so the relevant pages re-fetch / regenerate next mount.

### Step 4 — UI string sweep (separate pass)
Audit `AskOraclePage`, `DreamInterpretationPage`, `CompatibilityPage`, `RemediesPage`, `TimelinePage`, `MuhurtaPage`, `BirthChartPage` for hard-coded English literals and move them under the `pages` namespace, then fill in the 6 non-EN locale files. This is the largest chunk of work; recommend doing it after Steps 1–2 verify the AI side speaks correctly.

### Step 5 — Smoke test
With profile language = `hi`, exercise: horoscope, oracle, dream, remedies, timeline, muhurta, compatibility, predictions, varshaphal, onboarding insight, and the 4 landing previews. Confirm the narrative comes back in Devanagari with mantras preserved.

## Out of scope
- No changes to mantra dictionary content (Phase 2 work).
- No new languages.
- No changes to the Rishi Guru protocol itself.

## Recommended order
1. Steps 1 + 2 together — one focused build pass, immediately makes 8 surfaces multilingual.
2. Step 3 cache stamping — short follow-up if you want instant language switch on saved readings.
3. Step 4 UI string sweep — separate dedicated session, mostly translation work.

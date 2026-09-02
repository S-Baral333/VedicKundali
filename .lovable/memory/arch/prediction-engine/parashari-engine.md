---
name: Parashari Prediction Engine
description: Three-layer prediction core (astronomy → rules → AI narrator) producing dated, ranked life-event predictions
type: feature
---

The prediction engine is **rules-first**, NOT AI-first. AI is a narrator only.

## Architecture

1. **Layer 1 — Astronomy** (`supabase/functions/_shared/prediction-engine/ephemeris.ts`)
   Sidereal Lahiri sampling, slow-planet ingress detection, transit-to-natal aspect scanning.

2. **Layer 2 — Rules** (`supabase/functions/_shared/prediction-engine/synthesize.ts`)
   Combines: Vimshottari Antar/Pratyantar windows, Gochara ingresses + applying aspects,
   Ashtakavarga SAV filter (≥30 bindu boosts, <25 dampens), divisional reinforcement
   (D10 career, D9 marriage, D7 children, D6 health), Yoga activation in active mahadasha,
   Sade Sati phase detection. Outputs ranked `PredictedEvent[]` with confidence 0-100.

3. **Layer 3 — AI Narrator** (`generate-predictions`)
   Receives ONLY the verified trigger list. Must cite trigger detail verbatim. Cannot invent
   events, dates, or confidences. JSON-mode response.

## Cache table
`public.predicted_events` (RLS owner-only). Auto-recomputed when missing or >7 days stale.

## Edge functions
- `compute-predictions` — deterministic, no AI, populates cache. Idempotent. Picks primary
  chart when `chart_id` omitted.
- `generate-predictions` — reads cache, runs AI narration, writes narration back per event.

## UI surface
- `src/components/predictions/UpcomingEventsPanel.tsx` shown atop `TimelinePage`.
- Each card: life-area icon, dated window, confidence bar, AI narration, expandable
  "Why this prediction" trigger list.

## Confidence formula (tunable)
Dasha 30 + Transit·(bindu/8)·30 + Varga 20 + Yoga 20, capped 95.

## Why this exists
Previous engine fed raw chart_data to AI which averaged everything into bland prose.
Now the AI only narrates pre-verified, dated triggers — eliminating "every day feels the same".

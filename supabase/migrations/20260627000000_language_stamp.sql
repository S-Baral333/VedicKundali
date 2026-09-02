-- Add language column to per-user reading tables so language switches force regeneration.

ALTER TABLE oracle_readings
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

ALTER TABLE dream_interpretations
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

ALTER TABLE compatibility_reports
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

ALTER TABLE predicted_events
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Index on predicted_events so the cache lookup (chart_id + language) is fast.
CREATE INDEX IF NOT EXISTS predicted_events_chart_language_idx
  ON predicted_events (chart_id, language);

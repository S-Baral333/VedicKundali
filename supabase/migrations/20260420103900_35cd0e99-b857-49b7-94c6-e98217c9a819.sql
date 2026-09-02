ALTER TABLE public.birth_charts
  ADD COLUMN IF NOT EXISTS calendar_system text NOT NULL DEFAULT 'gregorian',
  ADD COLUMN IF NOT EXISTS bs_date text;

ALTER TABLE public.birth_charts
  ADD CONSTRAINT birth_charts_calendar_system_check
  CHECK (calendar_system IN ('gregorian', 'bs'));
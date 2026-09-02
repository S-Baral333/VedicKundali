ALTER TABLE public.daily_horoscopes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS daily_horoscopes_lookup_idx
  ON public.daily_horoscopes (sign_name, period, valid_date);
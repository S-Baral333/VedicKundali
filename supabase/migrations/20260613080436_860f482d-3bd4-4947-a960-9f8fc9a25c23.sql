-- Add language column to profiles (user preference)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Add language column to daily_horoscopes cache
ALTER TABLE public.daily_horoscopes
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Drop old uniqueness on (sign_type, sign_name, period, valid_date, mode) if present
ALTER TABLE public.daily_horoscopes
  DROP CONSTRAINT IF EXISTS daily_horoscopes_sign_period_date_mode_key;
DROP INDEX IF EXISTS public.idx_daily_horoscopes_unique;

-- New language-aware uniqueness so every language gets its own cache row
CREATE UNIQUE INDEX IF NOT EXISTS daily_horoscopes_sign_period_date_mode_lang_key
  ON public.daily_horoscopes (sign_type, sign_name, period, valid_date, mode, language);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';
ALTER TABLE public.daily_horoscopes ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

ALTER TABLE public.daily_horoscopes
  DROP CONSTRAINT IF EXISTS daily_horoscopes_sign_period_date_mode_key;
DROP INDEX IF EXISTS public.idx_daily_horoscopes_unique;

ALTER TABLE public.daily_horoscopes
  ADD CONSTRAINT daily_horoscopes_sign_period_date_mode_lang_key
  UNIQUE (sign_type, sign_name, period, valid_date, mode, language);
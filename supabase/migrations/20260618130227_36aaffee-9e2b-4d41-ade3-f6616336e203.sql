ALTER TABLE public.daily_horoscopes
  ADD COLUMN IF NOT EXISTS voice text NOT NULL DEFAULT 'default';

ALTER TABLE public.daily_horoscopes
  DROP CONSTRAINT IF EXISTS daily_horoscopes_sign_period_date_mode_lang_key;

ALTER TABLE public.daily_horoscopes
  ADD CONSTRAINT daily_horoscopes_sign_period_date_mode_lang_voice_key
  UNIQUE (sign_type, sign_name, period, valid_date, mode, language, voice);
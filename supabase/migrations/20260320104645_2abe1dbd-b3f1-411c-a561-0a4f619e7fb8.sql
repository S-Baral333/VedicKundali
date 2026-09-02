-- Drop restrictive CHECK constraints that block valid inserts
ALTER TABLE public.daily_horoscopes DROP CONSTRAINT daily_horoscopes_period_check;
ALTER TABLE public.daily_horoscopes DROP CONSTRAINT daily_horoscopes_sign_type_check;

-- Add updated constraints matching actual app usage
ALTER TABLE public.daily_horoscopes ADD CONSTRAINT daily_horoscopes_period_check
  CHECK (period IN ('daily', 'tomorrow', 'weekly', 'monthly', 'yearly'));

ALTER TABLE public.daily_horoscopes ADD CONSTRAINT daily_horoscopes_sign_type_check
  CHECK (sign_type IN ('moon', 'general'));
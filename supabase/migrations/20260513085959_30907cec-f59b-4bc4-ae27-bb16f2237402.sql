ALTER TABLE public.daily_horoscopes
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'standard';

-- Drop the old unique constraint and recreate including mode
DO $$
DECLARE c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.daily_horoscopes'::regclass
    AND contype = 'u';
  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.daily_horoscopes DROP CONSTRAINT %I', c_name);
  END IF;
END$$;

ALTER TABLE public.daily_horoscopes
  ADD CONSTRAINT daily_horoscopes_sign_period_date_mode_key
  UNIQUE (sign_type, sign_name, period, valid_date, mode);
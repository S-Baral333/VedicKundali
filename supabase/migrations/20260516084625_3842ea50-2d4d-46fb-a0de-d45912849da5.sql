-- Phase A: Sanskrit-tier subscription system migration

-- Drop ANY existing tier check constraints by name pattern
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%subscription_tier%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 1. Ensure subscription_tier column exists (fresh DB may not have it yet)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'darshana';

-- Backup current tier into legacy_tier
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legacy_tier text;

UPDATE public.profiles
  SET legacy_tier = subscription_tier
  WHERE legacy_tier IS NULL;

-- Remap existing values
UPDATE public.profiles
  SET subscription_tier = CASE subscription_tier
    WHEN 'free'    THEN 'darshana'
    WHEN 'premium' THEN 'sadhaka'
    WHEN 'elite'   THEN 'jyotisha'
    ELSE subscription_tier
  END
  WHERE subscription_tier IN ('free','premium','elite');

ALTER TABLE public.profiles
  ALTER COLUMN subscription_tier SET DEFAULT 'darshana';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('darshana','sadhaka','grihastha','jyotisha'));

-- 2. Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'darshana'
    CHECK (tier IN ('darshana','sadhaka','grihastha','jyotisha')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','trialing','past_due','cancelled','paused','expired')),
  billing_interval text CHECK (billing_interval IN ('monthly','annual')),
  currency text NOT NULL DEFAULT 'AUD',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  cancelled_at timestamptz,
  provider text NOT NULL DEFAULT 'stripe',
  provider_subscription_id text,
  provider_customer_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subscriptions (user_id, tier, status)
SELECT user_id, subscription_tier, 'active'
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 3. Usage counters
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource text NOT NULL,
  period_start date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource, period_start)
);

CREATE INDEX IF NOT EXISTS usage_counters_user_period_idx
  ON public.usage_counters (user_id, period_start);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_counters;
CREATE POLICY "Users can view own usage"
  ON public.usage_counters FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_counters;
CREATE POLICY "Users can insert own usage"
  ON public.usage_counters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_counters;
CREATE POLICY "Users can update own usage"
  ON public.usage_counters FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all usage" ON public.usage_counters;
CREATE POLICY "Admins can manage all usage"
  ON public.usage_counters FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_usage_counters_updated_at ON public.usage_counters;
CREATE TRIGGER trg_usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Helper function: increment usage counter atomically
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_resource text,
  p_period_start date DEFAULT date_trunc('month', now())::date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.usage_counters (user_id, resource, period_start, count)
  VALUES (v_user_id, p_resource, p_period_start, 1)
  ON CONFLICT (user_id, resource, period_start)
  DO UPDATE SET count = usage_counters.count + 1, updated_at = now()
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

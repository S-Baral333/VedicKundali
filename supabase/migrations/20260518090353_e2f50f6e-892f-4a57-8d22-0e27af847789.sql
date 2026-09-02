-- Resilient user creation: harden handle_new_user, add error log, RPC self-heal, integrity view, backfill orphans

-- 1. Unique index needed for ON CONFLICT (user_id) on profiles
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles(user_id);

-- 2. Error log table (admin-only)
CREATE TABLE IF NOT EXISTS public.auth_trigger_errors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid,
  error_message text,
  error_detail  text,
  resolved      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_trigger_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage auth trigger errors" ON public.auth_trigger_errors;
CREATE POLICY "Admins manage auth trigger errors"
  ON public.auth_trigger_errors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Resilient handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (user_id, subscription_tier)
    VALUES (NEW.id, 'darshana')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.auth_trigger_errors (user_id, error_message, error_detail)
    VALUES (NEW.id, 'profiles insert: ' || SQLERRM, SQLSTATE);
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.auth_trigger_errors (user_id, error_message, error_detail)
    VALUES (NEW.id, 'user_roles insert: ' || SQLERRM, SQLSTATE);
  END;

  BEGIN
    INSERT INTO public.subscriptions (user_id, tier, status, currency, provider)
    VALUES (NEW.id, 'darshana', 'active', 'AUD', 'system')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.auth_trigger_errors (user_id, error_message, error_detail)
    VALUES (NEW.id, 'subscriptions insert: ' || SQLERRM, SQLSTATE);
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ensure_user_profile RPC — client-side safety net (uses auth.uid())
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_created boolean := false;
  v_role_created boolean := false;
  v_subscription_created boolean := false;
  v_rows integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.profiles (user_id, subscription_tier)
  VALUES (v_user_id, 'darshana')
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_profile_created := v_rows > 0;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_role_created := v_rows > 0;

  INSERT INTO public.subscriptions (user_id, tier, status, currency, provider)
  VALUES (v_user_id, 'darshana', 'active', 'AUD', 'system')
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_subscription_created := v_rows > 0;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'profile_created', v_profile_created,
    'role_created', v_role_created,
    'subscription_created', v_subscription_created
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- 5. account_integrity view (admin-only via underlying RLS on auth.users access)
CREATE OR REPLACE VIEW public.account_integrity
WITH (security_invoker = true) AS
SELECT
  u.id AS user_id,
  u.email,
  u.created_at AS auth_created_at,
  (p.id IS NOT NULL) AS has_profile,
  (r.user_id IS NOT NULL) AS has_role,
  (s.user_id IS NOT NULL) AS has_subscription,
  s.tier,
  (p.id IS NULL OR r.user_id IS NULL OR s.user_id IS NULL) AS is_orphaned
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_roles r ON r.user_id = u.id
LEFT JOIN public.subscriptions s ON s.user_id = u.id;

-- 6. Backfill existing orphans
DO $$
DECLARE orphan record;
BEGIN
  FOR orphan IN
    SELECT u.id FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    LEFT JOIN public.user_roles r ON r.user_id = u.id
    LEFT JOIN public.subscriptions s ON s.user_id = u.id
    WHERE p.id IS NULL OR r.user_id IS NULL OR s.user_id IS NULL
  LOOP
    INSERT INTO public.profiles (user_id, subscription_tier)
    VALUES (orphan.id, 'darshana') ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (orphan.id, 'user') ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.subscriptions (user_id, tier, status, currency, provider)
    VALUES (orphan.id, 'darshana', 'active', 'AUD', 'system')
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;
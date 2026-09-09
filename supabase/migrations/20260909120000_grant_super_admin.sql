-- Grant the super-admin role to the project owner.
--
-- The `admin` role in public.user_roles is the single source of truth for
-- super-admin access: it unlocks the /admin panel, and both the client
-- (useSubscription) and the edge functions treat it as bypassing every
-- subscription tier gate and usage quota.
--
-- Idempotent: safe to re-run. No-op if the account has not signed up yet, in
-- which case re-run this after the account is created.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'iustimalsina37@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

DO $$
DECLARE
  granted integer;
BEGIN
  SELECT count(*) INTO granted
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE lower(u.email) = 'iustimalsina37@gmail.com'
    AND ur.role = 'admin'::public.app_role;

  IF granted = 0 THEN
    RAISE WARNING 'No auth.users row for iustimalsina37@gmail.com — admin role NOT granted. Re-run this migration after that account signs up.';
  ELSE
    RAISE NOTICE 'Super-admin role present for iustimalsina37@gmail.com.';
  END IF;
END $$;

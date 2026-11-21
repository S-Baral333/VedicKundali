-- Superadmin role, admin audit log, and the server-only helpers behind the
-- `admin-users` edge function.
--
-- Roles:
--   admin       content, analytics, appearance, AI engine, read-only user list
--   superadmin  everything an admin can do, plus user management and the
--               audit log
--
-- has_role(uid, 'admin') now also answers true for a superadmin, so every
-- existing "Admins can …" policy keeps working without being rewritten.
--
-- Every user-management write goes through the `admin-users` edge function
-- (service role). The functions below are executable by service_role only;
-- the browser can never call them.

-- 1. Role hierarchy: superadmin satisfies an 'admin' check.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin'::public.app_role AND role = 'superadmin'::public.app_role)
      )
  )
$$;

-- 2. Never leave the app without a superadmin.
--    Fires on role revokes and on the cascade from deleting an auth user.
CREATE OR REPLACE FUNCTION public.guard_last_superadmin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'superadmin'::public.app_role
     AND (TG_OP = 'DELETE' OR NEW.role IS DISTINCT FROM OLD.role)
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE role = 'superadmin'::public.app_role
         AND id <> OLD.id
     )
  THEN
    RAISE EXCEPTION 'cannot remove the last superadmin'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_last_superadmin ON public.user_roles;
CREATE TRIGGER trg_guard_last_superadmin
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_superadmin();

REVOKE EXECUTE ON FUNCTION public.guard_last_superadmin() FROM PUBLIC, anon, authenticated;

-- 3. Admin audit log — append-only.
--    No foreign keys: entries must outlive the users they describe.
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_user_id uuid,
  target_email text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx
  ON public.admin_audit_log (target_user_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins can read the audit log" ON public.admin_audit_log;
CREATE POLICY "Superadmins can read the audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'::public.app_role));

-- No insert/update/delete policy: only the service role writes, and even it
-- cannot rewrite history (trigger below).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.admin_audit_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_audit_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_audit_log_append_only ON public.admin_audit_log;
CREATE TRIGGER trg_admin_audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.admin_audit_log_append_only();

REVOKE EXECUTE ON FUNCTION public.admin_audit_log_append_only() FROM PUBLIC, anon, authenticated;

-- 4. User list with search (email or name), joined with plan and roles.
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  is_active boolean,
  tier text,
  subscription_status text,
  subscription_provider text,
  roles text[],
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT NULLIF(btrim(COALESCE(p_search, '')), '') AS term
  )
  SELECT
    u.id,
    u.email::text,
    COALESCE(p.full_name, u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    u.raw_user_meta_data ->> 'avatar_url',
    u.created_at,
    u.last_sign_in_at,
    u.banned_until,
    COALESCE(p.is_active, true),
    COALESCE(s.tier, p.subscription_tier, 'darshana'),
    s.status,
    s.provider,
    COALESCE(
      (SELECT array_agg(r.role::text ORDER BY r.role::text)
         FROM public.user_roles r WHERE r.user_id = u.id),
      ARRAY[]::text[]
    ),
    count(*) OVER ()
  FROM auth.users u
  CROSS JOIN q
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  WHERE q.term IS NULL
     OR u.email ILIKE '%' || q.term || '%'
     OR p.full_name ILIKE '%' || q.term || '%'
     OR u.id::text = q.term
  ORDER BY u.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, integer, integer) TO service_role;

-- 5. Sign a user out everywhere: drop their sessions (refresh tokens go with
--    them). Access tokens already issued stay valid until they expire.
CREATE OR REPLACE FUNCTION public.admin_revoke_sessions(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_revoke_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_sessions(uuid) TO service_role;

-- 6. Remove a deleted user's rows from tables that have a user_id but no
--    cascading foreign key (subscriptions, usage_counters, …). Discovers the
--    tables at run time so a future table is not forgotten. The audit log is
--    deliberately kept.
CREATE OR REPLACE FUNCTION public.admin_purge_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  n integer;
  result jsonb := '{}'::jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'user_id'
      AND c.data_type = 'uuid'
      AND tb.table_type = 'BASE TABLE'
      AND c.table_name <> 'admin_audit_log'
    ORDER BY c.table_name
  LOOP
    EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', t.table_name)
      USING p_user_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      result := result || jsonb_build_object(t.table_name, n);
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_purge_user_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_purge_user_data(uuid) TO service_role;

-- 7. Profiles can only be deleted by deleting the account (edge function).
--    A bare profile delete left the auth user behind and was recreated at the
--    next sign-in.
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- 8. Make the project owner a superadmin (keeps their admin row too).
--    Idempotent. No-op, with a warning, if the account has not signed up yet.
INSERT INTO public.user_roles (user_id, role)
SELECT id, r.role
FROM auth.users
CROSS JOIN (VALUES ('admin'::public.app_role), ('superadmin'::public.app_role)) AS r(role)
WHERE lower(email) = 'iustimalsina37@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    WHERE lower(u.email) = 'iustimalsina37@gmail.com'
      AND ur.role = 'superadmin'::public.app_role
  ) THEN
    RAISE WARNING 'No auth.users row for iustimalsina37@gmail.com — superadmin NOT granted. Sign in once, then re-run section 8 of this migration.';
  END IF;
END $$;

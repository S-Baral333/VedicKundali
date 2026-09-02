-- Lock down EXECUTE on SECURITY DEFINER functions in public schema.
-- Revoke broad PUBLIC access; re-grant narrowly to the roles that actually call them.

-- User-callable (via PostgREST RPC or policy expressions)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.ensure_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.increment_usage(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_usage(text, date) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.publish_prompt_layer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_prompt_layer(uuid) TO authenticated, service_role;

-- Trigger-only functions: never called via API, restrict to service_role
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.ensure_primary_on_insert() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_primary_on_insert() TO service_role;

REVOKE EXECUTE ON FUNCTION public.enforce_single_primary_chart() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_single_primary_chart() TO service_role;

REVOKE EXECUTE ON FUNCTION public.promote_after_primary_delete() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_after_primary_delete() TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_appearance_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_appearance_version() TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

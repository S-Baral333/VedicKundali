-- Revoke from anon + authenticated explicitly (default privileges granted these)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_user_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_usage(text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_prompt_layer(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_primary_on_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_single_primary_chart() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_after_primary_delete() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_appearance_version() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

-- Also prevent future functions from auto-granting to anon/authenticated
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

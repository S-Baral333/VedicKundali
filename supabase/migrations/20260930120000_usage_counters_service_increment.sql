-- Metering fix: give the edge functions an atomic, service-role-callable way to
-- increment a usage counter.
--
-- public.increment_usage(text, date) resolves the caller from auth.uid(), so it
-- only works for a request carrying a user JWT. The Oracle and dream functions
-- record usage from a service-role client — generate-decision does it from a
-- background task started with EdgeRuntime.waitUntil, long after the request's
-- JWT has stopped being the right thing to trust — so auth.uid() is NULL there
-- and the existing function raises 'not authenticated'.
--
-- This variant takes the user id explicitly and is granted to service_role
-- only. Same upsert, so it stays atomic under concurrent requests: two
-- simultaneous readings cannot both read count=2 and both write 3.

CREATE OR REPLACE FUNCTION public.increment_usage_for(
  p_user_id uuid,
  p_resource text,
  p_period_start date DEFAULT date_trunc('month', now())::date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'increment_usage_for requires a user id';
  END IF;

  INSERT INTO public.usage_counters (user_id, resource, period_start, count)
  VALUES (p_user_id, p_resource, p_period_start, 1)
  ON CONFLICT (user_id, resource, period_start)
  DO UPDATE SET count = usage_counters.count + 1, updated_at = now()
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- Callable only by the service role: it takes the user id as an argument, so a
-- user-facing role holding EXECUTE could inflate or forge anyone's counters.
REVOKE EXECUTE ON FUNCTION public.increment_usage_for(uuid, text, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_usage_for(uuid, text, date) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage_for(uuid, text, date) TO service_role;

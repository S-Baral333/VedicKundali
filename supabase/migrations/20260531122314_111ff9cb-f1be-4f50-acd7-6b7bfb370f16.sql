CREATE TABLE public.oracle_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  mode TEXT NOT NULL DEFAULT 'insight',
  chart_id UUID NULL,
  previous_context JSONB NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  current_layer INTEGER NOT NULL DEFAULT 1,
  current_message TEXT NULL,
  result JSONB NULL,
  reading_id UUID NULL,
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

GRANT SELECT ON public.oracle_jobs TO authenticated;
GRANT ALL ON public.oracle_jobs TO service_role;

ALTER TABLE public.oracle_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all oracle jobs"
ON public.oracle_jobs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own oracle jobs"
ON public.oracle_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_oracle_jobs_user_created_at
ON public.oracle_jobs (user_id, created_at DESC);

CREATE TRIGGER update_oracle_jobs_updated_at
BEFORE UPDATE ON public.oracle_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
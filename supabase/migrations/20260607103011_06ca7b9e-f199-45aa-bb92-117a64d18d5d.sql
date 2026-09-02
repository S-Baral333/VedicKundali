
CREATE TABLE public.predicted_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chart_id UUID NOT NULL REFERENCES public.birth_charts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  life_area TEXT NOT NULL,
  headline TEXT NOT NULL,
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  narration TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_predicted_events_user_window ON public.predicted_events(user_id, window_start);
CREATE INDEX idx_predicted_events_chart ON public.predicted_events(chart_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.predicted_events TO authenticated;
GRANT ALL ON public.predicted_events TO service_role;

ALTER TABLE public.predicted_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own predicted events"
  ON public.predicted_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own predicted events"
  ON public.predicted_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own predicted events"
  ON public.predicted_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own predicted events"
  ON public.predicted_events FOR DELETE
  USING (auth.uid() = user_id);

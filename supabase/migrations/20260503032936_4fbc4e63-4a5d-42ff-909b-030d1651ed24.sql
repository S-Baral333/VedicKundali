ALTER TABLE public.dream_interpretations
  DROP CONSTRAINT IF EXISTS dream_interpretations_birth_chart_id_fkey;

ALTER TABLE public.dream_interpretations
  ADD CONSTRAINT dream_interpretations_birth_chart_id_fkey
  FOREIGN KEY (birth_chart_id)
  REFERENCES public.birth_charts(id)
  ON DELETE SET NULL;
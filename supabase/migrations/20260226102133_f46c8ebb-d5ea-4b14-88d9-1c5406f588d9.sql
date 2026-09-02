CREATE TABLE public.oracle_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oracle_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own readings" ON public.oracle_readings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own readings" ON public.oracle_readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own readings" ON public.oracle_readings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all readings" ON public.oracle_readings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_oracle_readings_user_id ON public.oracle_readings(user_id);
CREATE INDEX idx_oracle_readings_created_at ON public.oracle_readings(created_at DESC);
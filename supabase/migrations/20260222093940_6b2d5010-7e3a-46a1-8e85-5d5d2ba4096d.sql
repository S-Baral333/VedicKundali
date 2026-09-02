
-- Create dream_interpretations table
CREATE TABLE public.dream_interpretations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dream_description TEXT NOT NULL,
  dream_time TEXT NOT NULL,
  emotions TEXT,
  clarity TEXT NOT NULL DEFAULT 'vivid',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  is_lucid BOOLEAN NOT NULL DEFAULT false,
  life_context TEXT,
  birth_chart_id UUID REFERENCES public.birth_charts(id),
  extracted_symbols JSONB,
  interpretation TEXT,
  dream_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dream_interpretations ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own rows
CREATE POLICY "Users can view own dreams"
  ON public.dream_interpretations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own dreams"
  ON public.dream_interpretations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dreams"
  ON public.dream_interpretations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dreams"
  ON public.dream_interpretations FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage all dreams"
  ON public.dream_interpretations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

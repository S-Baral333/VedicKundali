
-- birth_charts table
CREATE TABLE public.birth_charts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  birth_time TIME NOT NULL,
  birthplace TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  chart_data JSONB,
  reading TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.birth_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own charts" ON public.birth_charts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own charts" ON public.birth_charts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own charts" ON public.birth_charts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own charts" ON public.birth_charts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all charts" ON public.birth_charts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_birth_charts_updated_at BEFORE UPDATE ON public.birth_charts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- daily_horoscopes table
CREATE TABLE public.daily_horoscopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sign_type TEXT NOT NULL CHECK (sign_type IN ('moon_sign', 'ascendant')),
  sign_name TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly')),
  content TEXT NOT NULL,
  valid_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_horoscopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read horoscopes" ON public.daily_horoscopes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage horoscopes" ON public.daily_horoscopes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Unique constraint to prevent duplicate horoscopes
CREATE UNIQUE INDEX idx_daily_horoscopes_unique ON public.daily_horoscopes (sign_type, sign_name, period, valid_date);

-- compatibility_reports table
CREATE TABLE public.compatibility_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chart_a_id UUID NOT NULL REFERENCES public.birth_charts(id) ON DELETE CASCADE,
  chart_b_id UUID NOT NULL REFERENCES public.birth_charts(id) ON DELETE CASCADE,
  score INTEGER,
  report TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.compatibility_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.compatibility_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reports" ON public.compatibility_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON public.compatibility_reports FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reports" ON public.compatibility_reports FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

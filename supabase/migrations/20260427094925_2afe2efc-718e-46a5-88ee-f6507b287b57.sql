CREATE TABLE public.horoscope_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  valid_date DATE NOT NULL,
  period TEXT NOT NULL DEFAULT 'daily',
  reaction TEXT,
  saved_quotes JSONB NOT NULL DEFAULT '[]'::jsonb,
  journal_entry TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, valid_date, period),
  CONSTRAINT valid_reaction CHECK (reaction IS NULL OR reaction IN ('resonated','sort_of','not_really'))
);

ALTER TABLE public.horoscope_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reactions" ON public.horoscope_reactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reactions" ON public.horoscope_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reactions" ON public.horoscope_reactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own reactions" ON public.horoscope_reactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all reactions" ON public.horoscope_reactions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_horoscope_reactions_updated_at
  BEFORE UPDATE ON public.horoscope_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_horoscope_reactions_user_date ON public.horoscope_reactions(user_id, valid_date DESC);
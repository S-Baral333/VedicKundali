-- Site Appearance Config: per-route background customization with versioning

CREATE TABLE public.site_appearance_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_pattern TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled',
  config JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived','preset')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only one published config per route
CREATE UNIQUE INDEX idx_appearance_one_published_per_route
  ON public.site_appearance_config (route_pattern)
  WHERE status = 'published';

CREATE INDEX idx_appearance_route_status ON public.site_appearance_config (route_pattern, status);
CREATE INDEX idx_appearance_status ON public.site_appearance_config (status);

-- Auto-version per route_pattern on insert
CREATE OR REPLACE FUNCTION public.set_appearance_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.version IS NULL OR NEW.version = 1 THEN
    SELECT COALESCE(MAX(version), 0) + 1
      INTO NEW.version
      FROM public.site_appearance_config
      WHERE route_pattern = NEW.route_pattern;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appearance_set_version
  BEFORE INSERT ON public.site_appearance_config
  FOR EACH ROW EXECUTE FUNCTION public.set_appearance_version();

-- updated_at trigger
CREATE TRIGGER trg_appearance_updated_at
  BEFORE UPDATE ON public.site_appearance_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.site_appearance_config ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can read published configs and presets so the site renders
CREATE POLICY "Anyone can read published configs"
  ON public.site_appearance_config
  FOR SELECT
  USING (status IN ('published','preset'));

-- Admins can read everything (drafts, archives)
CREATE POLICY "Admins can read all configs"
  ON public.site_appearance_config
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert configs"
  ON public.site_appearance_config
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update configs"
  ON public.site_appearance_config
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete configs"
  ON public.site_appearance_config
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));
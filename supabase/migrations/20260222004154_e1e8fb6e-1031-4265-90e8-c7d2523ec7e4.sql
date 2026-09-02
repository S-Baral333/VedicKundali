
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  date_of_birth DATE,
  birth_time TIME,
  birthplace TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Nakshatras table
CREATE TABLE public.nakshatras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE CHECK (number >= 1 AND number <= 27),
  name TEXT NOT NULL,
  sanskrit_name TEXT,
  ruling_planet TEXT,
  deity TEXT,
  symbol TEXT,
  traits TEXT,
  strengths TEXT,
  challenges TEXT,
  career TEXT,
  relationships TEXT,
  spiritual_path TEXT,
  degree_start DOUBLE PRECISION,
  degree_end DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nakshatras ENABLE ROW LEVEL SECURITY;

-- 6. Planet interpretations table
CREATE TABLE public.planet_interpretations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planet TEXT NOT NULL,
  house INTEGER,
  sign TEXT,
  interpretation TEXT NOT NULL,
  keywords TEXT,
  strength TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planet_interpretations ENABLE ROW LEVEL SECURITY;

-- 7. Remedies table
CREATE TABLE public.remedies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  planet TEXT,
  description TEXT NOT NULL,
  mantra TEXT,
  gemstone TEXT,
  ritual TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.remedies ENABLE ROW LEVEL SECURITY;

-- 8. Yogas table
CREATE TABLE public.yogas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sanskrit_name TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL,
  detection_rules TEXT,
  effects TEXT,
  remedies TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yogas ENABLE ROW LEVEL SECURITY;

-- 9. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nakshatras_updated_at BEFORE UPDATE ON public.nakshatras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_planet_interpretations_updated_at BEFORE UPDATE ON public.planet_interpretations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_remedies_updated_at BEFORE UPDATE ON public.remedies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_yogas_updated_at BEFORE UPDATE ON public.yogas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. RLS Policies

-- Profiles: users read own, admins read all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- User roles: only admins can manage
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Content tables: admins full CRUD, authenticated users read
CREATE POLICY "Anyone can read nakshatras" ON public.nakshatras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage nakshatras" ON public.nakshatras FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read planet_interpretations" ON public.planet_interpretations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage planet_interpretations" ON public.planet_interpretations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read remedies" ON public.remedies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage remedies" ON public.remedies FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read yogas" ON public.yogas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage yogas" ON public.yogas FOR ALL USING (public.has_role(auth.uid(), 'admin'));

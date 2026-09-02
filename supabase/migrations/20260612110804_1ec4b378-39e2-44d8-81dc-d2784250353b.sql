-- 1. user_roles: explicit admin-only write policies (defense in depth)
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. ai_prompt_layers: remove broad authenticated read; admins only (edge functions use service_role)
DROP POLICY IF EXISTS "Authenticated can read published layers" ON public.ai_prompt_layers;

-- 3. ai_persona_rules: remove broad authenticated read; admins only
DROP POLICY IF EXISTS "Authenticated can read active rules" ON public.ai_persona_rules;

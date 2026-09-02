
CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
ON public.user_notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
ON public.user_notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications" 
ON public.user_notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
ON public.user_notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" 
ON public.user_notifications FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

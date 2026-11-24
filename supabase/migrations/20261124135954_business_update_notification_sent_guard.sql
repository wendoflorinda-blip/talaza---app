CREATE TABLE IF NOT EXISTS public.business_update_notifications_sent (
  business_update_id uuid PRIMARY KEY REFERENCES public.business_updates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_update_notifications_sent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage business update notification sent markers" ON public.business_update_notifications_sent;
CREATE POLICY "Admins manage business update notification sent markers"
ON public.business_update_notifications_sent FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id=auth.uid()));

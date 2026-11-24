ALTER TABLE public.business_updates
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.business_updates
  DROP CONSTRAINT IF EXISTS business_updates_approval_status_check;
ALTER TABLE public.business_updates
  ADD CONSTRAINT business_updates_approval_status_check
  CHECK (approval_status IN ('pending','approved','rejected'));

UPDATE public.business_updates SET approval_status='approved' WHERE approval_status IS NULL;

DROP POLICY IF EXISTS "Owners manage own business updates" ON public.business_updates;
DROP POLICY IF EXISTS "Saved explorers read active business updates" ON public.business_updates;
DROP POLICY IF EXISTS "Owners read own business updates" ON public.business_updates;
DROP POLICY IF EXISTS "Owners submit pending business updates" ON public.business_updates;
DROP POLICY IF EXISTS "Owners edit pending business updates" ON public.business_updates;
DROP POLICY IF EXISTS "Owners delete pending business updates" ON public.business_updates;
DROP POLICY IF EXISTS "Admins read all business updates" ON public.business_updates;
DROP POLICY IF EXISTS "Admins review business updates" ON public.business_updates;
DROP POLICY IF EXISTS "Public read approved business updates" ON public.business_updates;

CREATE POLICY "Owners read own business updates"
ON public.business_updates FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_updates.business_id AND b.owner_id=auth.uid()));

CREATE POLICY "Owners submit pending business updates"
ON public.business_updates FOR INSERT TO authenticated
WITH CHECK (approval_status='pending' AND reviewed_at IS NULL AND reviewed_by IS NULL
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_updates.business_id AND b.owner_id=auth.uid()));

CREATE POLICY "Owners edit pending business updates"
ON public.business_updates FOR UPDATE TO authenticated
USING (approval_status='pending' AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_updates.business_id AND b.owner_id=auth.uid()))
WITH CHECK (approval_status='pending' AND reviewed_at IS NULL AND reviewed_by IS NULL
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_updates.business_id AND b.owner_id=auth.uid()));

CREATE POLICY "Owners delete pending business updates"
ON public.business_updates FOR DELETE TO authenticated
USING (approval_status='pending' AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_updates.business_id AND b.owner_id=auth.uid()));

CREATE POLICY "Admins read all business updates"
ON public.business_updates FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id=auth.uid()));

CREATE POLICY "Admins review business updates"
ON public.business_updates FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id=auth.uid()));

CREATE POLICY "Public read approved business updates"
ON public.business_updates FOR SELECT
USING (approval_status='approved' AND expires_at>now()
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_updates.business_id AND b.is_active=true AND b.approval_status='approved')
  AND private.talaza_business_has_current_hosting(business_id));

DROP POLICY IF EXISTS "Admins read pending business update media" ON storage.objects;
CREATE POLICY "Admins read pending business update media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='business-updates' AND EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id=auth.uid()));

DROP POLICY IF EXISTS "Public read approved business update media" ON storage.objects;
CREATE POLICY "Public read approved business update media"
ON storage.objects FOR SELECT
USING (bucket_id='business-updates' AND EXISTS (
  SELECT 1 FROM public.business_updates u JOIN public.businesses b ON b.id=u.business_id
  WHERE u.media_path=objects.name AND u.approval_status='approved' AND u.expires_at>now()
    AND b.is_active=true AND b.approval_status='approved'
    AND private.talaza_business_has_current_hosting(u.business_id)
));

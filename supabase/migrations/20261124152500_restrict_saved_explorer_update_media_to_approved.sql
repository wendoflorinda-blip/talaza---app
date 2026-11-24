DROP POLICY IF EXISTS "Saved explorers read private updates" ON storage.objects;
CREATE POLICY "Saved explorers read approved private updates"
ON storage.objects FOR SELECT
USING (
  bucket_id='business-updates'
  AND EXISTS (
    SELECT 1
    FROM public.business_updates u
    JOIN public.saved_businesses sb ON sb.business_id=u.business_id
    JOIN public.businesses b ON b.id=u.business_id
    WHERE u.media_path=objects.name
      AND sb.user_id=auth.uid()
      AND u.approval_status='approved'
      AND u.expires_at>now()
      AND b.is_active=true
      AND b.approval_status='approved'
      AND private.talaza_business_has_current_hosting(u.business_id)
  )
);

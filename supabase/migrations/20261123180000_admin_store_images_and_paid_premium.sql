-- Grant required table privileges for business_images, while RLS limits admin-store access.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_images TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.premium_promotions TO service_role;
DROP POLICY IF EXISTS admin_store_images_admin_select ON public.business_images;
CREATE POLICY admin_store_images_admin_select ON public.business_images FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.admin_stores a JOIN public.admin_users au ON au.id=a.owner_id WHERE a.business_id=business_images.business_id AND a.owner_id=auth.uid() AND a.account_type='admin_store'));
DROP POLICY IF EXISTS admin_store_images_admin_insert ON public.business_images;
CREATE POLICY admin_store_images_admin_insert ON public.business_images FOR INSERT TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM public.admin_stores a JOIN public.admin_users au ON au.id=a.owner_id WHERE a.business_id=business_images.business_id AND a.owner_id=auth.uid() AND a.account_type='admin_store'));
DROP POLICY IF EXISTS admin_store_images_admin_update ON public.business_images;
CREATE POLICY admin_store_images_admin_update ON public.business_images FOR UPDATE TO authenticated
USING (EXISTS(SELECT 1 FROM public.admin_stores a JOIN public.admin_users au ON au.id=a.owner_id WHERE a.business_id=business_images.business_id AND a.owner_id=auth.uid() AND a.account_type='admin_store'))
WITH CHECK (EXISTS(SELECT 1 FROM public.admin_stores a JOIN public.admin_users au ON au.id=a.owner_id WHERE a.business_id=business_images.business_id AND a.owner_id=auth.uid() AND a.account_type='admin_store'));
DROP POLICY IF EXISTS admin_store_images_admin_delete ON public.business_images;
CREATE POLICY admin_store_images_admin_delete ON public.business_images FOR DELETE TO authenticated
USING (EXISTS(SELECT 1 FROM public.admin_stores a JOIN public.admin_users au ON au.id=a.owner_id WHERE a.business_id=business_images.business_id AND a.owner_id=auth.uid() AND a.account_type='admin_store'));

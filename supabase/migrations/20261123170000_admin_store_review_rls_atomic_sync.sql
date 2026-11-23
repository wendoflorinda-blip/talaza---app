-- Admin store approval/rejection must sync businesses and admin_stores atomically.
DROP POLICY IF EXISTS admin_stores_admin_update ON public.admin_stores;
CREATE POLICY admin_stores_admin_update
ON public.admin_stores
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_review_store(p_business_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  business_rows integer;
  store_rows integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem rever lojas administrativas.';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Estado de revisão inválido.';
  END IF;
  UPDATE public.businesses SET approval_status = p_status, is_active = (p_status = 'approved') WHERE id = p_business_id;
  GET DIAGNOSTICS business_rows = ROW_COUNT;
  IF business_rows <> 1 THEN RAISE EXCEPTION 'Perfil de negócio não encontrado.'; END IF;
  UPDATE public.admin_stores
  SET hosting_status = CASE WHEN p_status = 'approved' THEN 'active' ELSE 'rejected' END,
      hosting_type = 'normal', is_lifetime = false, hosting_expires_at = NULL, updated_at = now()
  WHERE business_id = p_business_id;
  GET DIAGNOSTICS store_rows = ROW_COUNT;
  IF store_rows <> 1 THEN RAISE EXCEPTION 'Loja administrativa não encontrada.'; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_store(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_store(uuid, text) TO authenticated;

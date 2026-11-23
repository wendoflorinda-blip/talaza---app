CREATE OR REPLACE FUNCTION public.admin_approve_payment_and_activate_business(p_payment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
 v_payment public.payment_submissions%rowtype; v_business public.businesses%rowtype; v_plan public.plans%rowtype;
 v_subscription public.business_subscriptions%rowtype; v_now timestamptz:=now(); v_starts_at timestamptz;
 v_expires_at timestamptz; v_subscription_created boolean:=false; v_is_admin_store boolean:=false;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.admin_users au WHERE au.id=auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores podem aprovar pagamentos e ativar lojas.'; END IF;
 SELECT * INTO v_payment FROM public.payment_submissions WHERE id=p_payment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Comprovativo não encontrado.'; END IF;
 IF v_payment.business_id IS NULL OR v_payment.plan_id IS NULL THEN RAISE EXCEPTION 'Este pagamento não pertence a uma hospedagem de loja.'; END IF;
 IF lower(coalesce(v_payment.status,'')) NOT IN ('pending','submitted','approved') THEN RAISE EXCEPTION 'Comprovativo recusado.'; END IF;
 SELECT * INTO v_business FROM public.businesses WHERE id=v_payment.business_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Loja não encontrada.'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.admin_stores s WHERE s.business_id=v_business.id) INTO v_is_admin_store;
 SELECT * INTO v_plan FROM public.plans WHERE id=v_payment.plan_id;
 IF NOT FOUND OR lower(trim(coalesce(v_plan.plan_type,'')))<>'hospedagem' THEN RAISE EXCEPTION 'Plano inválido de hospedagem.'; END IF;
 IF v_plan.duration_days IS NULL OR v_plan.duration_days<=0 THEN RAISE EXCEPTION 'Plano sem duração válida.'; END IF;
 IF v_plan.price IS NOT NULL AND v_payment.amount IS NOT NULL AND v_plan.price<>v_payment.amount THEN RAISE EXCEPTION 'Valor não corresponde ao plano.'; END IF;
 IF v_is_admin_store THEN
  IF v_plan.category_id IS DISTINCT FROM v_business.category_id THEN RAISE EXCEPTION 'Categoria do plano incompatível.'; END IF;
  IF v_plan.subcategory_id IS NOT NULL AND v_plan.subcategory_id IS DISTINCT FROM v_business.subcategory_id THEN RAISE EXCEPTION 'Subcategoria do plano incompatível.'; END IF;
  IF v_plan.subcategory_id IS NULL AND EXISTS(SELECT 1 FROM public.plans p WHERE p.category_id=v_business.category_id AND p.subcategory_id=v_business.subcategory_id AND p.is_active=true AND lower(trim(coalesce(p.plan_type,'')))='hospedagem' AND p.price>0 AND p.duration_days>0) THEN RAISE EXCEPTION 'Esta subcategoria tem planos específicos ativos. Selecione o plano específico.'; END IF;
 END IF;
 IF lower(coalesce(v_payment.status,''))='approved' THEN
  SELECT * INTO v_subscription FROM public.business_subscriptions WHERE business_id=v_business.id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
   IF lower(trim(coalesce(v_subscription.status,'')))<>'active' OR v_subscription.expires_at::timestamptz<=v_now THEN RAISE EXCEPTION 'Hospedagem já aprovada mas expirada.'; END IF;
   v_starts_at:=v_subscription.starts_at::timestamptz; v_expires_at:=v_subscription.expires_at::timestamptz;
  ELSE
   v_starts_at:=coalesce(v_payment.reviewed_at,v_payment.created_at,v_now); v_expires_at:=v_starts_at+make_interval(days=>v_plan.duration_days);
   INSERT INTO public.business_subscriptions(business_id,plan_id,starts_at,status,expires_at) VALUES(v_business.id,v_plan.id,v_starts_at,'active',v_expires_at::text);
   v_subscription_created:=true;
  END IF;
 ELSE
  SELECT * INTO v_subscription FROM public.business_subscriptions WHERE business_id=v_business.id AND lower(trim(coalesce(status,'')))='active' AND expires_at::timestamptz>v_now ORDER BY expires_at::timestamptz DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN v_starts_at:=v_subscription.starts_at::timestamptz; v_expires_at:=v_subscription.expires_at::timestamptz;
  ELSE
   v_starts_at:=v_now; v_expires_at:=v_starts_at+make_interval(days=>v_plan.duration_days);
   INSERT INTO public.business_subscriptions(business_id,plan_id,starts_at,status,expires_at) VALUES(v_business.id,v_plan.id,v_starts_at,'active',v_expires_at::text);
   v_subscription_created:=true;
  END IF;
  UPDATE public.payment_submissions SET status='approved',reviewed_at=v_now WHERE id=v_payment.id AND status IN ('pending','submitted');
 END IF;
 UPDATE public.businesses SET approval_status='approved',is_active=true WHERE id=v_business.id;
 IF v_is_admin_store THEN
  UPDATE public.admin_stores SET hosting_status='active',hosting_type='normal',is_lifetime=false,hosting_expires_at=v_expires_at,updated_at=v_now WHERE business_id=v_business.id;
 ELSE
  INSERT INTO public.seller_status(seller_id,status,reject_reason,updated_at) VALUES(v_business.owner_id,'approved',null,v_now)
  ON CONFLICT(seller_id) DO UPDATE SET status='approved',reject_reason=null,updated_at=v_now;
 END IF;
 RETURN jsonb_build_object('business_id',v_business.id,'payment_id',v_payment.id,'subscription_created',v_subscription_created,'plan_days',case when v_subscription_created then v_plan.duration_days else 0 end,'starts_at',v_starts_at,'expires_at',v_expires_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_store(p_business_id uuid,p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public
AS $$
DECLARE business_rows integer; store_rows integer; subscription_expiry timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.admin_users au WHERE au.id=auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores podem rever lojas administrativas.'; END IF;
 IF p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Estado inválido.'; END IF;
 IF p_status='approved' THEN
  SELECT max(expires_at::timestamptz) INTO subscription_expiry FROM public.business_subscriptions WHERE business_id=p_business_id AND lower(trim(coalesce(status,'')))='active' AND expires_at::timestamptz>now();
  IF subscription_expiry IS NULL OR NOT EXISTS(SELECT 1 FROM public.payment_submissions ps WHERE ps.business_id=p_business_id AND ps.status='approved') THEN RAISE EXCEPTION 'A Loja do Administrador precisa de plano pago aprovado antes de ser ativada.'; END IF;
 END IF;
 UPDATE public.businesses SET approval_status=p_status,is_active=(p_status='approved') WHERE id=p_business_id;
 GET DIAGNOSTICS business_rows=ROW_COUNT;
 IF business_rows<>1 THEN RAISE EXCEPTION 'Perfil de negócio não encontrado.'; END IF;
 UPDATE public.admin_stores SET hosting_status=CASE WHEN p_status='approved' THEN 'active' ELSE 'rejected' END,hosting_type='normal',is_lifetime=false,hosting_expires_at=CASE WHEN p_status='approved' THEN subscription_expiry ELSE NULL END,updated_at=now() WHERE business_id=p_business_id;
 GET DIAGNOSTICS store_rows=ROW_COUNT;
 IF store_rows<>1 THEN RAISE EXCEPTION 'Loja administrativa não encontrada.'; END IF;
 RETURN true;
END;
$$;

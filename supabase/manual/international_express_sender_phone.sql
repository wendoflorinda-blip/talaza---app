-- DEV only: accept Express sender numbers internationally, digits only.
-- Remove the former Angola-only CHECK and the server-side +244 validation.
-- The client now normalizes to digits and validates length 7..15.
begin;
alter table public.payment_submissions
  drop constraint if exists payment_submissions_express_sender_phone_required;

create or replace function public.admin_approve_payment_and_activate_business(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_payment public.payment_submissions%rowtype;
  v_business public.businesses%rowtype;
  v_plan public.plans%rowtype;
  v_subscription public.business_subscriptions%rowtype;
  v_now timestamptz := now();
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_subscription_created boolean := false;
begin
  if auth.uid() is null or not exists (select 1 from public.admin_users au where au.id = auth.uid()) then
    raise exception 'Apenas administradores podem aprovar pagamentos e ativar lojas.';
  end if;
  select * into v_payment from public.payment_submissions where id=p_payment_id for update;
  if not found then raise exception 'Comprovativo não encontrado.'; end if;
  if v_payment.business_id is null or v_payment.plan_id is null then raise exception 'Este pagamento não pertence a uma hospedagem de loja.'; end if;
  if lower(coalesce(v_payment.status,'')) not in ('pending','submitted','approved') then raise exception 'Este comprovativo foi rejeitado. Aprove um novo reenvio.'; end if;
  select * into v_business from public.businesses where id=v_payment.business_id for update;
  if not found then raise exception 'Loja associada ao comprovativo não encontrada.'; end if;
  select * into v_plan from public.plans where id=v_payment.plan_id;
  if not found or lower(trim(coalesce(v_plan.plan_type,''))) <> 'hospedagem' then raise exception 'O comprovativo não está associado a um plano de Hospedagem válido.'; end if;
  if v_plan.duration_days is null or v_plan.duration_days <= 0 then raise exception 'O plano de hospedagem não tem uma duração válida configurada.'; end if;
  if v_plan.price is not null and v_payment.amount is not null and v_plan.price <> v_payment.amount then raise exception 'O valor do comprovativo não corresponde ao preço do plano.'; end if;

  if lower(coalesce(v_payment.status,'')) = 'approved' then
    select * into v_subscription from public.business_subscriptions
    where business_id=v_business.id order by created_at desc limit 1 for update;
    if found then
      if lower(trim(coalesce(v_subscription.status,''))) <> 'active'
         or v_subscription.expires_at::timestamptz <= v_now then
        raise exception 'Este pagamento já foi aprovado, mas a hospedagem existente expirou. Não serão acrescentados dias automaticamente.';
      end if;
      v_starts_at := v_subscription.starts_at::timestamptz;
      v_expires_at := v_subscription.expires_at::timestamptz;
    else
      v_starts_at := coalesce(v_payment.reviewed_at,v_payment.created_at,v_now);
      v_expires_at := v_starts_at + make_interval(days => v_plan.duration_days);
      insert into public.business_subscriptions (business_id,plan_id,starts_at,status,expires_at)
      values (v_business.id,v_plan.id,v_starts_at,'active',v_expires_at::text);
      v_subscription_created := true;
    end if;
  else
    select * into v_subscription from public.business_subscriptions
    where business_id=v_business.id and lower(trim(coalesce(status,'')))='active'
      and expires_at::timestamptz > v_now
    order by expires_at::timestamptz desc limit 1 for update;
    if found then
      v_starts_at := v_subscription.starts_at::timestamptz;
      v_expires_at := v_subscription.expires_at::timestamptz;
    else
      v_starts_at := v_now;
      v_expires_at := v_starts_at + make_interval(days => v_plan.duration_days);
      insert into public.business_subscriptions (business_id,plan_id,starts_at,status,expires_at)
      values (v_business.id,v_plan.id,v_starts_at,'active',v_expires_at::text);
      v_subscription_created := true;
    end if;
    update public.payment_submissions set status='approved',reviewed_at=v_now
    where id=v_payment.id and status in ('pending','submitted');
  end if;

  update public.businesses set approval_status='approved',is_active=true where id=v_business.id;
  insert into public.seller_status (seller_id,status,reject_reason,updated_at)
  values (v_business.owner_id,'approved',null,v_now)
  on conflict (seller_id) do update set status='approved',reject_reason=null,updated_at=v_now;

  return jsonb_build_object('business_id',v_business.id,'payment_id',v_payment.id,
    'subscription_created',v_subscription_created,
    'plan_days',case when v_subscription_created then v_plan.duration_days else 0 end,
    'starts_at',v_starts_at,'expires_at',v_expires_at);
end;
$function$;
commit;
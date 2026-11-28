drop policy if exists "Media creators update own profile" on public.media_profiles;
create policy "Media creators update own profile"
on public.media_profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can submit Mídia professional plan payments" on public.payment_submissions;
create policy "Users can submit Mídia professional plan payments"
on public.payment_submissions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and business_id is null
  and event_id is null
  and job_post_id is null
  and premium_promotion_id is null
  and status = 'pending'
  and payment_method = 'Express'
  and currency = 'Kz'
  and proof_url is not null
  and proof_url like ((select auth.uid())::text || '/%')
  and exists (
    select 1 from public.plans p
    where p.id = plan_id
      and p.id = 'f8dae010-62c6-439c-985f-8053bf168dfd'::uuid
      and p.is_active = true
      and p.plan_type = 'talaza_midia'
      and p.price = amount
  )
  and exists (
    select 1 from public.media_profiles mp
    where mp.user_id = (select auth.uid())
      and mp.is_professional = false
      and mp.professional_status in ('normal','rejected')
  )
);

create unique index if not exists payment_submissions_one_pending_media_plan_per_user
on public.payment_submissions(user_id, plan_id)
where plan_id = 'f8dae010-62c6-439c-985f-8053bf168dfd'::uuid
  and status in ('pending','submitted')
  and business_id is null
  and event_id is null
  and job_post_id is null
  and premium_promotion_id is null;

create or replace function public.admin_review_media_professional_payment(
  p_payment_id uuid,
  p_approved boolean,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payment_submissions%rowtype;
  v_plan public.plans%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a where a.id = (select auth.uid())
  ) then
    raise exception 'Apenas a Administração pode analisar pagamentos da Mídia.';
  end if;

  select * into v_payment
  from public.payment_submissions
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Pagamento da Mídia não encontrado.';
  end if;

  if v_payment.plan_id <> 'f8dae010-62c6-439c-985f-8053bf168dfd'::uuid
     or v_payment.business_id is not null
     or v_payment.event_id is not null
     or v_payment.job_post_id is not null
     or v_payment.premium_promotion_id is not null then
    raise exception 'Este registo não pertence ao plano Perfil Profissional da Mídia.';
  end if;

  if v_payment.status not in ('pending','submitted') then
    raise exception 'Este pagamento já foi analisado.';
  end if;

  select * into v_plan from public.plans
  where id = v_payment.plan_id
    and is_active = true
    and plan_type = 'talaza_midia';

  if not found or v_payment.amount <> v_plan.price then
    raise exception 'O valor ou o plano do pagamento não corresponde ao plano ativo.';
  end if;

  perform 1 from public.media_profiles
  where user_id = v_payment.user_id
  for update;

  if not found then
    raise exception 'O perfil de Criador associado não existe.';
  end if;

  if p_approved then
    update public.payment_submissions
    set status = 'approved', reviewed_at = v_now
    where id = p_payment_id;

    update public.media_profiles
    set plan_id = v_plan.id,
        plan_paid_at = v_now,
        is_professional = true,
        professional_status = 'approved',
        approved_by = (select auth.uid()),
        approved_at = v_now
    where user_id = v_payment.user_id;

    return jsonb_build_object('ok', true, 'status', 'approved', 'user_id', v_payment.user_id, 'plan_id', v_plan.id, 'approved_at', v_now);
  end if;

  if nullif(btrim(coalesce(p_rejection_reason, '')), '') is null then
    raise exception 'Indica o motivo da recusa.';
  end if;

  update public.payment_submissions
  set status = 'rejected', reviewed_at = v_now, notes = btrim(p_rejection_reason)
  where id = p_payment_id;

  update public.media_profiles
  set plan_id = null,
      plan_paid_at = null,
      is_professional = false,
      professional_status = 'rejected',
      approved_by = null,
      approved_at = null
  where user_id = v_payment.user_id;

  return jsonb_build_object('ok', true, 'status', 'rejected', 'user_id', v_payment.user_id, 'reviewed_at', v_now);
end;
$$;

revoke all on function public.admin_review_media_professional_payment(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_media_professional_payment(uuid, boolean, text) to authenticated;

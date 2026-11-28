create or replace function public.guard_media_profile_professional_fields()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if not exists (select 1 from public.admin_users a where a.id = (select auth.uid())) then
    if new.plan_id is distinct from old.plan_id
      or new.plan_paid_at is distinct from old.plan_paid_at
      or new.is_professional is distinct from old.is_professional
      or new.approved_by is distinct from old.approved_by
      or new.approved_at is distinct from old.approved_at then
      raise exception 'Os dados de aprovação profissional só podem ser alterados pela Administração.';
    end if;
    if new.professional_status is distinct from old.professional_status then
      if new.professional_status <> 'pending_approval'
        or old.professional_status not in ('normal','rejected')
        or new.is_professional
        or new.plan_id is not null
        or new.plan_paid_at is not null
        or new.approved_by is not null
        or new.approved_at is not null
        or not exists (
          select 1 from public.payment_submissions ps
          where ps.user_id = new.user_id
            and ps.plan_id = 'f8dae010-62c6-439c-985f-8053bf168dfd'::uuid
            and ps.status in ('pending','submitted')
            and ps.business_id is null
            and ps.event_id is null
            and ps.job_post_id is null
            and ps.premium_promotion_id is null
        ) then
        raise exception 'O estado profissional pendente só pode ser definido após um pagamento pendente válido.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.submit_media_professional_payment(
  p_amount numeric,
  p_express_sender_phone text,
  p_proof_path text,
  p_proof_type text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_plan public.plans%rowtype;
  v_profile public.media_profiles%rowtype;
  v_payment public.payment_submissions%rowtype;
begin
  if v_user_id is null then raise exception 'Inicia sessão para enviar o pagamento.'; end if;
  if p_proof_path is null or p_proof_path not like v_user_id::text || '/%' then raise exception 'O comprovativo não pertence à tua pasta segura.'; end if;
  if p_proof_type not in ('jpg','png','pdf') then raise exception 'Formato de comprovativo inválido.'; end if;
  if p_express_sender_phone !~ '^[0-9]{7,15}$' then raise exception 'Número Express inválido.'; end if;

  select * into v_plan from public.plans
  where id = 'f8dae010-62c6-439c-985f-8053bf168dfd'::uuid and is_active = true and plan_type = 'talaza_midia';
  if not found or p_amount <> v_plan.price then raise exception 'O plano ou o valor não corresponde ao plano Perfil Profissional ativo.'; end if;

  select * into v_profile from public.media_profiles where user_id = v_user_id for update;
  if not found then raise exception 'O perfil de Criador ainda não foi criado.'; end if;
  if v_profile.is_professional or v_profile.professional_status not in ('normal','rejected') then raise exception 'O perfil já tem um plano ativo ou um pagamento em análise.'; end if;

  insert into public.payment_submissions (
    business_id,event_id,job_post_id,premium_promotion_id,plan_id,user_id,amount,currency,
    payment_method,express_sender_phone,proof_url,proof_type,proof_image_url,proof_file_url,status
  ) values (
    null,null,null,null,v_plan.id,v_user_id,v_plan.price,'Kz','Express',p_express_sender_phone,
    p_proof_path,p_proof_type,
    case when p_proof_type in ('jpg','png') then p_proof_path else null end,
    case when p_proof_type = 'pdf' then p_proof_path else null end,'pending'
  ) returning * into v_payment;

  update public.media_profiles set professional_status = 'pending_approval' where user_id = v_user_id;
  return jsonb_build_object('id',v_payment.id,'status',v_payment.status,'created_at',v_payment.created_at);
end;
$$;

revoke all on function public.submit_media_professional_payment(numeric,text,text,text) from public, anon;
grant execute on function public.submit_media_professional_payment(numeric,text,text,text) to authenticated;

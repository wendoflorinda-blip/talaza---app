alter table public.payment_submissions
  add column if not exists ordering_name text;

alter table public.payment_submissions
  drop constraint if exists payment_submissions_media_ordering_name_required;

alter table public.payment_submissions
  add constraint payment_submissions_media_ordering_name_required
  check (
    plan_id <> 'f8dae010-62c6-439c-985f-8053bf168dfd'::uuid
    or (
      business_id is not null
      or event_id is not null
      or job_post_id is not null
      or premium_promotion_id is not null
      or nullif(btrim(ordering_name), '') is not null
    )
  );

drop function if exists public.submit_media_professional_payment(numeric,text,text,text);

create or replace function public.submit_media_professional_payment(
  p_amount numeric,
  p_ordering_name text,
  p_proof_path text,
  p_proof_type text
) returns jsonb
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_plan public.plans%rowtype;
  v_profile public.media_profiles%rowtype;
  v_payment public.payment_submissions%rowtype;
  v_ordering_name text := nullif(btrim(coalesce(p_ordering_name,'')),'');
begin
  if v_user_id is null then
    raise exception 'Inicia sessão para enviar o pagamento.';
  end if;

  if v_ordering_name is null then
    raise exception 'Nome do ordenante é obrigatório.';
  end if;

  if p_proof_path is null or p_proof_path not like v_user_id::text || '/%' then
    raise exception 'O comprovativo não pertence à tua pasta segura.';
  end if;

  if p_proof_type not in ('jpg','png','pdf') then
    raise exception 'Formato de comprovativo inválido.';
  end if;

  select * into v_plan
  from public.plans
  where id = 'f8dae010-62c6-439c-985f-8053bf168dfd'::uuid
    and is_active = true
    and plan_type = 'talaza_midia';

  if not found or p_amount <> v_plan.price then
    raise exception 'O plano ou o valor não corresponde ao plano Perfil Profissional ativo.';
  end if;

  select * into v_profile
  from public.media_profiles
  where user_id = v_user_id
  for update;

  if not found then
    raise exception 'O perfil de Criador ainda não foi criado.';
  end if;

  if v_profile.is_professional or v_profile.professional_status not in ('normal','rejected') then
    raise exception 'O perfil já tem um plano ativo ou um pagamento em análise.';
  end if;

  insert into public.payment_submissions (
    business_id,event_id,job_post_id,premium_promotion_id,plan_id,user_id,amount,currency,
    payment_method,ordering_name,proof_url,proof_type,proof_image_url,proof_file_url,status
  ) values (
    null,null,null,null,v_plan.id,v_user_id,v_plan.price,'Kz','Express',v_ordering_name,
    p_proof_path,p_proof_type,
    case when p_proof_type in ('jpg','png') then p_proof_path else null end,
    case when p_proof_type = 'pdf' then p_proof_path else null end,
    'pending'
  ) returning * into v_payment;

  update public.media_profiles
  set professional_status = 'pending_approval'
  where user_id = v_user_id;

  return jsonb_build_object('id',v_payment.id,'status',v_payment.status,'created_at',v_payment.created_at,'ordering_name',v_payment.ordering_name);
end;
$function$;

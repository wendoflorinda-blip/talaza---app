-- Talaza DEV only. Project omzoezccrmqianvlwilj. Do not apply to Original/production.
create or replace function public.admin_approve_opportunity_access_payment(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_payment public.payment_submissions%rowtype; v_plan public.plans%rowtype; v_profile public.profiles%rowtype;
v_subscription public.user_plan_subscriptions%rowtype; v_country_id uuid; v_province_id uuid; v_now timestamptz:=now();
v_starts_at timestamptz; v_expires_at timestamptz; v_created boolean:=false; v_link text;
begin
if auth.uid() is null or not exists(select 1 from public.admin_users au where au.id=auth.uid()) then raise exception 'Apenas administradores podem aprovar acessos às Oportunidades.'; end if;
select * into v_payment from public.payment_submissions where id=p_payment_id for update;
if not found then raise exception 'Comprovativo não encontrado.'; end if;
if lower(coalesce(v_payment.status,'')) not in ('pending','submitted') then raise exception 'Este comprovativo já foi analisado. Atualize a página.'; end if;
if v_payment.user_id is null or v_payment.plan_id is null then raise exception 'O comprovativo não tem utilizador ou plano associado.'; end if;
select * into v_plan from public.plans where id=v_payment.plan_id;
if not found or v_plan.is_active is distinct from true or (lower(trim(coalesce(v_plan.plan_type,'')))<>'opportunities' and lower(trim(coalesce(v_plan.area,'')))<>'oportunidades') or coalesce(v_plan.duration_days,0)<=0 or (v_plan.price is not null and v_payment.amount is not null and v_plan.price<>v_payment.amount) then raise exception 'O plano, preço ou duração não são válidos para acesso às Oportunidades.'; end if;
select * into v_profile from public.profiles where id=v_payment.user_id;
-- A região de acesso vem obrigatoriamente do destino escolhido no pagamento.
v_country_id:=v_payment.country_id; v_province_id:=v_payment.province_id;
if v_country_id is null or v_province_id is null then raise exception 'O pagamento não contém o país e a província escolhidos.'; end if;
select * into v_subscription from public.user_plan_subscriptions where user_id=v_payment.user_id and plan_id=v_payment.plan_id and country_id is not distinct from v_country_id and province_id is not distinct from v_province_id order by created_at desc limit 1 for update;
if found then
v_starts_at:=case when v_subscription.expires_at>v_now then v_subscription.starts_at else v_now end;
v_expires_at:=greatest(v_subscription.expires_at,v_now)+make_interval(days=>v_plan.duration_days);
update public.user_plan_subscriptions set status='active',country_id=v_country_id,province_id=v_province_id,starts_at=v_starts_at,expires_at=v_expires_at where id=v_subscription.id;
else
v_starts_at:=v_now; v_expires_at:=v_now+make_interval(days=>v_plan.duration_days);
insert into public.user_plan_subscriptions(user_id,plan_id,country_id,province_id,status,starts_at,expires_at) values(v_payment.user_id,v_payment.plan_id,v_country_id,v_province_id,'active',v_starts_at,v_expires_at); v_created:=true;
end if;
update public.payment_submissions set status='approved',reviewed_at=v_now where id=v_payment.id and status in ('pending','submitted');
if not found then raise exception 'O comprovativo já foi analisado.'; end if;
v_link:='/oportunidades?country='||v_country_id::text||'&province='||v_province_id::text;
insert into public.notifications(user_id,type,title,content,reference_id,link,audience,is_read) values(v_payment.user_id,'payment_review','Pagamento aprovado','O seu pagamento para Acesso às Oportunidades foi aprovado. O acesso está ativo até '||to_char(v_expires_at at time zone 'Africa/Luanda','DD/MM/YYYY')||'.',v_payment.id,v_link,'explorer',false);
return jsonb_build_object('payment_id',v_payment.id,'subscription_created',v_created,'country_id',v_country_id,'province_id',v_province_id,'starts_at',v_starts_at,'expires_at',v_expires_at,'link',v_link);
end; $$;
revoke all on function public.admin_approve_opportunity_access_payment(uuid) from public,anon;
grant execute on function public.admin_approve_opportunity_access_payment(uuid) to authenticated;

drop policy if exists "Talaza users can create conversations" on public.conversations;
create policy "Talaza users can create conversations" on public.conversations for insert to authenticated with check (
created_by=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()))
and (source='Vitrine'
or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.province_id=conversations.province_id)
or (source='Eventos' and exists(select 1 from public.events e where e.id::text=conversations.source_id and e.province_id=conversations.province_id and e.status='published' and e.payment_status='paid' and e.admin_approved=true and e.expires_at>now()))
or (source='Oportunidades' and exists(select 1 from public.job_posts j where j.id::text=conversations.source_id and j.user_id<>(select auth.uid()) and j.province_id=conversations.province_id and j.is_active=true and j.admin_approved=true and j.status in ('approved','published') and j.expires_at>now()
and exists(select 1 from public.user_plan_subscriptions s join public.plans p on p.id=s.plan_id where s.user_id=(select auth.uid()) and s.country_id=j.country_id and s.province_id=j.province_id and s.status='active' and s.starts_at<=now() and s.expires_at>now() and p.is_active=true and (lower(trim(coalesce(p.plan_type,'')))='opportunities' or lower(trim(coalesce(p.area,'')))='oportunidades'))))
);
drop policy if exists "Talaza users can join conversations they create" on public.conversation_participants;
create policy "Talaza users can join conversations they create" on public.conversation_participants for insert to authenticated with check (
user_id=(select auth.uid()) or (public.talaza_is_conversation_creator(conversation_id) and exists(select 1 from public.conversations c where c.id=conversation_participants.conversation_id and (c.source<>'Oportunidades' or exists(select 1 from public.job_posts j where j.id::text=c.source_id and j.user_id=conversation_participants.user_id and j.user_id<>(select auth.uid()) and j.province_id=c.province_id and j.is_active=true and j.admin_approved=true and j.status in ('approved','published') and j.expires_at>now())))
);

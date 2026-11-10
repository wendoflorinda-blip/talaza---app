-- REVIEW-ONLY SQL DRAFT
-- MÍDIA TALAZA — launch offer restricted to Angola.
-- This file is intentionally NOT a migration and has NOT been applied.
-- Before activation: create a real migration with the Supabase CLI in the
-- isolated Dev database, review the existing MÍDIA schema, then test RLS.

create table if not exists public.media_launch_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  country_id uuid not null references public.countries(id),
  country_code text not null check (country_code = 'AO'),
  title text not null,
  description text not null,
  duration_months integer not null default 3 check (duration_months = 3),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft','scheduled','active','closed')),
  included_features jsonb not null default '{"media_core":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.media_launch_grants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.media_launch_campaigns(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  country_id uuid not null references public.countries(id),
  activated_at timestamptz not null,
  expires_at timestamptz not null,
  included_features jsonb not null,
  status text not null default 'active'
    check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id),
  check (expires_at > activated_at)
);

create index if not exists media_launch_grants_user_expiry_idx
  on public.media_launch_grants(user_id, expires_at desc);

alter table public.media_launch_campaigns enable row level security;
alter table public.media_launch_grants enable row level security;

drop policy if exists "media launch campaign public active read" on public.media_launch_campaigns;
create policy "media launch campaign public active read"
on public.media_launch_campaigns for select to anon, authenticated
using (
  status = 'active'
  and starts_at is not null and ends_at is not null
  and now() >= starts_at and now() < ends_at
);

drop policy if exists "media launch campaign admins manage" on public.media_launch_campaigns;
create policy "media launch campaign admins manage"
on public.media_launch_campaigns for all to authenticated
using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

drop policy if exists "media launch grants owner read" on public.media_launch_grants;
create policy "media launch grants owner read"
on public.media_launch_grants for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "media launch grants admins read" on public.media_launch_grants;
create policy "media launch grants admins read"
on public.media_launch_grants for select to authenticated
using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

-- Authenticated users can request a grant only for themselves. The trigger
-- below computes all entitlement dates and snapshots from the campaign row.
drop policy if exists "media launch grants claim own open Angola campaign" on public.media_launch_grants;
create policy "media launch grants claim own open Angola campaign"
on public.media_launch_grants for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.media_launch_campaigns c
    where c.id = campaign_id
      and c.country_code = 'AO'
      and c.status = 'active'
      and c.starts_at is not null and c.ends_at is not null
      and now() >= c.starts_at and now() < c.ends_at
  )
);

create or replace function public.prepare_media_launch_grant()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_campaign public.media_launch_campaigns%rowtype;
  v_user_country_id uuid;
  v_now timestamptz := now();
begin
  if (select auth.uid()) is null then
    raise exception 'É necessário iniciar sessão para receber a oferta.';
  end if;

  new.user_id := (select auth.uid());

  select * into v_campaign
  from public.media_launch_campaigns
  where id = new.campaign_id
  for share;

  if not found
    or v_campaign.country_code <> 'AO'
    or v_campaign.status <> 'active'
    or v_campaign.starts_at is null
    or v_campaign.ends_at is null
    or v_now < v_campaign.starts_at
    or v_now >= v_campaign.ends_at then
    raise exception 'A oferta de lançamento para Angola não está disponível.';
  end if;

  select coalesce(
    (select p.country_id from public.profiles p where p.id = new.user_id),
    (select mp.country_id from public.media_profiles mp where mp.user_id = new.user_id),
    (select ma.country_id from public.media_applications ma
      where ma.user_id = new.user_id order by ma.created_at desc limit 1)
  ) into v_user_country_id;

  if v_user_country_id is null or v_user_country_id <> v_campaign.country_id then
    raise exception 'Esta oferta está disponível apenas para contas MÍDIA associadas a Angola.';
  end if;

  new.country_id := v_campaign.country_id;
  new.activated_at := v_now;
  new.expires_at := v_now + make_interval(months => v_campaign.duration_months);
  new.included_features := v_campaign.included_features;
  new.status := 'active';
  return new;
end;
$$;

drop trigger if exists media_launch_grant_prepare on public.media_launch_grants;
create trigger media_launch_grant_prepare
before insert on public.media_launch_grants
for each row execute function public.prepare_media_launch_grant();

grant select on public.media_launch_campaigns to anon, authenticated;
grant select, insert on public.media_launch_grants to authenticated;

-- Seed a draft campaign only. Admin must set the real start/end dates and
-- explicitly activate it; no promotional claim is possible while it is draft.
insert into public.media_launch_campaigns
  (code, country_id, country_code, title, description, duration_months, status, included_features)
values
  (
    'media-angola-launch-3-months',
    '12d837fe-0cb0-442c-91e6-17c50c3b5d77',
    'AO',
    'Oferta especial de lançamento — Angola',
    'A TALAZA oferece três meses de acesso à MÍDIA TALAZA a quem aderir durante o período oficial da campanha. A oferta termina na data indicada, não é permanente e não tem renovação automática.',
    3,
    'draft',
    '{"media_core":true}'::jsonb
  )
on conflict (code) do nothing;

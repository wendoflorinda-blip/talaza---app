-- Primary province is profiles.country_id + profiles.province_id.
-- The RPC updates the profile, every owned business, and the audit row atomically.
create table if not exists public.profile_province_change_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  old_province_id uuid,
  new_province_id uuid not null,
  old_country_id uuid,
  new_country_id uuid not null,
  changed_at timestamptz not null default now()
);
create index if not exists profile_province_change_history_user_changed_idx
  on public.profile_province_change_history (user_id, changed_at desc);
alter table public.profile_province_change_history enable row level security;
revoke all on public.profile_province_change_history from anon, authenticated;
grant select on public.profile_province_change_history to authenticated;
drop policy if exists "Users can view own province change history" on public.profile_province_change_history;
create policy "Users can view own province change history"
  on public.profile_province_change_history for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.guard_profile_primary_province_change()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if old.province_id is distinct from new.province_id
     or old.country_id is distinct from new.country_id then
    if current_setting('talaza.primary_province_change_user', true)
       is distinct from auth.uid()::text then
      raise exception 'A província principal só pode ser alterada pelo fluxo oficial da Talaza.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_primary_province_change on public.profiles;
create trigger guard_profile_primary_province_change
  before update of province_id, country_id on public.profiles
  for each row execute function private.guard_profile_primary_province_change();

create or replace function private.enforce_business_location_matches_owner_primary()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare v_country_id uuid; v_province_id uuid;
begin
  if new.owner_id is null then return new; end if;
  select p.country_id, p.province_id into v_country_id, v_province_id
  from public.profiles p where p.id = new.owner_id;
  if not found then
    raise exception 'O proprietário ainda não tem uma província principal definida.' using errcode = '23514';
  end if;
  if new.country_id is distinct from v_country_id or new.province_id is distinct from v_province_id then
    raise exception 'O negócio deve acompanhar a província e o país principais do proprietário.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_business_location_matches_owner_primary on public.businesses;
create trigger enforce_business_location_matches_owner_primary
  before insert or update of country_id, province_id, owner_id on public.businesses
  for each row execute function private.enforce_business_location_matches_owner_primary();

create or replace function public.change_primary_province(p_new_country_id uuid, p_new_province_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_country_id uuid;
  v_old_province_id uuid;
  v_last_changed_at timestamptz;
  v_next_allowed_at timestamptz;
  v_days_remaining integer;
  v_businesses_updated integer := 0;
begin
  if v_user_id is null then
    raise exception 'É necessário iniciar sessão para alterar a província principal.' using errcode = '28000';
  end if;
  if p_new_country_id is null or p_new_province_id is null then
    raise exception 'Escolha um país e uma província válidos.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.provinces pr where pr.id = p_new_province_id and pr.country_id = p_new_country_id) then
    raise exception 'A província escolhida não pertence ao país indicado.' using errcode = '22023';
  end if;
  select p.country_id, p.province_id into v_old_country_id, v_old_province_id
  from public.profiles p where p.id = v_user_id for update;
  if not found then raise exception 'Não foi encontrado o perfil desta conta.' using errcode = 'P0002'; end if;
  if v_old_country_id is not distinct from p_new_country_id and v_old_province_id is not distinct from p_new_province_id then
    return jsonb_build_object('changed', false, 'country_id', v_old_country_id, 'province_id', v_old_province_id, 'businesses_updated', 0);
  end if;
  select h.changed_at into v_last_changed_at from public.profile_province_change_history h
  where h.user_id = v_user_id order by h.changed_at desc limit 1;
  if v_last_changed_at is not null then
    v_next_allowed_at := v_last_changed_at + interval '180 days';
    if now() < v_next_allowed_at then
      v_days_remaining := greatest(1, ceil(extract(epoch from (v_next_allowed_at - now())) / 86400.0)::integer);
      raise exception 'Só podes alterar novamente em %. Faltam % dias.',
        to_char(v_next_allowed_at at time zone 'UTC', 'DD/MM/YYYY'), v_days_remaining using errcode = 'P0001';
    end if;
  end if;
  perform set_config('talaza.primary_province_change_user', v_user_id::text, true);
  update public.profiles set country_id = p_new_country_id, province_id = p_new_province_id where id = v_user_id;
  update public.businesses set country_id = p_new_country_id, province_id = p_new_province_id where owner_id = v_user_id;
  get diagnostics v_businesses_updated = row_count;
  insert into public.profile_province_change_history(user_id, old_province_id, new_province_id, old_country_id, new_country_id, changed_at)
  values (v_user_id, v_old_province_id, p_new_province_id, v_old_country_id, p_new_country_id, now());
  return jsonb_build_object('changed', true, 'country_id', p_new_country_id, 'province_id', p_new_province_id,
    'businesses_updated', v_businesses_updated, 'changed_at', now(), 'next_change_at', now() + interval '180 days');
end;
$$;
revoke all on function public.change_primary_province(uuid, uuid) from public, anon;
grant execute on function public.change_primary_province(uuid, uuid) to authenticated;

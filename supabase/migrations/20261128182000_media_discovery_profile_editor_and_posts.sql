alter table public.profiles
  add column if not exists show_email boolean not null default false,
  add column if not exists username text;

create unique index if not exists profiles_username_lower_unique
  on public.profiles(lower(username))
  where username is not null and btrim(username) <> '';

create table if not exists public.country_languages (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(country_id,language_id)
);
alter table public.country_languages enable row level security;
drop policy if exists "Country languages are publicly readable" on public.country_languages;
create policy "Country languages are publicly readable" on public.country_languages
for select to anon,authenticated using(is_active=true);
drop policy if exists "Admins manage country languages" on public.country_languages;
create policy "Admins manage country languages" on public.country_languages
for all to authenticated
using(exists(select 1 from public.admin_users a where a.id=(select auth.uid())))
with check(exists(select 1 from public.admin_users a where a.id=(select auth.uid())));
grant select on public.country_languages to anon,authenticated;
grant insert,update,delete on public.country_languages to authenticated;

insert into public.languages(name,code,is_active,sort_order)
select 'Português','pt',true,1
where not exists(select 1 from public.languages where code='pt');
insert into public.country_languages(country_id,language_id,is_active)
select c.id,l.id,true from public.countries c join public.languages l on l.code='pt'
where c.iso2='AO' and not exists(
 select 1 from public.country_languages cl where cl.country_id=c.id and cl.language_id=l.id
);

create table if not exists public.media_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,following_id),
  constraint media_follows_no_self_follow check(follower_id<>following_id)
);
alter table public.media_follows enable row level security;
drop policy if exists "Media follows are readable by participants" on public.media_follows;
create policy "Media follows are readable by participants" on public.media_follows
for select to authenticated using(follower_id=(select auth.uid()) or following_id=(select auth.uid()));
drop policy if exists "Users follow from own account" on public.media_follows;
create policy "Users follow from own account" on public.media_follows
for insert to authenticated
with check(follower_id=(select auth.uid()) and exists(
 select 1 from public.media_profiles mp where mp.user_id=following_id and mp.status='active'
));
drop policy if exists "Users unfollow from own account" on public.media_follows;
create policy "Users unfollow from own account" on public.media_follows
for delete to authenticated using(follower_id=(select auth.uid()));
grant select,insert,delete on public.media_follows to authenticated;

create table if not exists public.media_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null check(media_type in ('image','video')),
  caption text,
  hashtags text,
  language text,
  status text not null default 'published' check(status in ('published','archived')),
  created_at timestamptz not null default now()
);
create index if not exists media_posts_created_at_idx on public.media_posts(created_at desc);
create index if not exists media_posts_user_id_idx on public.media_posts(user_id);
alter table public.media_posts enable row level security;
drop policy if exists "Owners create own Mídia posts while professional" on public.media_posts;
create policy "Owners create own Mídia posts while professional" on public.media_posts
for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(
  select 1 from public.media_profiles mp
  where mp.user_id=(select auth.uid()) and mp.status='active'
   and mp.is_professional=true and mp.professional_status='approved'
   and mp.plan_id is not null and mp.plan_paid_at is not null
   and mp.plan_expires_at>now() and mp.approved_by is not null and mp.approved_at is not null
 )
);
drop policy if exists "Owners archive own Mídia posts" on public.media_posts;
create policy "Owners archive own Mídia posts" on public.media_posts
for update to authenticated using(user_id=(select auth.uid()))
with check(user_id=(select auth.uid()));
grant select on public.media_posts to authenticated;
grant insert,update on public.media_posts to authenticated;

insert into storage.buckets(id,name,public)
values('media-posts','media-posts',true)
on conflict(id) do update set public=true;
drop policy if exists "Public can view Mídia post media" on storage.objects;
create policy "Public can view Mídia post media" on storage.objects
for select to public using(bucket_id='media-posts');
drop policy if exists "Creators upload own Mídia post media" on storage.objects;
create policy "Creators upload own Mídia post media" on storage.objects
for insert to authenticated
with check(bucket_id='media-posts' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Creators delete own Mídia post media" on storage.objects;
create policy "Creators delete own Mídia post media" on storage.objects
for delete to authenticated
using(bucket_id='media-posts' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.set_media_profile_plan_expiry()
returns trigger language plpgsql security invoker
set search_path=pg_catalog,public as $$
declare v_days integer;
begin
 if new.plan_id is null or new.plan_paid_at is null then
  new.plan_expires_at:=null;
 else
  select duration_days into v_days from public.plans where id=new.plan_id;
  if v_days is null then raise exception 'Duração do plano Mídia não encontrada.'; end if;
  new.plan_expires_at:=new.plan_paid_at+make_interval(days=>v_days);
 end if;
 return new;
end;
$$;
drop trigger if exists media_profile_plan_expiry on public.media_profiles;
create trigger media_profile_plan_expiry
before insert or update of plan_id,plan_paid_at on public.media_profiles
for each row execute function public.set_media_profile_plan_expiry();
update public.media_profiles mp
set plan_expires_at=mp.plan_paid_at+make_interval(days=>p.duration_days)
from public.plans p
where mp.plan_id=p.id and mp.plan_paid_at is not null
 and mp.plan_expires_at is distinct from (mp.plan_paid_at+make_interval(days=>p.duration_days));

create or replace view public.media_discovery_profiles
with(security_invoker=true,security_barrier=true)
as
select mp.user_id,mp.display_name,mp.username,mp.interface_language,
 mp.country_id,mp.plan_expires_at,p.avatar_url
from public.media_profiles mp
left join public.profiles p on p.id=mp.user_id
where mp.status='active' and mp.is_professional=true
 and mp.professional_status='approved' and mp.plan_id is not null
 and mp.plan_paid_at is not null and mp.plan_expires_at>now()
 and mp.approved_by is not null and mp.approved_at is not null;
revoke all on public.media_discovery_profiles from anon;
grant select on public.media_discovery_profiles to authenticated;
drop policy if exists "Published Mídia posts visible to active professional profiles" on public.media_posts;
create policy "Published Mídia posts visible to active professional profiles" on public.media_posts
for select to authenticated using(
 status='published' and exists(
  select 1 from public.media_discovery_profiles dp where dp.user_id=media_posts.user_id
 )
);

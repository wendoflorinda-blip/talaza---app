create table if not exists public.profile_section_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('novidades', 'eventos', 'parasi')),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, section)
);

alter table public.profile_section_views enable row level security;

drop policy if exists "Users can read their own profile section views" on public.profile_section_views;
create policy "Users can read their own profile section views"
  on public.profile_section_views for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own profile section views" on public.profile_section_views;
create policy "Users can insert their own profile section views"
  on public.profile_section_views for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile section views" on public.profile_section_views;
create policy "Users can update their own profile section views"
  on public.profile_section_views for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.profile_section_views to authenticated;

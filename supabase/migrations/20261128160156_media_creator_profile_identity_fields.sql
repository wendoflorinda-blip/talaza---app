alter table public.media_applications
  add column if not exists username text,
  add column if not exists email text;

alter table public.media_profiles
  add column if not exists email text;

drop policy if exists "Media creators update own profile" on public.media_profiles;
create policy "Media creators update own profile"
on public.media_profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

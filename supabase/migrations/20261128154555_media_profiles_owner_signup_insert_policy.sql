create policy "media profiles owner creates own application profile"
on public.media_profiles
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.media_applications ma
    where ma.id = application_id
      and ma.user_id = (select auth.uid())
  )
);

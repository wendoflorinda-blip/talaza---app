drop policy if exists "Admins insert country settings" on public.countries;
create policy "Admins insert country settings"
  on public.countries for insert to authenticated
  with check (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));

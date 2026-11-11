-- Refine country payment RLS policies: one SELECT policy per role/action.
drop policy if exists "Public can view active country plan prices" on public.country_plan_prices;
drop policy if exists "Admins manage country plan prices" on public.country_plan_prices;
create policy "Read active prices or all prices as admin"
  on public.country_plan_prices for select to anon, authenticated
  using (
    is_active = true
    or exists (select 1 from public.admin_users au where au.id = (select auth.uid()))
  );
create policy "Admins insert country plan prices"
  on public.country_plan_prices for insert to authenticated
  with check (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));
create policy "Admins update country plan prices"
  on public.country_plan_prices for update to authenticated
  using (exists (select 1 from public.admin_users au where au.id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));
create policy "Admins delete country plan prices"
  on public.country_plan_prices for delete to authenticated
  using (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));

drop policy if exists "Public can view active payment options" on public.payment_options;
drop policy if exists "Admins manage country payment options" on public.payment_options;
create policy "Read active payment options or all as admin"
  on public.payment_options for select to anon, authenticated
  using (
    is_active = true
    or exists (select 1 from public.admin_users au where au.id = (select auth.uid()))
  );
create policy "Admins insert payment options"
  on public.payment_options for insert to authenticated
  with check (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));
create policy "Admins update payment options"
  on public.payment_options for update to authenticated
  using (exists (select 1 from public.admin_users au where au.id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));
create policy "Admins delete payment options"
  on public.payment_options for delete to authenticated
  using (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));

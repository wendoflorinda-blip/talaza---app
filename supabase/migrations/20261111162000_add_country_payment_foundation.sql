-- TALAZA Comercial: base internacional de países e preços por país.
-- Migração aditiva: preserva planos, preços e comprovativos históricos.

alter table public.countries
  add column if not exists iso2 char(2),
  add column if not exists iso3 char(3),
  add column if not exists currency_code char(3),
  add column if not exists currency_symbol text,
  add column if not exists phone_code text,
  add column if not exists locale text,
  add column if not exists is_enabled boolean not null default false,
  add column if not exists rollout_status text not null default 'preparing';

alter table public.countries
  drop constraint if exists countries_rollout_status_check;
alter table public.countries
  add constraint countries_rollout_status_check
  check (rollout_status in ('preparing','active','paused'));

update public.countries
set iso2='AO', iso3='AGO', currency_code='AOA', currency_symbol='Kz',
    phone_code='+244', locale='pt-AO', is_enabled=true, rollout_status='active'
where lower(trim(name))='angola';

create unique index if not exists countries_iso2_unique
  on public.countries (iso2) where iso2 is not null;

create table if not exists public.country_plan_prices (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  currency_code char(3) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_id, plan_id)
);

create index if not exists country_plan_prices_active_lookup_idx
  on public.country_plan_prices(country_id, is_active, plan_id);

alter table public.payment_options
  add column if not exists method_code text,
  add column if not exists currency_code char(3),
  add column if not exists method_kind text not null default 'manual_proof',
  add column if not exists provider_code text not null default 'manual',
  add column if not exists public_details jsonb not null default '{}'::jsonb,
  add column if not exists requires_proof boolean not null default true,
  add column if not exists is_test_mode boolean not null default false;

alter table public.payment_options
  drop constraint if exists payment_options_method_kind_check;
alter table public.payment_options
  add constraint payment_options_method_kind_check
  check (method_kind in ('manual_proof','hosted_checkout','wallet','bank_transfer'));

create unique index if not exists payment_options_country_method_unique
  on public.payment_options(country_id, method_code)
  where method_code is not null;

alter table public.payment_submissions
  add column if not exists country_id uuid references public.countries(id) on delete restrict,
  add column if not exists currency_code char(3),
  add column if not exists payment_option_id uuid references public.payment_options(id) on delete set null,
  add column if not exists plan_price_id uuid references public.country_plan_prices(id) on delete set null;

alter table public.payment_transactions
  add column if not exists country_id uuid references public.countries(id) on delete restrict,
  add column if not exists currency_code char(3),
  add column if not exists payment_option_id uuid references public.payment_options(id) on delete set null,
  add column if not exists plan_price_id uuid references public.country_plan_prices(id) on delete set null;

-- RLS e leitura pública apenas dos preços activos. Gestão restrita aos administradores.
alter table public.country_plan_prices enable row level security;

drop policy if exists "Public can view active country plan prices" on public.country_plan_prices;
create policy "Public can view active country plan prices"
  on public.country_plan_prices for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins manage country plan prices" on public.country_plan_prices;
create policy "Admins manage country plan prices"
  on public.country_plan_prices for all to authenticated
  using (exists (select 1 from public.admin_users au where au.id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));

drop policy if exists "Admins manage country payment options" on public.payment_options;
create policy "Admins manage country payment options"
  on public.payment_options for all to authenticated
  using (exists (select 1 from public.admin_users au where au.id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));

drop policy if exists "Admins update country settings" on public.countries;
create policy "Admins update country settings"
  on public.countries for update to authenticated
  using (exists (select 1 from public.admin_users au where au.id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));

-- Copia os preços actuais para o catálogo de Angola sem alterar plans.price
-- nem os comprovativos e transacções históricos.
insert into public.country_plan_prices(country_id, plan_id, amount, currency_code, is_active)
select c.id, p.id, p.price, 'AOA', p.is_active
from public.countries c
cross join public.plans p
where lower(trim(c.name))='angola'
on conflict (country_id, plan_id) do update
set amount=excluded.amount,
    currency_code=excluded.currency_code,
    is_active=excluded.is_active,
    updated_at=now();

-- Regista o método que já é usado em Angola. Os dados de recepção continuam
-- nas variáveis públicas já existentes; segredos de gateways nunca ficam nesta tabela.
insert into public.payment_options(
  country_id, name, payment_type, instructions, is_active, sort_order,
  method_code, currency_code, method_kind, provider_code, public_details, requires_proof
)
select c.id, 'Multicaixa Express', 'Express',
       'Pagamento por Multicaixa Express. Envie o comprovativo para validação.',
       true, 1, 'multicaixa_express', 'AOA', 'manual_proof', 'manual', '{}'::jsonb, true
from public.countries c
where lower(trim(c.name))='angola'
on conflict (country_id, method_code) where method_code is not null do update
set is_active=true, currency_code='AOA', method_kind='manual_proof',
    provider_code='manual', requires_proof=true;

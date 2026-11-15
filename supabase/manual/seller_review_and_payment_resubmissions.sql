-- Seller review and payment resubmission workflow
-- Applied to Supabase Dev project only: omzoezccrmqianvlwilj
alter table public.notifications add column if not exists link text;

create table if not exists public.seller_status (
  seller_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','inactive')),
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_resubmissions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  file_url text not null,
  file_type text not null check (file_type in ('image','pdf')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.seller_status enable row level security;
alter table public.payment_resubmissions enable row level security;

drop policy if exists "Seller can view own status" on public.seller_status;
create policy "Seller can view own status" on public.seller_status
for select to authenticated using (seller_id = (select auth.uid()));

drop policy if exists "Admins manage seller status" on public.seller_status;
create policy "Admins manage seller status" on public.seller_status
for all to authenticated
using (exists (select 1 from public.admin_users au where au.id = (select auth.uid())))
with check (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));

drop policy if exists "Seller can submit own payment resubmissions" on public.payment_resubmissions;
create policy "Seller can submit own payment resubmissions" on public.payment_resubmissions
for insert to authenticated with check (seller_id = (select auth.uid()));

drop policy if exists "Seller can view own payment resubmissions" on public.payment_resubmissions;
create policy "Seller can view own payment resubmissions" on public.payment_resubmissions
for select to authenticated using (seller_id = (select auth.uid()));

drop policy if exists "Admins manage payment resubmissions" on public.payment_resubmissions;
create policy "Admins manage payment resubmissions" on public.payment_resubmissions
for all to authenticated
using (exists (select 1 from public.admin_users au where au.id = (select auth.uid())))
with check (exists (select 1 from public.admin_users au where au.id = (select auth.uid())));

create schema if not exists private;
create or replace function private.notify_admin_payment_resubmission()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, title, content, link, is_read)
  select au.id, 'seller_payment_resubmission',
         'Novo comprovativo corrigido',
         'Um vendedor enviou um novo telefone e comprovativo para verificação.',
         '/admin', false
  from public.admin_users au;
  return new;
end;
$$;
revoke all on function private.notify_admin_payment_resubmission() from public, anon, authenticated;
drop trigger if exists trg_notify_admin_payment_resubmission on public.payment_resubmissions;
create trigger trg_notify_admin_payment_resubmission
after insert on public.payment_resubmissions
for each row execute function private.notify_admin_payment_resubmission();

grant select, insert, update, delete on public.seller_status to authenticated;
grant select, insert, update, delete on public.payment_resubmissions to authenticated;

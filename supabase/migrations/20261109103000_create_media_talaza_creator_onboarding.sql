-- MÍDIA TALAZA: isolated creator onboarding, annual AOA plan and proof payments.
-- This migration is committed for review only. Do not apply to production until approved.

create table if not exists public.media_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency = 'AOA'),
  duration_days integer not null check (duration_days > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.media_plans (code, name, amount, currency, duration_days, is_active)
values ('creator-annual-aoa', 'Plano anual de Criador', 40000, 'AOA', 365, true)
on conflict (code) do update
set name = excluded.name, amount = excluded.amount, currency = excluded.currency,
    duration_days = excluded.duration_days, is_active = excluded.is_active;

create table if not exists public.media_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  country_id uuid references public.countries(id) on delete set null,
  content_category text not null check (char_length(btrim(content_category)) between 2 and 80),
  languages text[] not null default '{}',
  bio text check (bio is null or char_length(btrim(bio)) <= 1200),
  social_links jsonb not null default '{}'::jsonb,
  application_status text not null default 'submitted'
    check (application_status in ('submitted','under_review','approved','rejected')),
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists media_applications_one_open_per_user
on public.media_applications(user_id)
where application_status in ('submitted','under_review');

create table if not exists public.media_payment_settings (
  singleton boolean primary key default true check (singleton = true),
  bank_name text,
  account_holder text,
  account_number text,
  iban text,
  transfer_instructions text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.media_payment_settings(singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.media_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.media_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.media_plans(id),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency = 'AOA'),
  payment_reference text,
  proof_path text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint media_payment_application_owner_match
    check (char_length(btrim(proof_path)) > 0)
);

create unique index if not exists media_payment_one_pending_per_application
on public.media_payment_submissions(application_id)
where status = 'pending';

create table if not exists public.media_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  application_id uuid not null unique references public.media_applications(id),
  display_name text not null,
  country_id uuid references public.countries(id) on delete set null,
  content_category text not null,
  languages text[] not null default '{}',
  bio text,
  social_links jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','suspended')),
  activated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.media_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.auth.users(id) on delete cascade,
  media_profile_id uuid not null references public.media_profiles(user_id) on delete cascade,
  plan_id uuid not null references public.media_plans(id),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  payment_submission_id uuid not null unique references public.media_payment_submissions(id),
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);

create index if not exists media_applications_user_created_idx
on public.media_applications(user_id, created_at desc);
create index if not exists media_payments_user_created_idx
on public.media_payment_submissions(user_id, created_at desc);
create index if not exists media_subscriptions_user_status_idx
on public.media_subscriptions(user_id, status, expires_at desc);

alter table public.media_plans enable row level security;
alter table public.media_applications enable row level security;
alter table public.media_payment_settings enable row level security;
alter table public.media_payment_submissions enable row level security;
alter table public.media_profiles enable row level security;
alter table public.media_subscriptions enable row level security;

create policy "media plans visible to signed in users"
on public.media_plans for select to authenticated using (is_active = true);

create policy "media plans admins manage"
on public.media_plans for all to authenticated
using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

create policy "media applications owner reads own"
on public.media_applications for select to authenticated
using (user_id = (select auth.uid()));

create policy "media applications owner submits own"
on public.media_applications for insert to authenticated
with check (user_id = (select auth.uid()) and application_status = 'submitted');

create policy "media applications admins read all"
on public.media_applications for select to authenticated
using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

create policy "media applications admins review"
on public.media_applications for update to authenticated
using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

create policy "media payment settings signed in read"
on public.media_payment_settings for select to authenticated using (true);

create policy "media payment settings admins manage"
on public.media_payment_settings for all to authenticated
using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

create policy "media payment owner reads own"
on public.media_payment_submissions for select to authenticated
using (user_id = (select auth.uid()));

create policy "media payment owner submits own"
on public.media_payment_submissions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.media_applications app
    where app.id = application_id and app.user_id = (select auth.uid())
  )
);

create policy "media payment admins read all"
on public.media_payment_submissions for select to authenticated
using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

create policy "media payment admins review"
on public.media_payment_submissions for update to authenticated
using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

create policy "media profiles active visible or owner"
on public.media_profiles for select to authenticated
using (status = 'active' or user_id = (select auth.uid()));

create policy "media profiles admins manage"
on public.media_profiles for all to authenticated
using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

create policy "media subscriptions owner reads own"
on public.media_subscriptions for select to authenticated
using (user_id = (select auth.uid()));

create policy "media subscriptions admins manage"
on public.media_subscriptions for all to authenticated
using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media-payment-proofs',
  'media-payment-proofs',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "media proof owner uploads own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'media-payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "media proof owner reads own"
on storage.objects for select to authenticated
using (
  bucket_id = 'media-payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "media proof admins read all"
on storage.objects for select to authenticated
using (
  bucket_id = 'media-payment-proofs'
  and exists (select 1 from public.admin_users a where a.id = (select auth.uid()))
);

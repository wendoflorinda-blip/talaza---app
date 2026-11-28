create policy "Media creators upload own professional payment proofs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media-payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Media admins read professional payment proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media-payment-proofs'
  and exists (select 1 from public.admin_users a where a.id = (select auth.uid()))
);

create or replace function public.guard_media_profile_professional_fields()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if not exists (select 1 from public.admin_users a where a.id = (select auth.uid())) then
    if new.plan_id is distinct from old.plan_id
      or new.plan_paid_at is distinct from old.plan_paid_at
      or new.is_professional is distinct from old.is_professional
      or new.professional_status is distinct from old.professional_status
      or new.approved_by is distinct from old.approved_by
      or new.approved_at is distinct from old.approved_at then
      raise exception 'Os dados de aprovação profissional só podem ser alterados pela Administração.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_media_profile_professional_fields on public.media_profiles;
create trigger guard_media_profile_professional_fields
before update on public.media_profiles
for each row execute function public.guard_media_profile_professional_fields();

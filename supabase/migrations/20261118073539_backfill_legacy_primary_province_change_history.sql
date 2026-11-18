-- Preserve cooldowns already in progress before switching to the audit table.
-- After this one-time backfill, the application and RPC read only the history table.
insert into public.profile_province_change_history (
  user_id, old_province_id, new_province_id,
  old_country_id, new_country_id, changed_at
)
select
  u.id,
  null,
  p.province_id,
  null,
  p.country_id,
  (u.raw_user_meta_data ->> 'talaza_province_changed_at')::timestamptz
from auth.users u
join public.profiles p on p.id = u.id
where p.province_id is not null
  and p.country_id is not null
  and coalesce(u.raw_user_meta_data ->> 'talaza_province_changed_at', '') ~
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$'
  and not exists (
    select 1 from public.profile_province_change_history h
    where h.user_id = u.id
  );
alter table public.community_monthly_themes
  add column if not exists week_expires_at timestamptz;

update public.community_monthly_themes
set week_expires_at = ends_at
where week_expires_at is null
  and coalesce(nullif(week_title, ''), 'Título da semana por definir') <> 'Título da semana por definir';

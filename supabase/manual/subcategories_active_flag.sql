-- Talaza DEV: enable lifecycle control for business subcategories.
-- Existing rows remain visible by default; administrators can deactivate them
-- by setting is_active = false. Application queries filter on this column.
alter table public.subcategories
  add column if not exists is_active boolean not null default true;

update public.subcategories
set is_active = true
where is_active is null;

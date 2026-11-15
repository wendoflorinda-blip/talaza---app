-- Talaza Angola: categorias base
-- Seguro para executar mais de uma vez. Não elimina categorias nem altera as categorias antigas.
alter table public.categories
  add column if not exists slug text,
  add column if not exists icon text,
  add column if not exists active boolean not null default true;

create unique index if not exists categories_slug_unique
  on public.categories (slug);

insert into public.categories (name, slug, icon, active)
values
  ('Alimentação', 'alimentacao', 'utensils', true),
  ('Beleza', 'beleza', 'sparkles', true),
  ('Moda', 'moda', 'shirt', true),
  ('Eletrónica', 'eletronica', 'laptop', true),
  ('Casa', 'casa', 'house', true),
  ('Saúde', 'saude', 'heart-pulse', true),
  ('Educação', 'educacao', 'graduation-cap', true),
  ('Serviços', 'servicos', 'briefcase-business', true),
  ('Transporte', 'transporte', 'car', true),
  ('Desporto', 'desporto', 'dumbbell', true),
  ('Tecnologia', 'tecnologia', 'cpu', true),
  ('Artesanato', 'artesanato', 'palette', true)
on conflict (slug) do update
set name = excluded.name,
    icon = excluded.icon,
    active = true;

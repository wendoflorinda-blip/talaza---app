-- Índices direcionados às consultas paginadas da TALAZA Comercial.
-- Índices parciais mantêm menor tamanho e focam apenas registos públicos ativos.
create index if not exists community_posts_public_feed_idx
  on public.community_posts (country_id, post_type, scope, province_id, created_at desc)
  where status = 'published' and moderation_status = 'approved';

create index if not exists events_public_feed_idx
  on public.events (province_id, country_id, created_at desc)
  include (expires_at)
  where status = 'published' and payment_status = 'paid' and admin_approved = true;

create index if not exists job_posts_public_feed_idx
  on public.job_posts (country_id, province_id, created_at desc)
  include (expires_at)
  where is_active = true and status = 'published';

create index if not exists businesses_subcategory_public_feed_idx
  on public.businesses (subcategory_id, country_id, province_id, created_at desc)
  where is_active = true and approval_status = 'approved';

create index if not exists business_photos_business_id_idx
  on public.business_photos (business_id);

create index if not exists business_subscriptions_business_id_idx
  on public.business_subscriptions (business_id);

create index if not exists business_subscriptions_plan_id_idx
  on public.business_subscriptions (plan_id);

create index if not exists businesses_owner_id_idx
  on public.businesses (owner_id);

create index if not exists businesses_category_id_idx
  on public.businesses (category_id);

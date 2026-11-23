-- Allow the primary admin to create multiple administrative storefronts.
-- Each storefront remains individually unique by business_id and username.
DROP INDEX IF EXISTS public.admin_stores_singleton_unique;

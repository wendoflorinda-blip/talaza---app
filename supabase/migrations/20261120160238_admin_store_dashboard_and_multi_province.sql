-- Loja única do Administrador: ligação ao negócio padrão Talaza e áreas por província.
ALTER TABLE public.admin_stores
  ADD COLUMN IF NOT EXISTS business_id uuid NULL REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country_id uuid NULL REFERENCES public.countries(id),
  ADD COLUMN IF NOT EXISTS category_id uuid NULL REFERENCES public.categories(id),
  ADD COLUMN IF NOT EXISTS subcategory_id uuid NULL REFERENCES public.subcategories(id);

CREATE UNIQUE INDEX IF NOT EXISTS admin_stores_business_id_unique
  ON public.admin_stores (business_id)
  WHERE business_id IS NOT NULL;

ALTER TABLE public.admin_store_provinces
  ADD COLUMN IF NOT EXISTS country_id uuid NULL REFERENCES public.countries(id),
  ADD COLUMN IF NOT EXISTS province_id uuid NULL REFERENCES public.provinces(id),
  ADD COLUMN IF NOT EXISTS areas jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_store_provinces_areas_array_check'
      AND conrelid = 'public.admin_store_provinces'::regclass
  ) THEN
    ALTER TABLE public.admin_store_provinces
      ADD CONSTRAINT admin_store_provinces_areas_array_check
      CHECK (jsonb_typeof(areas) = 'array');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS admin_store_provinces_province_id_idx
  ON public.admin_store_provinces (province_id);

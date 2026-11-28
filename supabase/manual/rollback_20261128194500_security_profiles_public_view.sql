-- Rollback manual: Fase 3.1.1 (restaura a política pública original)
REVOKE EXECUTE ON FUNCTION public.talaza_is_same_primary_province(uuid) FROM authenticated;
DROP FUNCTION IF EXISTS public.talaza_is_same_primary_province(uuid);
DROP VIEW IF EXISTS public.profiles_public;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Public can view profiles"
ON public.profiles FOR SELECT TO public
USING (true);

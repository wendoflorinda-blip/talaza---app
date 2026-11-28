-- Fase 3.1.1 (S1): profiles privados e projeção pública restrita
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = (SELECT auth.uid())));

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_barrier = true)
AS
SELECT
  p.id,
  COALESCE(NULLIF(btrim(p.commercial_display_name), ''), NULLIF(btrim(mp.display_name), ''), p.name) AS display_name,
  COALESCE(NULLIF(btrim(p.username), ''), NULLIF(btrim(mp.username), '')) AS username,
  p.avatar_url AS avatar,
  mp.bio
FROM public.profiles p
LEFT JOIN public.media_profiles mp ON mp.user_id = p.id;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.talaza_is_same_primary_province(p_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles actor
    JOIN public.profiles target ON target.id = p_target_user_id
    WHERE actor.id = (SELECT auth.uid())
      AND actor.province_id IS NOT NULL
      AND target.province_id = actor.province_id
  );
$function$;

REVOKE ALL ON FUNCTION public.talaza_is_same_primary_province(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.talaza_is_same_primary_province(uuid) TO authenticated;

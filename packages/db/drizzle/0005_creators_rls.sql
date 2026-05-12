-- =============================================================================
-- 0005_creators_rls.sql
-- Creator profiles + credentials RLS, triggers, and helpers.
-- =============================================================================

CREATE TRIGGER creator_profiles_set_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER credentials_set_updated_at
  BEFORE UPDATE ON public.credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.creator_is_verified(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.credentials
    WHERE creator_profile_id = p_profile_id
      AND verification_status = 'verified'
      AND (expiration_date IS NULL OR expiration_date > current_date)
  );
$$;
GRANT EXECUTE ON FUNCTION public.creator_is_verified(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.credentials FORCE ROW LEVEL SECURITY;

CREATE POLICY "creator_profiles select self or admin"
  ON public.creator_profiles FOR SELECT
  USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "creator_profiles update self"
  ON public.creator_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "credentials select self or admin"
  ON public.credentials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles p
      WHERE p.id = credentials.creator_profile_id
        AND (p.user_id = auth.uid() OR public.is_platform_admin())
    )
  );

CREATE POLICY "credentials delete pending self"
  ON public.credentials FOR DELETE
  USING (
    verification_status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.creator_profiles p
      WHERE p.id = credentials.creator_profile_id AND p.user_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE ON public.credentials FROM authenticated;
REVOKE INSERT ON public.creator_profiles FROM authenticated;

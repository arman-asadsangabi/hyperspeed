-- =============================================================================
-- 0001_auth_and_rls.sql
-- Wires public.users to Supabase's auth.users, sets up updated_at triggers,
-- and enables Row-Level Security with policies on every table.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Link public.users.id → auth.users.id
-- -----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD CONSTRAINT users_id_auth_users_fk
  FOREIGN KEY (id)
  REFERENCES auth.users (id)
  ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- 2. Mirror new auth.users rows into public.users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 3. Auto-update updated_at on row change
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Helper functions (SECURITY DEFINER to avoid recursive RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_member_of(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role_at_least(org_id uuid, min_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND CASE role::text
            WHEN 'owner' THEN 3
            WHEN 'admin' THEN 2
            WHEN 'member' THEN 1
          END
          >=
          CASE min_role
            WHEN 'owner' THEN 3
            WHEN 'admin' THEN 2
            WHEN 'member' THEN 1
          END
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_member_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_at_least(uuid, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Enable RLS on every table
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 6. Policies — public.users
-- -----------------------------------------------------------------------------
CREATE POLICY "users select own"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users update own"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 7. Policies — public.organizations
-- -----------------------------------------------------------------------------
CREATE POLICY "orgs select if member"
  ON public.organizations FOR SELECT
  USING (public.is_member_of(id));

CREATE POLICY "orgs update if admin"
  ON public.organizations FOR UPDATE
  USING (public.has_role_at_least(id, 'admin'))
  WITH CHECK (public.has_role_at_least(id, 'admin'));

-- INSERT/DELETE on organizations only via service_role (server-side).

-- -----------------------------------------------------------------------------
-- 8. Policies — public.organization_members
-- -----------------------------------------------------------------------------
CREATE POLICY "org_members select if same org"
  ON public.organization_members FOR SELECT
  USING (public.is_member_of(organization_id));

CREATE POLICY "org_members delete self or admin"
  ON public.organization_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.has_role_at_least(organization_id, 'admin')
  );

-- INSERT/UPDATE on organization_members only via service_role.

-- -----------------------------------------------------------------------------
-- 9. Policies — public.organization_invitations
-- -----------------------------------------------------------------------------
CREATE POLICY "invitations select if admin or invitee"
  ON public.organization_invitations FOR SELECT
  USING (
    public.has_role_at_least(organization_id, 'admin')
    OR email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "invitations delete if admin"
  ON public.organization_invitations FOR DELETE
  USING (public.has_role_at_least(organization_id, 'admin'));

-- INSERT/UPDATE only via service_role.

-- -----------------------------------------------------------------------------
-- 10. Policies — public.audit_log
-- -----------------------------------------------------------------------------
CREATE POLICY "audit_log select if admin"
  ON public.audit_log FOR SELECT
  USING (public.has_role_at_least(organization_id, 'admin'));

-- No INSERT/UPDATE/DELETE policies — audit_log is service_role-only and immutable.

-- -----------------------------------------------------------------------------
-- 11. Revoke direct table privileges from authenticated role
-- (RLS handles SELECT/UPDATE/DELETE; mutations go through service_role.)
-- -----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.organizations FROM authenticated;
REVOKE INSERT, UPDATE ON public.organization_members FROM authenticated;
REVOKE INSERT, UPDATE ON public.organization_invitations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM authenticated;

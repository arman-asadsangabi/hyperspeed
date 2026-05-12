-- =============================================================================
-- 0003_pack_rls_and_seeds.sql
-- RLS policies for pack-related tables, updated_at triggers, and a category seed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. updated_at triggers on tables that have an updated_at column
-- -----------------------------------------------------------------------------
CREATE TRIGGER packs_set_updated_at
  BEFORE UPDATE ON public.packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER pack_versions_set_updated_at
  BEFORE UPDATE ON public.pack_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER pack_entries_set_updated_at
  BEFORE UPDATE ON public.pack_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Enable + force RLS on every new table
-- -----------------------------------------------------------------------------
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.packs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pack_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pack_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.entry_citations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pack_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tags FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. categories / tags — public read, service-role write
-- -----------------------------------------------------------------------------
CREATE POLICY "categories public read"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "tags public read"
  ON public.tags FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------------
-- 4. packs — members read; admin+ write
-- -----------------------------------------------------------------------------
CREATE POLICY "packs select if member"
  ON public.packs FOR SELECT
  USING (public.is_member_of(organization_id));

CREATE POLICY "packs update if admin"
  ON public.packs FOR UPDATE
  USING (public.has_role_at_least(organization_id, 'admin'))
  WITH CHECK (public.has_role_at_least(organization_id, 'admin'));

-- INSERT/DELETE only via service_role (server actions handle these
-- after running withAudit).

-- -----------------------------------------------------------------------------
-- 5. pack_versions / pack_entries / entry_citations / pack_tags
--    Visibility cascades from packs.organization_id.
-- -----------------------------------------------------------------------------
CREATE POLICY "pack_versions select via pack"
  ON public.pack_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.packs p
    WHERE p.id = pack_versions.pack_id
      AND public.is_member_of(p.organization_id)
  ));

CREATE POLICY "pack_versions update if admin via pack"
  ON public.pack_versions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.packs p
    WHERE p.id = pack_versions.pack_id
      AND public.has_role_at_least(p.organization_id, 'admin')
  ));

CREATE POLICY "pack_entries select via version"
  ON public.pack_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pack_versions v
    JOIN public.packs p ON p.id = v.pack_id
    WHERE v.id = pack_entries.pack_version_id
      AND public.is_member_of(p.organization_id)
  ));

CREATE POLICY "pack_entries update if admin via version"
  ON public.pack_entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.pack_versions v
    JOIN public.packs p ON p.id = v.pack_id
    WHERE v.id = pack_entries.pack_version_id
      AND public.has_role_at_least(p.organization_id, 'admin')
  ));

CREATE POLICY "entry_citations select via entry"
  ON public.entry_citations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pack_entries e
    JOIN public.pack_versions v ON v.id = e.pack_version_id
    JOIN public.packs p ON p.id = v.pack_id
    WHERE e.id = entry_citations.pack_entry_id
      AND public.is_member_of(p.organization_id)
  ));

CREATE POLICY "pack_tags select via pack"
  ON public.pack_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.packs p
    WHERE p.id = pack_tags.pack_id
      AND public.is_member_of(p.organization_id)
  ));

-- INSERT/DELETE on these tables flows through service_role.

-- -----------------------------------------------------------------------------
-- 6. Revoke direct client writes — server-side only
-- -----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.packs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pack_versions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pack_entries FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.entry_citations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pack_tags FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.categories FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tags FROM authenticated;

-- -----------------------------------------------------------------------------
-- 7. Seed canonical categories. Idempotent via ON CONFLICT DO NOTHING.
-- -----------------------------------------------------------------------------
INSERT INTO public.categories (name, slug, description)
VALUES
  ('Tax', 'tax', 'Tax law, accounting, and compliance'),
  ('Legal', 'legal', 'Legal practice areas (contracts, IP, employment, etc.)'),
  ('Medical', 'medical', 'Clinical guidance and medical knowledge'),
  ('Financial', 'financial', 'Banking, investing, financial planning'),
  ('Regulatory', 'regulatory', 'Industry-specific regulations and compliance'),
  ('Engineering', 'engineering', 'Software, hardware, and process engineering'),
  ('Marketing', 'marketing', 'Brand, growth, and marketing operations'),
  ('Sales', 'sales', 'Sales playbooks, prospecting, deal navigation'),
  ('Customer Support', 'customer-support', 'Support practices and escalation paths'),
  ('Healthcare', 'healthcare', 'Healthcare operations, administration, and policy'),
  ('Real Estate', 'real-estate', 'Real estate transactions and investment'),
  ('Education', 'education', 'Pedagogy, curriculum, and academic operations')
ON CONFLICT (name) DO NOTHING;

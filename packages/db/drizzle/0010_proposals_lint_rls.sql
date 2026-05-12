-- =============================================================================
-- 0010_proposals_lint_rls.sql
-- RLS + updated_at triggers for proposed_entries and lint_results.
-- =============================================================================

CREATE TRIGGER proposed_entries_set_updated_at
  BEFORE UPDATE ON public.proposed_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER lint_results_set_updated_at
  BEFORE UPDATE ON public.lint_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.proposed_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lint_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposed_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.lint_results FORCE ROW LEVEL SECURITY;

-- Visibility cascades from the pack via pack_versions
CREATE POLICY "proposed_entries select via version"
  ON public.proposed_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pack_versions v
    JOIN public.packs p ON p.id = v.pack_id
    WHERE v.id = proposed_entries.pack_version_id
      AND public.is_member_of(p.organization_id)
  ));

CREATE POLICY "lint_results select via version"
  ON public.lint_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pack_versions v
    JOIN public.packs p ON p.id = v.pack_id
    WHERE v.id = lint_results.pack_version_id
      AND public.is_member_of(p.organization_id)
  ));

-- INSERT/UPDATE/DELETE only via service_role
REVOKE INSERT, UPDATE, DELETE ON public.proposed_entries FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.lint_results FROM authenticated;

-- =============================================================================
-- 0008_source_docs_rls.sql
-- RLS for source_documents + updated_at trigger.
-- The Storage bucket "source-documents" is created out-of-band via
-- packages/db/scripts/setup-storage.mjs.
-- =============================================================================

CREATE TRIGGER source_documents_set_updated_at
  BEFORE UPDATE ON public.source_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_documents FORCE ROW LEVEL SECURITY;

CREATE POLICY "source_docs select if member"
  ON public.source_documents FOR SELECT
  USING (public.is_member_of(organization_id));

CREATE POLICY "source_docs delete if admin"
  ON public.source_documents FOR DELETE
  USING (public.has_role_at_least(organization_id, 'admin'));

-- INSERT and UPDATE only via service_role (the upload-complete server action).
REVOKE INSERT, UPDATE ON public.source_documents FROM authenticated;

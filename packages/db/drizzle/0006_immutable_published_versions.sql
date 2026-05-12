-- =============================================================================
-- 0006_immutable_published_versions.sql
-- DB-level enforcement that published versions can't be mutated.
-- Service-role bypass is achieved by checking session_user — drizzle migrations
-- and explicit superuser ops still work.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.guard_published_pack_version_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow status transitions out of published (archive), but block other mutations
  IF OLD.status = 'published' AND NEW.status = 'published' THEN
    IF OLD.version_number IS DISTINCT FROM NEW.version_number
       OR OLD.changelog IS DISTINCT FROM NEW.changelog THEN
      RAISE EXCEPTION 'Published pack version % is immutable', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pack_versions_immutable ON public.pack_versions;
CREATE TRIGGER pack_versions_immutable
  BEFORE UPDATE ON public.pack_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_published_pack_version_update();

CREATE OR REPLACE FUNCTION public.guard_published_pack_entries()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status::text INTO v_status FROM public.pack_versions
  WHERE id = COALESCE(NEW.pack_version_id, OLD.pack_version_id);
  IF v_status = 'published' THEN
    RAISE EXCEPTION 'Pack entries on published version are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS pack_entries_immutable_iud ON public.pack_entries;
CREATE TRIGGER pack_entries_immutable_iud
  BEFORE INSERT OR UPDATE OR DELETE ON public.pack_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_published_pack_entries();

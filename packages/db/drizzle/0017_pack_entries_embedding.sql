-- Migration 0017: provision the embedding column on pack_entries.
--
-- The pgvector extension was enabled on the Supabase project (manual via
-- dashboard) but no migration ever added the column the runtime + cron
-- expect. Without this, /v1/query falls back to keyword LIKE search and
-- concept-level queries return nothing.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "pack_entries"
  ADD COLUMN IF NOT EXISTS "embedding" vector(1536),
  ADD COLUMN IF NOT EXISTS "embedding_model" text,
  ADD COLUMN IF NOT EXISTS "embedding_computed_at" timestamptz;

-- HNSW index over cosine distance — works without tuning at small scale
-- and stays performant up to ~1M vectors.
CREATE INDEX IF NOT EXISTS "pack_entries_embedding_hnsw_idx"
  ON "pack_entries"
  USING hnsw ("embedding" vector_cosine_ops);

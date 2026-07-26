-- Trigram GIN indexes so search's ILIKE '%q%' stops doing sequential scans.
-- These cover the high-cardinality columns that matter at scale (millions of
-- posts, 100k+ users, hundreds of projects). Small reference tables (interests,
-- communities) seq-scan cheaply and are intentionally left unindexed.
--
-- NOTE for large production tables: build these CONCURRENTLY (outside a txn) to
-- avoid a write lock:  CREATE INDEX CONCURRENTLY ...  (run manually, not via a
-- migration, since Prisma wraps migrations in a transaction).
CREATE INDEX IF NOT EXISTS "posts_body_trgm"       ON "posts"    USING gin ("body" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_displayName_trgm" ON "users"    USING gin ("displayName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "projects_name_trgm"     ON "projects" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "projects_tagline_trgm"  ON "projects" USING gin ("tagline" gin_trgm_ops);

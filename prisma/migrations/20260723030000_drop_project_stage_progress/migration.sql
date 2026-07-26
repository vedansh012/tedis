-- Projects are a social collection of posts, not a management tool:
-- remove progress/stage tracking.
ALTER TABLE "projects" DROP COLUMN IF EXISTS "stage",
DROP COLUMN IF EXISTS "progress";

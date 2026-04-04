ALTER TABLE "sessions" DROP COLUMN IF EXISTS "project_id";
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "project_name" text;
DROP TABLE IF EXISTS "projects";

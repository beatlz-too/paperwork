CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL UNIQUE,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "prompts" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");

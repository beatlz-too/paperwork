ALTER TABLE "prompts"
  ADD COLUMN IF NOT EXISTS "prompt_id" text DEFAULT '' NOT NULL;

UPDATE "prompts" SET "prompt_id" = "prompt" WHERE "prompt_id" = '';

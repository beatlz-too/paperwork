ALTER TABLE "prompts"
  ADD COLUMN IF NOT EXISTS "cache_read_tokens" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "cache_creation_tokens" integer DEFAULT 0 NOT NULL;

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "cache_read_tokens_total" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "cache_creation_tokens_total" integer DEFAULT 0 NOT NULL;

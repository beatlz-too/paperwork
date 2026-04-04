CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"request_tokens_total" integer DEFAULT 0 NOT NULL,
	"response_tokens_total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_id_unique" UNIQUE("session_id")
);

CREATE TABLE IF NOT EXISTS "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"request_tokens" integer DEFAULT 0 NOT NULL,
	"response_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "prompts" ADD CONSTRAINT IF NOT EXISTS "prompts_session_id_sessions_session_id_fk"
  FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("session_id") ON DELETE no action ON UPDATE no action;

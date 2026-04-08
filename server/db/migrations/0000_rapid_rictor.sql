CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`prompt_id` text DEFAULT '' NOT NULL,
	`tool_name` text DEFAULT '' NOT NULL,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`request_tokens` integer DEFAULT 0 NOT NULL,
	`response_tokens` integer DEFAULT 0 NOT NULL,
	`cache_read_tokens` integer DEFAULT 0 NOT NULL,
	`cache_creation_tokens` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`session_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`project_name` text,
	`request_tokens_total` integer DEFAULT 0 NOT NULL,
	`response_tokens_total` integer DEFAULT 0 NOT NULL,
	`cache_read_tokens_total` integer DEFAULT 0 NOT NULL,
	`cache_creation_tokens_total` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_id_unique` ON `sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `sessions_project_name_idx` ON `sessions` (`project_name`);
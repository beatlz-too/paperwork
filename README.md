# Paperwork

Track **Claude Code session token usage** via OpenTelemetry.  
Built with Nuxt 4, NuxtUI, SQLite, and Drizzle ORM.

---

## How it works

1. Claude Code is configured to export OpenTelemetry spans to this tool's local collector.
2. The collector (`scripts/otel-collector.ts`) receives the spans and writes session and prompt rows into a local SQLite database.
3. The Nuxt web app reads from that database and displays the data in two views:
   - **Session list** — all sessions with token totals
   - **Session detail** — per-prompt breakdown for a single session

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.2

You do not need Docker for the SQLite workflow.

---

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

The default `DATABASE_URL=./data/paperwork.db` works out of the box — no changes needed.
If you omit it entirely, the app and migration scripts still fall back to `./data/paperwork.db`.
If you are importing old data from Postgres, set `SOURCE_DATABASE_URL` to the
old Postgres connection string before running the importer.

### 3. Run database migrations

Creates the SQLite database file and applies the schema:

```bash
bun run db:migrate
```

The database file will be created at `./data/paperwork.db`.

If you ever update the Drizzle schema, generate and apply a new migration:

```bash
bun run db:generate   # generates a new SQL file in server/db/migrations/
bun run db:migrate    # applies pending migrations
```

### 4. Import existing Postgres data

_Postgres is deprecated on this project. You can skip this step if you've installed Paperwork after SQlite was the standard. This is only for migrating from Postgres._

If you already have telemetry in your old Postgres database, import it into the SQLite file with:

```bash
SOURCE_DATABASE_URL=postgresql://user:password@host:5432/db bun run db:import:postgres
```

The importer reads the `sessions` and `prompts` tables from Postgres and copies them into `./data/paperwork.db`.
Keep `DATABASE_URL` pointed at `./data/paperwork.db` for the app and collector.

By default, it refuses to run if the SQLite database already contains rows. If you want to replace the current SQLite contents first, add `--force`.

---

## Running

### Start the OTel collector

The collector must be running **before** you start Claude Code so that spans are captured.

_Project Name_ — an optional argument to group sessions by project. Defaults to the source folder name if omitted.

_Note\*_ - If you forget to run the session with the proper name, you can always change it in the UI's session page, or directly in the database if you feel hacky.

```bash
bun run telemetry <project-name>
```

It listens on `http://localhost:4318` (OTLP/HTTP) and writes to the database in real time.

### Configure Claude Code

Add the following to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_TRACES_EXPORTER": "otlp",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_METRIC_EXPORT_INTERVAL": "10000",
    "OTEL_LOGS_EXPORT_INTERVAL": "5000",
    "OTEL_LOG_TOOL_DETAILS": "1",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json"
  }
}
```

> If you see `rejected /v1/traces payload` in the collector terminal, your exporter
> is sending a different OTLP format. This collector accepts both `http/protobuf`
> and `http/json`, but your `OTEL_EXPORTER_OTLP_PROTOCOL` must match.

### Start the web app

In a separate terminal:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your sessions.

---

## Project structure

```
paperwork/
├── app/
│   ├── pages/
│   │   ├── index.vue                      # Session list
│   │   └── sessions/[sessionId].vue       # Session detail
│   └── app.vue                            # App shell
├── server/
│   ├── api/
│   │   └── sessions/
│   │       ├── index.get.ts               # GET /api/sessions
│   │       └── [sessionId]/
│   │           └── prompts.get.ts         # GET /api/sessions/:id/prompts
│   └── db/
│       ├── schema.ts                      # Drizzle schema
│       ├── client.ts                      # Drizzle client (server-side)
│       └── migrations/
│           └── 0000_rapid_rictor.sql      # Initial schema migration
├── scripts/
│   ├── otel-collector.ts                  # OTLP/HTTP receiver
│   ├── migrate.ts                         # Migration runner
│   └── import-postgres.ts                 # One-time Postgres importer
├── shared/
│   └── types/index.ts                     # Shared Session/Prompt types
├── drizzle.config.ts
└── .env.example
```

---

## Database schema

### `sessions`

| Column                        | Type    | Description                     |
| ----------------------------- | ------- | ------------------------------- |
| `id`                          | text    | Primary key (UUID)              |
| `session_id`                  | text    | Claude Code session ID (unique) |
| `name`                        | text    | Optional session name           |
| `project_name`                | text    | Optional project grouping       |
| `request_tokens_total`        | integer | Cumulative input tokens         |
| `response_tokens_total`       | integer | Cumulative output tokens        |
| `cache_read_tokens_total`     | integer | Cumulative cache-read tokens    |
| `cache_creation_tokens_total` | integer | Cumulative cache-write tokens   |
| `created_at`                  | integer | Session start time (ms epoch)   |
| `last_used_at`                | integer | Last activity time (ms epoch)   |

### `prompts`

| Column                  | Type    | Description                         |
| ----------------------- | ------- | ----------------------------------- |
| `id`                    | text    | Primary key (UUID)                  |
| `session_id`            | text    | References `sessions.session_id`    |
| `prompt_id`             | text    | Stable prompt identifier            |
| `tool_name`             | text    | Tool used for the API call          |
| `prompt_tokens`         | integer | Input tokens for this prompt        |
| `request_tokens`        | integer | Total request tokens for this call  |
| `response_tokens`       | integer | Total response tokens for this call |
| `cache_read_tokens`     | integer | Cache-read tokens                   |
| `cache_creation_tokens` | integer | Cache-write tokens                  |
| `created_at`            | integer | API call time (ms epoch)            |

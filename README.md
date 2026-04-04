# Paperwork

Track **Claude Code session token usage** via OpenTelemetry.  
Built with Nuxt 4, NuxtUI, Supabase (self-hosted), and Drizzle ORM.

---

## How it works

1. Claude Code is configured to export OpenTelemetry spans to this tool's local collector.
2. The collector (`scripts/otel-collector.ts`) receives the spans and writes session and prompt rows into a Supabase Postgres database.
3. The Nuxt web app reads from that database and displays the data in two views:
   - **Session list** — all sessions with token totals
   - **Session detail** — per-prompt breakdown for a single session

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.2
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (for self-hosted Supabase)

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

You'll fill in `DATABASE_URL` after completing the Supabase setup below.

---

## Self-hosting Supabase with Docker

If you don't have a Supabase instance yet, follow these steps to spin one up locally.

### 1. Generate your secrets

Supabase needs three secrets: a random JWT signing key, and two JWTs (`ANON_KEY` and `SERVICE_ROLE_KEY`) signed with it. Run the generator script from inside this project:

```bash
bun run scripts/generate-keys.ts
```

The output looks like this — copy it somewhere, you'll need it in the next step:

```
JWT_SECRET=<jwt-secret>
ANON_KEY=<anon-key>
SERVICE_ROLE_KEY=<service-role-key>
```

### 2. Download the official Supabase Docker Compose setup

Run this in a directory **outside** this project, for example `~/supabase-local`:

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

### 3. Fill in the secrets

Open `supabase/docker/.env` in your editor. Find and replace these four values:

```env
# Pick any strong password for the Postgres superuser
POSTGRES_PASSWORD=your-strong-postgres-password

# Paste the three values from the generate-keys output
JWT_SECRET=<paste JWT_SECRET here>
ANON_KEY=<paste ANON_KEY here>
SERVICE_ROLE_KEY=<paste SERVICE_ROLE_KEY here>
```

Everything else in the file can stay at its default for a local setup.

### 4. Start Supabase

```bash
docker compose up -d
```

This pulls and starts Postgres, PostgREST, the Supabase Studio, and a handful of supporting services. The first run downloads ~1 GB of images and may take a few minutes.

Check that everything came up:

```bash
docker compose ps
```

All services should show `healthy` or `running`. If any are restarting, wait 30 seconds and check again — some services wait for Postgres to be ready before starting.

### 5. Set your connection string

The Postgres database is exposed on port **5432**. Back in `paperwork/.env`, set:

```env
DATABASE_URL=postgresql://postgres:your-strong-postgres-password@localhost:5432/postgres
```

Use the same `POSTGRES_PASSWORD` you chose in step 3.

> **Supabase Studio** is available at [http://localhost:8000](http://localhost:8000). You can use it to browse your tables visually once the migration has run.

### Stopping and restarting Supabase

```bash
# Pause containers (data is preserved)
docker compose stop

# Remove containers but keep data volumes
docker compose down

# Remove everything including all stored data
docker compose down -v
```

---

## Running database migrations

With `DATABASE_URL` set in `.env`, apply the initial schema (creates the `sessions` and `prompts` tables):

```bash
bun run db:migrate
```

This runs `scripts/migrate.ts`, which reads `server/db/migrations/0000_initial.sql` and executes it using the `postgres` package directly.

> **Note:** This uses `docker exec` to run psql inside the `supabase-db` container directly, bypassing Supavisor (the connection pooler that sits in front of port 5432). Connecting to Postgres through the pooler from the host does not work for migrations.

If you ever update the Drizzle schema, generate a new SQL file and apply it the same way:

```bash
bun run db:generate   # generates a new SQL file in server/db/migrations/
bun run db:migrate    # re-run the migration script (update it to include the new file)
```

---

## Running

### Start the OTel collector

The collector must be running **before** you start Claude Code so that spans are captured.

_Project Name_ - This is an optional field that you can use to group your sessions. For example, if you are working on multiple projects, you can use this field to group your sessions by project. If you don't assign a project name, it's going to default to your source folder's name.

```bash
bun run telemetry <project-name>
```

It listens on `http://localhost:4318` (OTLP/HTTP JSON) and writes to the database in real time.

### Configure Claude Code

Add the following to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "env": {
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf"
  }
}
```

Claude Code will now export telemetry spans to your local collector on every session.

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
│           └── 0000_initial.sql           # Initial schema migration
├── scripts/
│   └── otel-collector.ts                  # OTLP/HTTP receiver
├── shared/
│   └── types/index.ts                     # Shared Session/Prompt types
├── drizzle.config.ts
└── .env.example
```

---

## Database schema

### `sessions`

| Column                  | Type        | Description                     |
| ----------------------- | ----------- | ------------------------------- |
| `id`                    | uuid        | Primary key                     |
| `session_id`            | text        | Claude Code session ID (unique) |
| `name`                  | text        | Auto-generated session name     |
| `request_tokens_total`  | integer     | Cumulative input tokens         |
| `response_tokens_total` | integer     | Cumulative output tokens        |
| `created_at`            | timestamptz | Session start time              |
| `last_used_at`          | timestamptz | Last activity time              |

### `prompts`

| Column            | Type        | Description                         |
| ----------------- | ----------- | ----------------------------------- |
| `id`              | uuid        | Primary key                         |
| `session_id`      | text        | References `sessions.session_id`    |
| `prompt`          | text        | Prompt text                         |
| `prompt_tokens`   | integer     | Input tokens for this prompt        |
| `request_tokens`  | integer     | Total request tokens for this call  |
| `response_tokens` | integer     | Total response tokens for this call |
| `created_at`      | timestamptz | Timestamp of the API call           |

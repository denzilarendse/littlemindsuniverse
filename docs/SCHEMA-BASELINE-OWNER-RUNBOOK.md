# LMU schema-only baseline — owner-run recovery procedure

## Why this is required
The historical schema investigation on branch `draven/phase2-schema-inventory-2026-11-05` recorded 45 curated SQL migration files against 97 live migration-ledger entries. A simple filename comparison found 6 exact matches, 32 possible mappings and 59 unmatched live entries. The database package explicitly states that its files are a delta set, not an empty-database bootstrap.

The same investigation recorded 62 public application tables, one private application table, 69 public RLS policies, 140 public/private functions, 18 triggers, 202 indexes and 362 constraints. The current `LMU-V45-TESTING` project is PostgreSQL 17.11 and empty. Do not apply the 45-file delta set to that empty project.

The recovered investigation is available in the historical branch:
`docs/PHASE2-SCHEMA-BASELINE-INVESTIGATION-20261105.md`.

## Safe owner-controlled export

This export must be run on an owner-controlled computer with the database connection string kept locally. Do not paste the connection string into ChatGPT, GitHub, a repository file, terminal transcript or issue.

Prerequisites:
- Supabase CLI installed.
- Docker running (the CLI runs pg_dump in a container).
- Network access to the canonical database.
- An owner-authorised read-only/export connection.

In a local Bash terminal, enter the connection string without echoing it:

```bash
read -rsp "Canonical Supabase database URL: " SUPABASE_DB_URL
export SUPABASE_DB_URL
printf '\n'
bash scripts/export-lmu-schema-baseline.sh
unset SUPABASE_DB_URL
```

The script uses `supabase db dump --db-url ... -f ...`. It does not call `db pull`, `db push`, `db reset`, or any SQL write. It refuses to overwrite an existing export, sets restrictive file permissions, checks for a data COPY block and records a SHA-256 digest.

Default output:
- `artifacts/lmu-schema-baseline/schema.sql`
- `artifacts/lmu-schema-baseline/metadata.txt`

The output directory is local and should not be committed or shared before review.

## Important export limits
Supabase CLI's default `db dump`:
- Exports schema, not table data.
- Does not export custom roles by default.
- Excludes Supabase-managed schemas such as `auth`, `storage`, and extension-managed schemas.
- Does not by itself capture all Auth/Storage customisations, scheduled jobs, secrets, dashboard configuration, Edge Functions, Storage objects or provider settings.

The production inventory recorded extensions `pg_cron`, `pg_net`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, and `uuid-ossp`. The free test project currently has only `pgcrypto`, `pg_stat_statements`, and `uuid-ossp`. Do not install missing extensions indiscriminately; review which ones are required and whether they are available on the free test project.

Before the dump is accepted:
1. Inspect for credentials, tokens, embedded secrets and environment-specific URLs.
2. Confirm the SQL contains no learner, guardian, teacher or submission data.
3. Review ownership and grants. A new Supabase target may have broader default privileges; revoke defaults before restoring, as required by the Supabase CLI documentation.
4. Inventory Auth/Storage customisations separately, especially custom triggers on managed tables and RLS policies on Storage objects.
5. Record extension versions and the configuration required for scheduled jobs. Do not export cron command secrets.
6. Verify function bodies, RLS policies, grants, triggers, indexes, constraints, enums and custom schemas.
7. Compare the dump with the generated database types and the 97-entry live migration ledger.

Do not use `supabase db pull` as a shortcut. Supabase documents that an initial pull can insert a row into the remote migration history. Do not run `db push`, `db reset --linked`, production migrations or a restore over production.

## Replay and acceptance sequence
1. Review and sanitise the owner-generated schema file.
2. Capture separately required Auth/Storage customisations and extension configuration.
3. Assemble a dependency-ordered baseline; do not duplicate the old delta migrations.
4. Start a disposable local Supabase stack using PostgreSQL 17.
5. Replay the baseline from an empty local database.
6. Verify tables, functions, policies, grants, indexes, constraints, triggers and extensions.
7. Run synthetic-only authorization, academic-history and memory tests.
8. Only after local replay passes, request explicit approval before applying the baseline to `LMU-V45-TESTING`.
9. Keep production untouched.

## Official Supabase references
- Supabase CLI `db dump`: https://supabase.com/docs/reference/cli/supabase-db-dump
- Local development workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Backup and restore using the CLI: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

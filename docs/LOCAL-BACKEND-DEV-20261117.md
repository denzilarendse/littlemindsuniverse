# LMU backend development — free/local workflow

**Checkpoint:** 2026-11-17  
**Scope:** PlayWorld + StoryVerse read boundary only. No hosted database writes.

## Cost and safety boundary

- Do not create Supabase cloud branches or paid infrastructure.
- Do not run `supabase link`, `supabase db push`, remote migrations, or production SQL.
- Keep credentials out of source control and chat.
- The migration in this checkpoint is additive and is not yet approved for any hosted database.

## Current implementation checkpoint

- `database/migrations/20261117_lmu_rooms_read_boundary.sql` adds a published-content catalogue and learner activity event table.
- Catalogue and activity rows have RLS enabled.
- Published catalogue reads are available to authenticated users.
- Activity reads delegate to the existing `public.can_access_learner(uuid)` helper.
- Client roles receive SELECT only. Client-side INSERT/UPDATE/DELETE is deliberately unavailable.
- Activity writes are deferred until a narrowly scoped RPC derives the actor from `auth.uid()`, checks learner access, validates published content and enforces event/payload limits.
- Community Garden and all other rooms are outside this first slice.

## Local checks

The repository's existing commands are:

```sh
npm ci
npm run check
node --test tests/room-backend-contract.test.mjs
```

For database-level validation, use a local PostgreSQL/Supabase stack only after Docker/Podman, PostgreSQL and the Supabase CLI are installed. This execution environment previously lacked `psql`, the Supabase CLI, Docker and Podman. The repository's dedicated GitHub Actions workflow now provides real, ephemeral PostgreSQL 17 verification for the scoped room fixture. It does not connect to Supabase and is not a full production-baseline replay.

A disposable, transaction-wrapped role-matrix fixture is provided at `tests/sql/rooms-rls-fixture.sql`. Run it only against a local PostgreSQL instance after creating the dedicated database with `createdb lmu_rooms_test`, then execute `psql -X -v ON_ERROR_STOP=1 -d lmu_rooms_test -f tests/sql/rooms-rls-fixture.sql`. The fixture aborts unless the database name is exactly `lmu_rooms_test` and the server address is loopback, a local Unix socket, or a private RFC1918 address used by an isolated local container network. It seeds synthetic identities, mirrors the canonical learner access helper contract, exercises learner self / verified guardian / unverified guardian / active teacher / unrelated teacher / anon / direct-write boundaries, and rolls back all fixture data.

## Automated database verification

The workflow `.github/workflows/rooms-database-verification.yml` runs on matching pull-request changes and can be started manually. It provisions an ephemeral PostgreSQL 17 service in GitHub Actions, creates the dedicated `lmu_rooms_test` database, runs the Node contract tests, then executes the SQL fixture. It does not connect to Supabase, use project secrets, deploy, or persist the database after the job.

Latest PR-head run `44147682076` completed SUCCESS on commit `c5a2ed67977e76376ffe32814d1f06e1eec97280`. This verifies the scoped room migrations and synthetic role matrix against PostgreSQL 17, not the complete LMU production schema.

## Important migration-chain limitation

The repository's `database/migrations` directory is a delta-migration package, not a complete zero-to-one database bootstrap. A blank local Supabase instance cannot safely replay these deltas without a known-good baseline schema. Do not point local tooling at the hosted LMU project to work around this.

## Baseline recovery status — 2026-11-17 20:34 SAST

- Canonical production project `zcokxljcsfkrlouzragv`: `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.166.
- Isolated free test project `klfvrawkieyqefbpzywq` (`LMU-V45-TESTING`): `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.011.
- Read-only inventory of test project's `public,private` schemas returned zero application tables. No restore or migration was performed.
- Authoritative schema-only dump `database/baselines/lmu-production-schema.sql` is still absent. The completed manifest is also absent; use `database/baselines/MANIFEST.template.md` as the required metadata/review checklist.
- Export script: `scripts/export-lmu-schema-baseline.sh`. Run only on an owner-controlled machine with Supabase CLI and a private local environment variable `SUPABASE_DB_URL`. Never paste the URL or credentials into chat or commit them.
- Review the dump for secrets, row data, environment-specific owners/grants, extension dependencies and managed-schema references before restoring.
- Do not treat the empty test target or ephemeral CI fixture as a production baseline. Do not apply the room migrations to the hosted test project until the reviewed authoritative dump is restored and object parity is checked.

## Next engineering slice

1. Obtain and review the sanitized authoritative schema-only baseline and completed manifest.
2. Restore only into isolated `LMU-V45-TESTING` or local PostgreSQL 17.
3. Compare tables, columns, functions, constraints, indexes, grants and RLS policies with the read-only production inventory.
4. Apply the two room migrations in order to the restored test baseline and rerun PostgreSQL 17 security tests.
5. Confirm PostgREST exposed schemas and RPC exposure before any client adapter work.
6. Keep production database changes and deployment approval-gated; keep demo mode unchanged.

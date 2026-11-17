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

For database-level validation, use a local PostgreSQL/Supabase stack only after Docker/Podman, PostgreSQL and the Supabase CLI are installed. This execution environment currently has Node.js 22 and Java 21, but does not have `psql`, the Supabase CLI, Docker or Podman. Consequently, only Node static contract tests can be executed here; SQL syntax and RLS behavior have not been database-tested. A disposable, transaction-wrapped role-matrix fixture is provided at `tests/sql/rooms-rls-fixture.sql`. Run it only against a local PostgreSQL instance after creating the dedicated database with `createdb lmu_rooms_test`, then execute `psql -X -v ON_ERROR_STOP=1 -d lmu_rooms_test -f tests/sql/rooms-rls-fixture.sql`. The fixture aborts unless the database name is exactly `lmu_rooms_test` and the server address is loopback or a local Unix socket. It seeds synthetic identities, mirrors the existing learner relationship helper's contract, exercises learner self / verified guardian / unverified guardian / active teacher / unrelated teacher / anon / direct-write boundaries, and rolls back all fixture data.

## Automated database verification\n\nThe workflow `.github/workflows/rooms-database-verification.yml` runs on matching pull-request changes and can be started manually. It provisions an ephemeral PostgreSQL 16 service in GitHub Actions, creates the dedicated `lmu_rooms_test` database, runs the Node contract tests, then executes the SQL fixture. It does not connect to Supabase, use project secrets, deploy, or persist the database after the job. A green workflow is the required evidence for PostgreSQL syntax and the fixture's role matrix.\n\n## Important migration-chain limitation

The repository's `database/migrations` directory is a delta-migration package, not a complete zero-to-one database bootstrap. A blank local Supabase instance cannot safely replay these deltas without a known-good baseline schema. Do not point local tooling at the hosted LMU project to work around this. First obtain a sanitized schema-only baseline or a reproducible local fixture, then apply the delta chain and this room migration locally.

## Next engineering slice

1. Run the scoped disposable room RLS fixture on local PostgreSQL and fix SQL errors.
2. Obtain a verified sanitized full LMU schema baseline (no learner data or secrets); the scoped fixture is not a full application baseline.
3. Run the full migration chain against a local copy and add broader database-level tests for learner self, verified guardian, unverified guardian, active teacher, unrelated teacher and anon.
4. Add a server-validated append-only activity RPC and tests.
5. Only then add a feature-flagged client read adapter. Keep demo mode unchanged.

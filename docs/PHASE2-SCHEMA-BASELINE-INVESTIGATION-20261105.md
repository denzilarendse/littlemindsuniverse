# Phase 2 — schema baseline investigation (5 November 2026)

## Scope and safety

This investigation used read-only provider metadata and catalog queries against the canonical production Supabase project `zcokxljcsfkrlouzragv`, plus read-only GitHub inspection at canonical `main` SHA `91289ae8796af660c287a8f94936c94b383b9879`.

No production rows were selected for this report. No production writes, migrations, Auth changes, Storage changes, or Forge operations were performed. The isolated test project was only inspected; it remains empty.

## Canonical repository and migration parity

- Repository: `denzilarendse/littlemindsuniverse`
- Branch: `main`
- SHA: `91289ae8796af660c287a8f94936c94b383b9879`
- SQL files in `database/migrations/`: 45
- Live Supabase migration ledger entries: 97
- The repository's `database/README.md` and `docs/LIVE-MIGRATION-PARITY-20261003.md` explicitly state that the checked-in files are a curated delta set, not a complete empty-database bootstrap.
- A simple normalized-name comparison found 6 exact filename matches and 32 additional possible name mappings; these are not a complete verified replay map. 59 live ledger entries remain unmatched by that simple comparison.
- Do not apply the 45-file delta set to an empty database and do not duplicate live migrations under new filenames.

## Read-only production schema inventory

Catalog inspection returned:

| Object | Count / state |
|---|---:|
| Public application tables | 62 |
| Private application tables | 1 |
| Public tables with RLS enabled | 62 / 62 |
| Public RLS policies | 69 |
| Public/private application functions | 140 |
| Public triggers | 18 |
| Public indexes | 202 |
| Public constraints | 362 |
| Public enum types | 18 |
| Installed extensions | 7 |

Production extension set observed: `pg_cron`, `pg_net`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, and `uuid-ossp`.

The Supabase-generated TypeScript database types were also retrieved as metadata. They are useful for table/column/enum parity, but are not a SQL schema dump and do not replace policies, grants, indexes, triggers, functions, extension configuration, Auth/Storage customizations, or scheduled jobs.

## Isolated test project

- Name: `LMU-V45-TESTING`
- Project ref: `klfvrawkieyqefbpzywq`
- Organization plan: Free
- Project status: `ACTIVE_HEALTHY`
- Application tables: 0
- Migration ledger: 0
- Installed extensions observed: `pgcrypto`, `pg_stat_statements`, `uuid-ossp`
- No synthetic schema or test accounts have been created.

The test project does not currently match production's installed extension set. Production's `pg_cron`, `pg_net`, and `supabase_vault` require an explicit dependency/configuration decision; do not install all available extensions indiscriminately. The documented retention worker uses `pg_cron` and `pg_net`, and its job/secret configuration must be handled separately from the application schema.

The organization and project are Free plan. No paid branch, project, upgrade, or other billable infrastructure was created.

## Mastery/evidence pipeline observations — read-only

The production database exposes the following pipeline elements:

- `create_learner_evidence_item` — authenticated learner evidence capture, learner ownership and assigned/published work checks, guardian consent checks for relevant media, private storage-path checks.
- `decide_learner_evidence` — verified guardian evidence decision, with an `evidence_approval_events` row.
- `review_learner_submission` and `review_learner_submission_v2` — require an authenticated caller, a learning item owned by that caller, a submitted work state, and no pending guardian evidence approval.
- `submission_review_mastery_sync` — AFTER INSERT/UPDATE trigger on `submission_reviews`.
- `sync_review_to_mastery` — derives `mastery_evidence` from a submission review and refreshes `learner_skill_mastery`.
- `refresh_learner_skill_mastery` — derives counts, confidence, trend and latest judgement from evidence rows.
- `generate_milo_mastery_recommendations` — derives recommendations from learner-skill mastery and is classroom-teacher ownership gated.

The review RPCs are SECURITY DEFINER and granted to authenticated callers, but enforce ownership and submission-state checks in their function bodies. The helper `teacher_owns_learning_item` checks item ownership rather than independently checking the caller's role; the learning-item insert policy requires `is_current_user_teacher()`, and untrusted profile-role changes are blocked by a trigger. This should still be included in negative authorization tests as a defense-in-depth check.

Potential evidence-history concern requiring focused verification: the review RPCs upsert a single review per submission, and the mastery sync also upserts the corresponding evidence rows on conflict. No dedicated submission-review event table was present in the current application table inventory. Before accepting the pipeline's history guarantees, verify whether updates to a teacher review preserve prior judgements and approval identity elsewhere; do not silently treat an overwrite as an immutable audit history.

No learner, guardian, teacher, or submission records were read for this review. No pipeline writes or functional tests were performed.

## Baseline acquisition decision

The connector can inspect schema metadata and generated types, but it does not provide a verified complete schema-only SQL export. Hand-assembling a baseline from partial migration files and table metadata would risk omitting constraints, grants, function bodies, RLS, Auth/Storage customizations, or extension dependencies.

Supabase's current CLI documentation describes a default `supabase db dump` as a remote schema dump with no table data or custom roles; the CLI excludes Supabase-managed schemas such as Auth and Storage by default. It also warns that default privileges in a fresh target can grant broader table access unless they are revoked before restoring. The existing project documentation separately requires Auth/Storage customizations and extensions to be accounted for.

**Safe next step:** obtain an owner-controlled, schema-only dump from the canonical project using the Supabase CLI/pg_dump on an owner-controlled machine, with the database connection string kept in a local environment variable and never pasted into chat. Export no production data. Review the dump for managed-schema assumptions, secrets, ownership/privileges, extension statements, and destructive statements before it is committed or applied. Capture required Auth/Storage customizations and non-default extension configuration separately. Then build a dependency-ordered baseline and replay it first in a disposable local Supabase stack, before applying it to `LMU-V45-TESTING`.

Do not use `supabase db pull` as a shortcut without reviewing its side effects: the documented initial pull can insert a row into the remote migration history. Do not run production migrations, create a Supabase branch, restore over production, or copy production data.

## Acceptance status

| Gate | Status |
|---|---|
| Canonical source SHA rechecked | PASS |
| Production schema metadata inventoried read-only | PASS |
| Live migration ledger inventoried | PASS |
| Repository delta/bootstrap boundary confirmed | PASS |
| Test project isolated and empty | PASS |
| Complete schema-only SQL baseline obtained | BLOCKED — owner-controlled dump required |
| Baseline replayed locally from empty database | NOT TESTED |
| Baseline applied to isolated test project | NOT TESTED |
| Synthetic auth and learner fixtures created | NOT TESTED |
| RLS, concurrency, review-history and mastery pipeline tests | NOT TESTED |

## References

- `database/README.md`
- `docs/LIVE-MIGRATION-PARITY-20261003.md`
- `docs/BACKUP-RESTORE-AND-DELETION-GATE-20261003.md`
- Supabase CLI `db dump`: https://supabase.com/docs/reference/cli/supabase-db-dump
- Supabase local development workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Supabase CLI backup/restore: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

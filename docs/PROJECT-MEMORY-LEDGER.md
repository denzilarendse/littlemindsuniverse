# LittleMindsUniverse — Project Memory Ledger

**Ledger version:** 1.1  
**Last scan:** 2026-11-17, current session (UTC+02:00)  
**Canonical repository:** denzilarendse/littlemindsuniverse  
**Working branch:** production/lmu-blueprint-room-shell-20261117  
**Status:** RELEASE HOLD — interactive room demo MVP and backend contract are checkpointed; live room integration, child identity/consent hardening, Android artifact and release verification remain outstanding.

## Objective

Deliver one LittleMindsUniverse web application and Android Capacitor wrapper with twelve connected rooms, one identity model, shared learning progress, guardian consent, teacher workflows, Milo tutoring and child-safe controls, using the supplied LMU blueprint as product scope.

## Source scan and already-complete work

Scanned current project conversation and accessible LMU handover context; project instructions; canonical GitHub PR/branch and ledger; Supabase project, table definitions, helper functions, policies and security advisors; current workflow run summaries; existing Vercel association.

Already present and not rebuilt:
- Shared application shell and role-aware navigation.
- Supabase Auth and learner/guardian/teacher/admin profiles.
- Academy tasks, evidence submission and teacher review.
- Milo server-backed tutoring and session records.
- Shared mastery/progress and classroom workflows.
- Parent reporting, guardian evidence consent/receipts and guardian feature controls.
- LittleMinds Connect messaging, accessibility, PWA and Capacitor wrapper.
- Existing security/RLS migrations.

## Architecture decision

The frozen Phase 1 spec proposed React + TypeScript + Vite. Canonical source is a working static-JavaScript app with Supabase/Capacitor integration and passing tests. Preserve the existing architecture to avoid destructive rework; architecture mismatch remains open for product decision.

## Completed implementation

- Blueprint room demo surfaces and shell navigation for PlayWorld, StoryVerse, Career Galaxy, Adult Academy, Creator Studio, Community Garden, Parent Hub, Teacher Studio and Admin Console.
- Role/age gates, demo/live separation, shared demo mastery, PWA precache and 8 new regression tests.
- Draft PR #112 remains open, draft and unmerged.
- Added `docs/ROOMS-BACKEND-CONTRACT-20261117.md` defining the live data model, role authorization, consent reuse, child PIN requirements, acceptance tests and rollout sequence.
- Added `docs/drafts/rooms-backend-schema.draft.sql`. It is explicitly a design sketch wrapped in a transaction ending with ROLLBACK; it is not a deployable migration and must not be applied as production DDL.
- The schema design reuses existing guardian consent and feature-control tables rather than introducing a parallel consent ledger.

## Current evidence

- PR: https://github.com/denzilarendse/littlemindsuniverse/pull/112
- Latest branch commit after this session's design artifacts: ebfbbdb9f32667d6e24c6f9b329201790da39b63
- Supabase project: zcokxljcsfkrlouzragv; ACTIVE_HEALTHY; PostgreSQL 17.6.
- Existing tables inspected read-only: profiles, learners, guardian_learner_links, guardian_evidence_consents, guardian_evidence_consent_events, guardian_consent_receipts, guardian_feature_controls, learning_items, learning_item_recipients, learner_skill_mastery and mastery_evidence.
- Existing authorization helper `can_access_learner(uuid)` covers learner self, verified guardian and active classroom teacher. Existing guardian consent RPC checks verified primary guardian capability and writes versioned receipts.
- Supabase security advisor snapshot: 14 RLS-enabled tables without policies; 94 SECURITY DEFINER functions executable by authenticated; leaked-password protection disabled; pg_net in public schema. These are pre-existing findings and were not modified. Do not blanket-revoke functions; assess each dependent flow.
- Current PR metadata: open, draft, unmerged; mergeable reported false after latest docs commits. Recheck branch/merge status before any merge consideration.
- CI/workflow summary: earlier 2 release/public checks completed successfully; Android verification was still in progress at the last observed workflow snapshot. New docs-only commits have no workflow run returned yet.
- A Vercel preview deployment was building at last observation. This is a preview, not a production release.

## Test results (last code verification)

- `npm run check`: PASS — 313 tests, syntax scan 117 JS files, smoke tests and static build.
- `npm run android:sync`: PASS.
- `npm audit --omit=dev`: PASS — zero production dependency vulnerabilities; full install audit has 6 moderate dev dependency advisories.
- Android APK: NOT BUILT — previous sandbox lacked Java/JAVA_HOME.
- Hosted authenticated browser E2E: NOT RUN.
- Live RLS/API integration for new rooms: NOT IMPLEMENTED OR TESTED.
- Current schema contract and SQL sketch are documentation-only; no SQL test or migration executed.

## Outstanding work

1. Create a disposable/local Supabase test environment and implement migration plus positive/negative role-matrix tests.
2. Define and implement the validated append-only room activity RPC and catalogue publication/moderation model.
3. Implement server-backed room reads/writes and integrate with existing mastery/review pipeline.
4. Implement Community Garden reporting, human moderation, guardian opt-in and age gates on the server.
5. Implement cross-device guardian time limits and quiet hours.
6. Resolve adult learner identity/age verification; current role model does not establish Adult Academy eligibility.
7. Design and implement child profile unlock/PIN only after security model approval; never store plaintext PIN or create a duplicate child identity.
8. Verify Milo memory/data minimization and multilingual content/narration; verify South African career qualification/salary data before making claims.
9. Complete live Parent Hub, Teacher Studio and Admin Console operations.
10. Resolve React-vs-static-JS architecture conflict.
11. Build/sign Android APK/AAB in JDK 21 + Android SDK environment and test on physical devices.
12. Run hosted authenticated E2E, RLS negative tests, backup/restore and rollback checks.
13. Resolve pre-existing Supabase advisor findings through separate scoped work.

## Risks and blockers

- New room pages are still demo-only, not live-backed.
- Child safety cannot rely on UI-only age checks, client PII regexes or localStorage.
- Current user/consent model differs from blueprint's child PIN-first onboarding; must preserve guardian-first authority and legal review.
- 14 existing RLS tables without policies and 94 authenticated-callable SECURITY DEFINER functions warrant a separate security remediation programme.
- POPIA/legal review is needed for consent language, retention, age thresholds and cross-border processing.
- Android build environment/signing and hosted E2E are unavailable/unverified.
- Production release remains on hold.

## Approvals and deployment

- No live migration applied and no production data changed.
- No production deployment or main-branch merge performed.
- Explicit approval remains mandatory before live DB migrations and production deployment.
- PR #112 remains draft/unmerged.

## Recovery instructions

Continue on `production/lmu-blueprint-room-shell-20261117`. Re-run `npm ci --ignore-scripts && npm run check`. Android commands: `npm run android:sync`, `npm run android:apk`, `npm run android:bundle`. Never commit keystores, passwords or service-role secrets. Do not reset/delete/modify live Supabase as a shortcut.

## Next phase brief

Implement the backend contract in a local or disposable Supabase branch, starting with content catalogue and append-only activity, then community moderation. Write SQL role-matrix tests before enabling Data API grants. Keep live migration and production deployment approval-gated. Separately triage existing advisor findings without blanket policy/function changes.

## Free local backend checkpoint — 2026-11-17

- User decision: pause paid Supabase branch work and continue using free/local tooling only.
- No Supabase cloud branch was intentionally created, no live migration was applied, and no production data was changed in this checkpoint.
- Added `database/migrations/20261117_lmu_rooms_read_boundary.sql`: additive PlayWorld/StoryVerse catalogue + activity schema, RLS read policies, published-only catalogue visibility, activity visibility through existing `can_access_learner(uuid)`, explicit authenticated SELECT grants, and no client write grants/policies.
- Added `tests/room-backend-contract.test.mjs`: five static contract tests for additive scope, publication audit, relationship-scoped reads, read-only grants and payload bounds.
- Added `docs/LOCAL-BACKEND-DEV-20261117.md`: free/local workflow and migration-chain constraints.
- Verification actually performed: isolated Node.js 22 run of the five new static contract tests — 5 passed, 0 failed. The test and migration were mirrored into a temporary local directory for execution; repository clone was unavailable because this runtime cannot resolve github.com.
- Not run: full `npm run check`, SQL parser/database execution, RLS role-matrix tests, Supabase CLI, Docker/Podman. Environment has Node.js 22 and Java 21; `psql`, Supabase CLI, Docker and Podman are absent.
- Important limitation: existing database migrations are documented as deltas, not a zero-to-one bootstrap. A sanitized baseline/local fixture is required before a full local PostgreSQL run.
- No UI client adapter or write RPC was added; live room activity remains disabled. Demo behavior remains unchanged.

- Follow-up verification note: the temporary local run exercised an equivalent five-assertion Node contract harness against a mirrored copy of the SQL; the repository's committed test file has not yet been run from a full checkout. A direct Git clone could not resolve github.com in the local runtime.
- GitHub PR #112 now points to commit `9fcfdffd5e8d0cbc152801347fbd6eaa77aa7f90`; PR remains open, draft and unmerged. GitHub Actions checks `verify`, `verify-android` and `verify-package-deploy` were observed in progress; Vercel Preview Comments check succeeded. These CI jobs are not yet a pass at this checkpoint.

## Local RLS fixture checkpoint — 2026-11-17

- Added `tests/sql/rooms-rls-fixture.sql`, a disposable transaction-wrapped PostgreSQL fixture using synthetic identities only. It mirrors the minimal contract of the existing learner access helper and exercises learner-self, verified guardian, unverified guardian, active classroom teacher, unrelated teacher, published-only catalogue, anon grants and direct-write denial. Ends with ROLLBACK.
- Added `tests/room-backend-rls-fixture.test.mjs` static guard tests and updated `docs/LOCAL-BACKEND-DEV-20261117.md` with the exact local psql command.
- Test repair: initial isolated test run exposed a brittle test assertion requiring the SQL file to start directly with BEGIN despite the required safety comment header. Fixed assertion to locate BEGIN after the comment. This was a test-harness defect, not a migration failure.
- Verification: 8/8 Node static contract tests passed in a temporary isolated mirror of the committed migration/fixture files. This is not execution of PostgreSQL SQL or proof of actual RLS runtime behavior.
- Environment rechecked: `psql`, `postgres`, `initdb`, `pg_ctl`, Docker, Podman and Supabase CLI are unavailable. GitHub clone is also unavailable from the local runtime due DNS/network restrictions. No local database was started.
- No live database reads or writes were made in this continuation; no paid infrastructure created.
- Next: provision a free local PostgreSQL runtime outside this restricted container or use a user-controlled local machine, run the fixture exactly as documented, then acquire a sanitized full LMU schema-only baseline before full migration-chain testing.

## Fixture safety and static-test correction — 2026-11-17

- Hardened `tests/sql/rooms-rls-fixture.sql`: it now refuses to run unless `current_database() = 'lmu_rooms_test'` and the PostgreSQL server is reached over loopback or a local Unix socket. The documented command creates and targets that dedicated local database.
- Corrected static fixture assertions for the SQL safety-comment wording and dollar-quoted DO blocks. The earlier failures were brittle assertions in the test harness; no SQL execution occurred.
- Re-ran the isolated Node test mirror after these fixes: 8 tests passed, 0 failed. This remains static text/contract verification only; actual PostgreSQL parsing and RLS execution are still unverified because database binaries are absent.
- The committed fixture is transaction-wrapped and ends in ROLLBACK; its safety guard is an additional defence, not permission to run it against any hosted database.

## PostgreSQL execution checkpoint — 2026-11-17

- Added `.github/workflows/rooms-database-verification.yml`: pull-request path-triggered + manual workflow provisions an ephemeral PostgreSQL 16 service; no Supabase secrets, hosted DB, migrations or deployments are used.
- Executed the real SQL migration and RLS fixture successfully in GitHub Actions on a disposable PostgreSQL 16 instance. Check: `Disposable PostgreSQL RLS fixture` SUCCESS on commit `bf5033837d3b7470ef89abd41b20cfb3d2bdf56b`. The eight Node contract/static fixture tests also passed in that job. The database fixture exercises learner self, verified guardian, unverified guardian, active classroom teacher, unrelated teacher, published-only catalogue, anon SELECT denial and direct activity INSERT denial; fixture transaction rolls back.
- Two CI issues were discovered and corrected from actual logs: (1) SQL DO delimiters had been malformed in portions of the fixture; (2) GitHub's isolated Docker service connects over a private bridge address rather than loopback, so the safety guard was expanded to permit RFC1918 private addresses while still requiring the dedicated `lmu_rooms_test` database. A later test caught a literal escaped-newline defect in that guard; it was replaced with real SQL newlines. Final PostgreSQL job passed after corrections.
- Full repository `verify` check passed on the same commit. `verify-package-deploy` and `verify-android` were still running at the last observation; no deployment or merge was performed.
- This is a successful test of the scoped synthetic fixture and room migration, NOT a full LMU schema migration chain test and NOT a live Supabase verification.
- No live database reads/writes, paid branch, production deploy or merge were performed.

## Canonical learner-access parity checkpoint — 2026-11-17

- Compared `public.can_access_learner(uuid)` against the source migration `database/migrations/20260920_teacher_learner_read_access.sql`.
- Corrected the disposable PostgreSQL fixture to mirror the canonical helper exactly: learner self via `learners.user_id = auth.uid()`; guardian via verified `guardian_learner_links`; teacher via active classroom + active membership. The fixture no longer adds its own extra learner-active predicates that the canonical helper does not contain.
- Added static assertions that the fixture's helper matches those three canonical relationship conditions.
- Final scoped PostgreSQL 16 CI job and all eight room contract/fixture tests passed on commit `03d32a9998c7fc5418088f63af5b63a1e40bce45`. This confirms the room migration parses and the synthetic role matrix passes against a fixture that mirrors the canonical helper source.
- On that commit, repository `verify` and `verify-package-deploy` passed; Android verification was still running at last observation. No production deploy was triggered by this PR check; PR remains draft/unmerged.
- Scope remains only PlayWorld + StoryVerse read-boundary foundation. This does not validate the full LMU migration chain or hosted Supabase RLS.

## Approved activity RPC implementation checkpoint — 2026-11-17

- User explicitly approved proceeding with the next security-sensitive action: implement the validated append-only room activity RPC. Approval was limited to development-branch implementation and testing; it did NOT authorize applying migrations to live Supabase, deploying production, merging PR #112, or changing production data.
- Added `database/migrations/20261117_lmu_rooms_activity_write_rpc.sql` defining `public.record_room_activity`.
- RPC accepts learner id, room key, content item id, event type, compact result JSON and optional duration. It accepts no actor id or event timestamp. Actor is `auth.uid()`; timestamps use database defaults.
- Authorization is deliberately narrower than read access: requires an active learner row owned by the authenticated user and profile role `learner`. Guardians and teachers retain relationship-scoped read access but cannot write events as a learner.
- Validates PlayWorld/StoryVerse room keys, allowlisted event types, published content, matching room, compatible learner stage and preferred language. Payload keys are limited to `score`, `correct_count`, `total_count`, `attempts`, `progress`, `outcome`, `completed`; nested/free-text/arbitrary keys are rejected; payload is capped at 2 KB; duration is 0–7200 seconds.
- Adds a serialized per-actor rate cap of 30 events/minute using a transaction advisory lock and actor/time index. RPC execution is revoked from PUBLIC and anon and granted to authenticated. Direct table INSERT/UPDATE/DELETE remain unavailable.
- Updated disposable fixture to test learner-self successful write and server-derived actor; verified guardian and teacher write denial; invalid free-text result and draft content rejection; plus RPC execution grant checks by role. Fixture still ends with ROLLBACK.
- Added `tests/room-backend-write-rpc.test.mjs` (5 static security contract tests); workflow now runs all `tests/room-backend-*.test.mjs` and provisions disposable PostgreSQL 16.
- CI evidence on commit `118647a4de9eff319e1678cd7d6d14256211914c`: Node contract suite passed (13 tests); disposable PostgreSQL 16 fixture completed successfully and rolled back; repository `verify` passed. Android and package/deploy checks were still running at last observation.
- During verification, actual failures exposed fixture-only defects: auth schema privileges were not mirrored, a DO delimiter was malformed, and an earlier migration transaction wrapper committed the fixture. Each was corrected; final PostgreSQL job passed and log explicitly showed ROLLBACK.
- No Supabase production migration, live data write, paid branch, production deployment, PR merge or app integration was performed.
- Open design consideration before client integration: confirm the project's PostgREST exposed-schema configuration and keep the RPC's execute privileges limited to authenticated; current function is in public to be callable via standard Supabase RPC. Consider a private-schema internal helper if project API configuration supports a wrapper without widening exposure.
- Next: verify remaining CI jobs; obtain a sanitized full LMU schema baseline; run migration chain and Supabase-specific compatibility/advisor checks; only then implement feature-flagged client adapter. Live migration and deployment remain separate approval gates.


## Full LMU database compatibility and migration-chain audit — 2026-11-17

- Read-only inspection of Supabase project `zcokxljcsfkrlouzragv`: ACTIVE_HEALTHY, PostgreSQL 17.6.1.166. No SQL DDL, data writes, migration application, branch creation, or deployment was performed.
- Live migration ledger: 97 applied migrations, latest `20261014133549 phase1j_security_hardening`.
- Canonical PR head tree `50cec4776baa28eb864c43026026d8565781089d` contains 47 SQL files under `database/migrations`, including the two new 20261117 room migrations. After normalizing date prefixes/suffixes, only 38 migration names match the live ledger; 59 live migration entries have no corresponding source file in this branch tree, and 9 repository migration files do not map to a live ledger name. Therefore the repository does NOT currently contain a reproducible complete migration chain. This is a BLOCKER for claiming full-chain compatibility or running a trustworthy zero-to-current replay.
- Current live public schema snapshot: 62 public base tables, 663 columns, 137 public functions, 69 RLS policies. RLS is enabled on all 62 public base tables; 14 of those tables have no policies (default deny for ordinary roles, but likely operationally inaccessible until intended policies are supplied). No public base table without RLS was found.
- Existing shared prerequisites for the room migrations are present and structurally compatible by catalog inspection: `public.profiles`, `public.learners`, `public.can_access_learner(uuid)`; learner fields `user_id`, `active`, `learning_language`, `home_language`, `stage_code`; profile fields `role`, `preferred_language`; `app_role` includes `learner`. The canonical helper exists and supports learner-self, verified guardian and active classroom teacher reads.
- Room tables `room_content_items` / `room_activity_events` and RPC `record_room_activity` are absent from live Supabase, as expected because neither room migration has been applied. New migration references were inspected against live catalog metadata, but not executed against a full LMU schema.
- PostgreSQL is 17.6.1 in hosted Supabase; existing disposable room fixture CI uses PostgreSQL 16. This is a version-parity difference to retain in test planning.
- PostgREST exposed-schema configuration could not be established from available read-only SQL settings or connector metadata; do not assume `public` exposure configuration. Confirm in Supabase Data API settings before client RPC integration.
- Security advisor snapshot (2026-11-17): 14 RLS-enabled public tables without policies; 94 SECURITY DEFINER functions executable by authenticated; leaked-password protection disabled. These are pre-existing findings. No blanket grants, policy changes or function revocations were made.
- Compatibility conclusion: EXISTING ROOM MIGRATION PREREQUISITES — PARTIALLY VERIFIED; FULL LMU MIGRATION-CHAIN VERIFICATION — BLOCKED. A complete, sanitized migration archive (all 97 applied migrations) or an authoritative schema-only dump plus migration provenance is required. Then replay in free local/disposable PostgreSQL 17, execute room migrations, compare resulting catalog with a sanitized live schema baseline, and run role-matrix tests. No paid branch or hosted mutation is needed for this next stage.
- Approval boundary unchanged: no live migration, production data change, merge or production deployment is authorized by this audit.

### Next phase brief
1. Recover the 59 unmatched applied migration source files or obtain a trusted sanitized full schema-only baseline with migration provenance.
2. Establish a free PostgreSQL 17 test runner (local machine or ephemeral CI) and replay the canonical migration sequence.
3. Run room migrations after the baseline, inspect catalog/grants/RLS/functions and compare to live schema metadata.
4. Confirm PostgREST exposed schemas and assess whether the SECURITY DEFINER RPC should use a private internal helper plus narrow exposed wrapper.
5. Only after those checks, implement feature-flagged PlayWorld/StoryVerse client reads/writes. Keep live DB and production release approval-gated.


## Schema baseline recovery and PostgreSQL 17 test environment — 2026-11-17

- Re-scanned canonical main, current PR branch, schema-inventory branch, Phase 2 checkpoint, Architecture 2.0 and Phase 1J branch trees. Queried GitHub commit history for representative unmatched migration paths; no historical source-file commits were found for those samples.
- Important correction to the previous audit wording: the 59 unmatched live ledger entries are not proven lost source files. Existing canonical documentation (`database/README.md`, `docs/LIVE-MIGRATION-PARITY-20261003.md`, `docs/PHASE2-SCHEMA-BASELINE-INVESTIGATION-20261105.md`) explicitly identifies the checked-in migration directory as a curated delta set, not a full historical bootstrap. Some timestamp/name variants are intentionally mapped to shorter filenames; older migrations predate the curated folder. Do not invent or duplicate 59 migrations.
- Recovery route selected: authoritative schema-only snapshot of current production application schemas, exported by owner-controlled Supabase CLI/pg_dump. The connected Supabase tools can inspect metadata but do not expose a safe schema-dump/export operation or production DB connection URL. No credential was requested or exposed.
- Added `scripts/export-lmu-schema-baseline.sh`. It requires a locally supplied `SUPABASE_DB_URL`, exports only `public,private` schema DDL (no row data), validates that the output is non-empty and contains expected schema objects, and writes `database/baselines/lmu-production-schema.sql`. Bash syntax check passed in the current container. The script has not been run because this environment has no Supabase CLI or DB connection URL.
- Added `database/baselines/README.md` documenting secure export, review, manifest, managed-schema boundaries and replay plan. No dump or credentials were committed.
- Reused the previously created isolated project `LMU-V45-TESTING` (`klfvrawkieyqefbpzywq`). Organization plan was verified as Free. Project reports PostgreSQL 17.11.0.011. It was INACTIVE; restore was requested and returned success. At the latest check its state was still `COMING_UP`; wait for `ACTIVE_HEALTHY` before database queries. No schema, migration or data has been applied to it.
- Local container has Node 22 and Java 21 but no `psql`, `pg_dump`, `postgres`, `initdb`, Docker or Podman. `apt-get update` timed out; no local PG installation was completed. A free hosted PostgreSQL 17 test target is being brought online instead.
- Verification: export script `bash -n` PASS; no schema export or migration replay performed yet.
- Next: (1) wait for the isolated Free PostgreSQL 17 project to become healthy; (2) obtain the owner-controlled schema-only dump using the new script; (3) review the dump locally for secrets, data statements, grants, extension dependencies and Supabase-managed object references; (4) supply the reviewed dump as a repository artifact; (5) restore it only to the isolated test project; (6) apply the two room migrations in order and run SQL/RLS/privilege compatibility checks; (7) compare catalog metadata against production. Do not apply any migration to production.


## PostgreSQL 17 CI environment checkpoint — 2026-11-17 19:20 SAST

- Upgraded `.github/workflows/rooms-database-verification.yml` disposable PostgreSQL service from `postgres:16` to `postgres:17`, so the free GitHub-hosted runner provides a clean, disposable PostgreSQL 17 environment on every PR verification run. No persistent paid infrastructure is required.
- Commit: `6b76e60ea001eb86c3c4460a6556f8f512dab128`.
- New PR run `44135396421` (LMU local room database verification) was observed in progress at container initialization. It runs the room migration fixture and authorization matrix on PostgreSQL 17; results are pending.
- New PR run `44135396370` (public-release) is triggered by `pull_request`. The workflow YAML confirms production Android signing and Netlify deployment steps are guarded to run only on `push` to `main`; therefore those production actions are intentionally skipped for this PR run. No production deployment is authorized or expected.
- The existing Free Supabase test project `klfvrawkieyqefbpzywq` remains `COMING_UP` after restore request. It reports PostgreSQL 17.11.0.011. Database operations still return unavailable while starting.
- Full schema baseline replay remains blocked until the owner-controlled export script is run with a local database connection URL and the reviewed schema-only SQL is made available. The GitHub-hosted PostgreSQL 17 fixture is not a substitute for the complete production baseline.
- Current scope: no live DB writes, no schema migrations applied to hosted Supabase, no production deploy, no merge.


### PostgreSQL 17 disposable fixture result — 2026-11-17 19:24 SAST
- GitHub Actions run `44135396421` for commit `6b76e60ea001eb86c3c4460a6556f8f512dab128` completed SUCCESS.
- The GitHub-hosted disposable PostgreSQL 17 service initialized successfully; database creation passed; room backend static contract tests passed; SQL migration and RLS role-matrix fixture passed; cleanup completed.
- This verifies the existing room fixture on PostgreSQL 17, not a replay of the full LMU production schema baseline. Full-chain replay remains BLOCKED pending owner-controlled schema export.
- Supabase Free test project remains `COMING_UP`; it is not yet queryable. No migration was applied to it.

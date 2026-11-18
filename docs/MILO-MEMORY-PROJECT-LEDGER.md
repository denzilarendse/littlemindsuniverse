# Milo Memory and Academic History — Project Ledger

Ledger version: 1.2
Updated: 18 November 2026
Repository: denzilarendse/littlemindsuniverse
Working branch: codex/milo-memory-academic-history-v1
Draft PR: #116
Last inspected head: 5331f967ca02cda30aa2e9f5046983dd3bcfe61e

## Objective
Implement the minimum-additive Milo Memory and Academic History layer using existing LMU academic evidence, then connect it to Milo only after authorization and isolated PostgreSQL 17 verification. Production must remain untouched.

## Binding constraints
- Controlled autonomous execution; one phase slice at a time, verified and checkpointed.
- No production database writes, migrations, RLS changes, learner data access or deployment.
- Service-role Supabase access is privileged and bypasses RLS; a fail-closed application authorizer is mandatory before each operation.
- No database migration without explicit approval, including isolated test-project migration.
- Do not replay the historical 45-file migration delta into an empty project.
- Keep parent and service memory access disabled until source-backed consent and service-identity policies are verified.
- Do not expose connection strings or secrets.

## Decisions and rationale
1. Reuse existing submissions, reviews, mastery, learning events, verification cycles, recommendations and weekly reports. Do not create duplicate academic-history or mastery tables.
2. Add only learner_memory_items and append-only learner_memory_events in the proposed schema.
3. Memory projection writes must use one PostgreSQL RPC per lifecycle operation so projection and event commit atomically.
4. Keep Supabase adapters server-only; no browser service-role use.
5. Require verified curriculum subject provenance before subject-specific mastery enters Milo context. Unscoped evidence is excluded and disclosed.
6. Deny parent academic-history/memory actions pending explicit consent and data-minimisation policy. Parent memory reads remain denied.
7. Deny admin learner-history access by default. Service actors can only expire memory after a trusted identity is established.
8. Do not wire the services into /api/milo until the schema baseline and authorizer dependencies are verified.

## Completed work
- Supabase academic-history adapter reads 12 existing source tables, scopes by learner UUID, applies date bounds, paginates at 500 rows with a 10,000-row per-source cap, and batches related IDs.
- Supabase memory adapter reads proposed memory tables and calls atomic RPC contracts for propose, confirm, update, dispute, withdraw and expire.
- Memory validation enforces UUIDs, allowlisted categories/sources/visibility, strict numeric confidence, bounded JSON-object values and sensitive-key/text rejection.
- Memory service enforces role/action gates, teacher-only approval/update, anti-enumeration responses and teacher/service-only memory event history.
- Context orchestrator separates assisted/independent evidence, requires reviewed curriculum objectives and excludes subject-unscoped evidence when a subject is requested.
- Fail-closed authorizer requires resolver injection. Supabase authorizer checks active learner ownership and delegates teacher classroom access to authenticated can_access_learner(p_learner_id). Parent and service paths currently return false.
- PostgreSQL 17 memory schema/RPC/RLS proposal created at docs/sql/MILO-MEMORY-CORE-PROPOSAL.sql. Proposal only; not a migration.
- Owner-run schema-only exporter and runbook created: scripts/export-lmu-schema-baseline.sh and docs/SCHEMA-BASELINE-OWNER-RUNBOOK.md.
- Targeted regression tests: 26 memory/academic-history/adapter/authorization cases. Local Node test for export script: 3 cases. Shell syntax check: PASS.
- No code merged; PR #116 remains draft.

## Schema recovery evidence
Historical branch draven/phase2-schema-inventory-2026-11-05 contains the read-only Phase 2 schema investigation:
- 45 curated SQL migration files vs 97 live migration ledger entries.
- 6 exact filename matches, 32 possible mappings, 59 unmatched entries.
- 62 public tables, one private table, 69 RLS policies, 140 public/private functions, 18 triggers, 202 indexes, 362 constraints.
- Repository README explicitly says the files are a curated delta, not an empty-database bootstrap.
- Test project LMU-V45-TESTING is PostgreSQL 17.11 and empty (0 public tables, 0 applied migrations).
- The historical can_access_learner(p_learner_id uuid) function checks learner self, verified guardian link or active classroom teacher membership. This signature is from a historical migration branch and must be revalidated against the restored baseline.
- No production queries or writes were made in this implementation phase.

## Verification
- In-session isolated module harness: 26/26 passed.
- Local shell syntax: bash -n PASS.
- Owner-exporter static tests under Node's native runner: 3/3 passed.
- Earlier repository-native GitHub Actions head 115e30ba582f96305449d9210773c83cfa725f46: dependency audit, lint, full test suite, production build and deployable-artifact hygiene passed.
- Latest head 48dde4bcbd12f8b924c03baed3b0b90f2c565e99: release-verification PASS (npm ci, dependency audit, lint, full npm test, production build and artifact hygiene). Public-release Android packaging and Android verification remained in progress at last inspection.
- Vercel preview checks on recent heads succeeded; no production deploy.

## In progress
- Public-release Android packaging and Android verification for the latest head.
- Owner-run schema-only dump is prepared but not executed; owner keeps the DB URL locally.
- No isolated PostgreSQL schema baseline or memory migration has been applied.

## Blockers and risks
- Authoritative complete schema-only baseline absent.
- Auth/Storage customisations, extension setup, scheduled jobs, grants and custom roles require separate review.
- Historical migration delta is incomplete and cannot be replayed from empty.
- Teacher helper function and profile role semantics need confirmation against the restored current schema.
- Parent consent, service actor and retention/deletion policies remain unresolved.
- RPC functions use service_role; route-level authorization is a release blocker until bound to authoritative helpers and tested against hostile cross-learner cases.
- South African privacy/legal review remains required before real learner memory storage.

## Approval gates
- Explicit approval required before applying the baseline or memory schema proposal to LMU-V45-TESTING.
- Explicit approval required before production migrations, RLS/auth changes, merge or deployment.
- No approval requested or assumed in this checkpoint.

## Recovery instructions
- Continue from PR #116 branch; do not recreate services.
- Recheck current PR head and CI before editing.
- Run owner export script only on owner-controlled machine with local SUPABASE_DB_URL; never ask for the connection string.
- Review/sanitise export and replay in disposable local PostgreSQL 17 before requesting approval for the isolated test project.
- Keep generated schema dump ignored under artifacts/lmu-schema-baseline/.

## Next phase brief
1. Wait for latest-head GitHub Actions.
2. Owner generates and reviews schema-only baseline using the supplied script.
3. Reconcile full schema with migration ledger and Auth/Storage/extension/job customisations.
4. Replay locally from empty PostgreSQL 17.
5. Request explicit approval before applying the reviewed baseline to LMU-V45-TESTING.
6. Verify FK/helper signatures, RLS, grants and memory RPC atomicity.
7. Only after that, bind authorizer to /api/milo and add feature-flagged integration tests.

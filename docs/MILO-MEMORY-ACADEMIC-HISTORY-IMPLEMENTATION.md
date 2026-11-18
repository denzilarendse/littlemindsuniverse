# Milo Memory and Academic History — Isolated Implementation v1.1

## State and boundary
Implemented prototype on a draft branch. The services and Supabase adapters are not connected to `/api/milo`, production data or a live database migration. Synthetic tests only.

## Components
- `memory-validation.js`: strict UUID/category/source/visibility/confidence/value validation; rejects sensitive-key patterns and common sensitive personal-data terms.
- `memory-service.js`: propose, confirm, update, dispute, withdraw and expire lifecycle. Database writes are delegated to one atomic RPC per operation.
- `academic-history-service.js`: aggregates 12 existing submission, review, mastery, Milo session/event, assistance, verification, recommendation and weekly-report sources.
- `context-orchestrator.js`: bounds confirmed memory and academic evidence, separates independent/assisted evidence, requires reviewed curriculum objectives, and excludes mastery evidence without matching verified subject provenance when a subject is requested.
- `supabase-adapters.js`: server-only PostgREST reads via the existing `adminGet` and atomic memory RPC calls via `adminRpc`. Never import into browser code.
- `authorizer.js`: fail-closed role/action policy requiring injected ownership, teacher-classroom, parent-consent and trusted-service resolvers.

## Supabase adapter contract
Academic repository provides 12 source methods. Reads are scoped by learner UUID, apply date bounds, paginate at 500 rows/page with a 10,000-row per-source safety cap, and resolve dependent IDs in batches of 100. Reviews, verification observations and recommendation decisions are fetched only through IDs derived from the requested learner's own records.

Memory repository reads the proposed `learner_memory_items` and `learner_memory_events` tables. Writes call:
- `milo_memory_propose`
- `milo_memory_confirm`
- `milo_memory_update`
- `milo_memory_transition` (dispute, withdraw or expire)

Each database RPC must update the memory projection and append its event in the same PostgreSQL transaction. The adapter does not simulate transactions using multiple REST calls.

Subject-specific academic-history API is intentionally unavailable (HTTP 501) until complete subject mapping is verified. The Milo context orchestrator only includes mastery evidence whose resolved `skills.subject` or `learning_items.subject` matches the requested subject; unscoped evidence is excluded and disclosed.

## Authorization contract
- Learner: active ownership resolver; may read/propose/dispute/withdraw own memory, never confirm/update.
- Teacher: active classroom-access resolver; may read and perform teacher memory decisions only for accessible learners.
- Parent: verified relationship and applicable consent resolver; may access permitted academic history or propose/dispute/withdraw, but parent memory reads remain denied.
- Service: trusted service resolver; expiry action only.
- Admin: denied learner academic-history and memory access by default.
- All resolvers are mandatory at authorizer construction; missing resolver means construction fails. The authorizer is not yet wired to `/api/milo`.

The current `adminGet` / `adminRpc` server adapter uses a privileged server key and bypasses ordinary RLS. The application authorizer is therefore a hard prerequisite, not optional defense in depth. It must be verified against authoritative LMU relationship/consent helper functions before integration.

## SQL proposal — NOT A MIGRATION
The complete PostgreSQL 17 schema, constraints, indexes, append-only event trigger, privilege revocations, RLS enablement and service-role-only SECURITY INVOKER RPC functions are in `docs/sql/MILO-MEMORY-CORE-PROPOSAL.sql`.

Preconditions to verify:
- `public.learners(id,user_id,active)`
- `public.profiles(id,role)`
- Actual FK targets and deletion semantics.
- Existing teacher/parent authorization helper signatures and grants.

No memory tables, policies or RPC functions currently exist in the test project. No SQL has been applied.

## Verification and remaining gates
- 20 synthetic regression tests are present; the current in-session harness result is recorded separately from repository-native CI.
- Latest repository-native workflow has passed lint, full tests and production build.
- Android packaging and release-candidate workflows may still be running; no APK/AAB or release success is claimed until those runs finish.
- `LMU-V45-TESTING` is ACTIVE_HEALTHY on PostgreSQL 17.11 but has zero public tables and zero applied migrations.
- Production project was not queried or modified in this phase.
- Restore an authoritative schema-only baseline into the isolated test project, verify helper functions and FKs, then request explicit approval before applying the SQL proposal there.
- After isolated database tests pass, wire the services into `/api/milo` behind a disabled-by-default feature flag and conduct independent security/privacy and South African legal review.

# Milo Memory and Academic History — Isolated Implementation v1.0

## State and boundary
Adapter-driven prototype only. It is not connected to `/api/milo`, Supabase, production data or a database migration. Tests use synthetic records and in-memory adapters.

## Components
- `memory-validation.js`: category/source allowlists, bounded JSON values, confidence range, UUID and state validation; rejects sensitive-key patterns.
- `memory-service.js`: propose, confirm, update, dispute, withdraw and expire operations. Writes and append-only events must share one repository transaction.
- `academic-history-service.js`: scoped aggregation of the existing submission, review, mastery, Milo session/event, assistance, verification, recommendation and report sources.
- `context-orchestrator.js`: bounded confirmed memory, academic evidence, independent/assisted distinction and curriculum objective provenance.\n- `supabase-adapters.js`: server-only PostgREST reads for existing academic evidence and RPC calls for atomic memory writes; never imported by browser code.

## Adapter contract
Memory repository: atomic server RPC methods `milo_memory_propose`, `milo_memory_confirm`, `milo_memory_update`, and `milo_memory_transition`; each database function must update the projection and append its event in the same PostgreSQL transaction. Reads use server-only `adminGet`.
Academic repository: 12 source methods named in the service. Supabase adapter applies learner UUID filters, date bounds, pagination (500 rows/page, 10,000-row safety cap), and resolves dependent IDs in bounded batches. `subject` filtering is not yet implemented and must not be presented as filtered history.
Authorizer: trusted actor/tenant/relationship checks; never trust browser-supplied learner identity. This remains an injected dependency and is NOT yet connected to `/api/milo`. Existing LMU profile roles use `learner`, `teacher`, `parent`, and `admin`; parent memory visibility remains closed pending verified guardian relationship, consent and feature-control implementation.
Objective resolver: reviewed, provenance-bearing curriculum objectives only.

## Integration gates
1. Parameterized queries and server-derived actor identity.
2. Recheck authorization inside write transactions.
3. Database-enforced append-only event history.
4. Partial unique index for one current learner/key item.
5. Visibility enforced in database queries as well as service filtering.
6. No transcripts, raw evidence or sensitive traits in memory.
7. Assisted evidence never establishes independent mastery.
8. No service-role key in browser code; any RLS bypass needs separate security review.

## DDL proposal — NOT A MIGRATION
Confirm actual FK and deletion semantics in the isolated baseline before use.

```sql
create table public.learner_memory_items (
 id uuid primary key default gen_random_uuid(),
 learner_id uuid not null references public.learners(id) on delete restrict,
 memory_key text not null check (memory_key ~ '^[a-z][a-z0-9_.-]{1,79}$'),
 memory_category text not null check (memory_category in ('learning_preference','language_preference','learning_goal','interest','support_strategy','strength','misconception_pattern')),
 memory_value jsonb not null,
 source_type text not null check (source_type in ('learner_statement','teacher_observation','guardian_statement','reviewed_submission','mastery_evidence','learning_event','teacher_decision')),
 source_reference jsonb,
 confidence numeric(4,3) not null check (confidence between 0 and 1),
 status text not null default 'proposed' check (status in ('proposed','confirmed','disputed','withdrawn','expired')),
 visibility_scope text not null default 'learner_and_teacher' check (visibility_scope in ('learner_and_teacher','teacher_only','learner_only')),
 confirmed_by uuid references public.profiles(id) on delete set null,
 confirmed_at timestamptz, expires_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,learner_id)
);
create unique index learner_memory_items_one_current_key on public.learner_memory_items(learner_id,memory_key) where status in ('proposed','confirmed','disputed');
create index learner_memory_items_learner_status_idx on public.learner_memory_items(learner_id,status,updated_at desc);

create table public.learner_memory_events (
 id uuid primary key default gen_random_uuid(),
 memory_item_id uuid not null, learner_id uuid not null references public.learners(id) on delete restrict,
 event_type text not null check (event_type in ('propose','confirm','update','dispute','withdraw','expire')),
 previous_value jsonb, new_value jsonb,
 source_type text not null check (source_type in ('learner_statement','teacher_observation','guardian_statement','reviewed_submission','mastery_evidence','learning_event','teacher_decision')),
 source_reference jsonb, actor_profile_id uuid references public.profiles(id) on delete set null,
 reason text check (char_length(reason)<=500), occurred_at timestamptz not null default now(),
 foreign key(memory_item_id,learner_id) references public.learner_memory_items(id,learner_id) on delete restrict
);
create index learner_memory_events_learner_time_idx on public.learner_memory_events(learner_id,occurred_at desc);
create index learner_memory_events_item_time_idx on public.learner_memory_events(memory_item_id,occurred_at desc);
```

## RLS proposal — NOT APPLIED
Enable RLS; revoke direct client writes. Learners read confirmed own items within visibility. Teachers require existing active classroom access. Guardians require verified relationship plus consent/feature controls. No client writes event rows; a narrow server transaction appends events. Exact policies await actual helper signatures/grants from the isolated baseline.

## Limitations
A server-only Supabase adapter is now implemented on the draft branch. No memory tables, policies or RPC functions exist in the empty test project yet; the SQL file in `docs/sql/` is a proposal, not a migration. No `/api/milo` integration or end-to-end Supabase test is implemented. Adapter query scoping, atomicity, append-only enforcement, retention, guardian access and legal basis require verification and qualified South African legal/privacy review.


## Supabase adapter implementation checkpoint (2026-11-18)
- Added `api/_lib/milo/supabase-adapters.js`, importing the existing server-only `adminGet` and `adminRpc` functions.
- Academic reads are scoped by `learner_id`, apply requested date bounds, paginate at 500 rows, stop with HTTP 413 after 10,000 rows per source, and chunk dependent ID lookups into batches of 100.
- Submission reviews, verification observations and recommendation decisions are fetched only after deriving the related IDs from the requested learner's own rows. No shared mutable cross-request ID cache is used.
- Memory writes call atomic RPC contracts. The adapter does not emulate a multi-request transaction over PostgREST.
- SQL proposal adds append-only event trigger, client privilege revocation, RLS enabled with no client policies, and service-role-only RPC execution. The functions are SECURITY INVOKER.
- The SQL proposal assumes `learners(id,user_id,active)` and `profiles(id,role)`; these assumptions are not yet verified against an authoritative restored test baseline.
- The test project `LMU-V45-TESTING` is ACTIVE_HEALTHY on PostgreSQL 17.11 but currently has zero public tables and zero applied migrations. No schema changes have been applied.
- The production project was not queried or modified in this phase.
- Blocking integration dependency: a trusted `canAccessLearner` implementation must validate learner ownership, teacher classroom access, and parent/guardian relationship + consent before any service-role operation. The current API service-role helper bypasses RLS, so an injected authorizer is mandatory. Parent memory reads remain denied.
- Subject-specific academic history is not implemented; do not use the subject parameter as an access-control filter.

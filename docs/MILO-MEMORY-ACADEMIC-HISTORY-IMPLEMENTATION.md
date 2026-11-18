# Milo Memory and Academic History — Isolated Implementation v1.0

## State and boundary
Adapter-driven prototype only. It is not connected to `/api/milo`, Supabase, production data or a database migration. Tests use synthetic records and in-memory adapters.

## Components
- `memory-validation.js`: category/source allowlists, bounded JSON values, confidence range, UUID and state validation; rejects sensitive-key patterns.
- `memory-service.js`: propose, confirm, update, dispute, withdraw and expire operations. Writes and append-only events must share one repository transaction.
- `academic-history-service.js`: scoped aggregation of the existing submission, review, mastery, Milo session/event, assistance, verification, recommendation and report sources.
- `context-orchestrator.js`: bounded confirmed memory, academic evidence, independent/assisted distinction and curriculum objective provenance.

## Adapter contract
Memory repository: `withTransaction(callback)`, transaction methods `findCurrentMemory`, `insertMemoryItem`, `getMemoryItemForUpdate`, `updateMemoryItem`, `appendMemoryEvent`; reads `getMemoryItem`, `listMemoryItems`, `listMemoryEvents`.
Academic repository: 12 source methods named in the service, each accepting `{learnerId,from,to,subject}` and returning rows already scoped by the server adapter.
Authorizer: trusted actor/tenant/relationship checks; never trust browser-supplied learner identity.
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
No database adapter, policy, migration, /api/milo integration or end-to-end Supabase test is implemented. Adapter query scoping, atomicity, append-only enforcement, retention, guardian access and legal basis require verification and qualified South African legal/privacy review.

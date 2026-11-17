-- LMU room backend, Phase 1: read-only catalogue and relationship-scoped activity.
-- Additive migration. No existing rows or tables are modified.
-- Activity writes intentionally remain closed until the validated RPC is reviewed.

create table if not exists public.room_content_items (
  id uuid primary key default gen_random_uuid(),
  room_key text not null check (room_key in ('playworld', 'storyverse')),
  content_key text not null,
  version integer not null check (version > 0),
  locale text not null default 'en-ZA',
  stage_code text,
  curriculum_code text,
  content_type text not null check (content_type in ('game', 'story', 'quiz', 'reading')),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 32768),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'retired')),
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_key, version, locale),
  constraint room_content_publication_audit_check check (
    (status = 'published' and approved_by is not null and published_at is not null)
    or status <> 'published'
  )
);

create table if not exists public.room_activity_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id),
  room_key text not null check (room_key in ('playworld', 'storyverse')),
  content_item_id uuid not null references public.room_content_items(id),
  event_type text not null check (event_type in ('activity_started', 'activity_completed')),
  result jsonb not null default '{}'::jsonb
    check (jsonb_typeof(result) = 'object' and pg_column_size(result) <= 2048),
  duration_seconds integer check (duration_seconds between 0 and 7200),
  actor_profile_id uuid not null references public.profiles(id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists room_content_published_lookup_idx
  on public.room_content_items (room_key, locale, stage_code, content_key)
  where status = 'published';

create index if not exists room_activity_learner_created_idx
  on public.room_activity_events (learner_id, created_at desc);

alter table public.room_content_items enable row level security;
alter table public.room_activity_events enable row level security;

drop policy if exists room_content_published_read on public.room_content_items;
create policy room_content_published_read
  on public.room_content_items
  for select
  to authenticated
  using (status = 'published');

drop policy if exists room_activity_relationship_read on public.room_activity_events;
create policy room_activity_relationship_read
  on public.room_activity_events
  for select
  to authenticated
  using (public.can_access_learner(learner_id));

-- Explicit least-privilege grants. No client-side catalogue authoring or event writes.
revoke all on table public.room_content_items from public, anon, authenticated;
revoke all on table public.room_activity_events from public, anon, authenticated;
grant select on table public.room_content_items to authenticated;
grant select on table public.room_activity_events to authenticated;

-- Deliberately no INSERT, UPDATE, or DELETE policies/grants for client roles.
-- A later RPC must derive actor_profile_id from auth.uid(), validate learner access,
-- require a published item matching room_key/locale/stage, and enforce event allow-lists.

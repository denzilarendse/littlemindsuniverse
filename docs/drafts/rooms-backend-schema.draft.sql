-- DESIGN DRAFT ONLY — DO NOT APPLY TO THE LIVE PROJECT.
-- Target: LMU Supabase PostgreSQL 17.
-- This sketch is intentionally incomplete until the room authorization matrix,
-- moderator role, Data API grants and consent policy are approved.

begin;

create table if not exists public.room_content_items (
  id uuid primary key default gen_random_uuid(),
  room_key text not null check (room_key in
    ('playworld','storyverse','career','adult_academy','creator','community')),
  content_key text not null,
  version integer not null check (version > 0),
  locale text not null default 'en-ZA',
  stage_code text,
  curriculum_code text,
  content_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','review','published','retired')),
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_key, version, locale)
);

create table if not exists public.room_activity_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id),
  room_key text not null check (room_key in
    ('playworld','storyverse','career','adult_academy','creator','community')),
  content_item_id uuid not null references public.room_content_items(id),
  event_type text not null,
  result jsonb not null default '{}'::jsonb,
  duration_seconds integer check (duration_seconds between 0 and 7200),
  actor_profile_id uuid not null references public.profiles(id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists room_activity_learner_created_idx
  on public.room_activity_events (learner_id, created_at desc);
create index if not exists room_content_published_idx
  on public.room_content_items (room_key, locale, stage_code)
  where status = 'published';

alter table public.room_content_items enable row level security;
alter table public.room_activity_events enable row level security;

-- Published catalogue rows are readable only to signed-in users in this draft.
create policy room_content_published_read
  on public.room_content_items for select to authenticated
  using (status = 'published');

-- Activity read access delegates to the existing relationship authorization
-- helper. Direct writes are deliberately absent: use a validated RPC after review.
create policy room_activity_relationship_read
  on public.room_activity_events for select to authenticated
  using (public.can_access_learner(learner_id));

-- No INSERT/UPDATE/DELETE policy is defined in this draft. The eventual write RPC
-- must derive actor_profile_id from auth.uid(), verify the learner relationship,
-- require published content, validate room/event/payload allow-lists, and be
-- explicitly granted only to authenticated. SECURITY DEFINER requires a
-- separate review and narrow EXECUTE ACL.

revoke all on public.room_content_items from anon, authenticated;
revoke all on public.room_activity_events from anon, authenticated;
-- Explicit grants must be added only after Data API exposure and RLS tests are approved.

rollback;

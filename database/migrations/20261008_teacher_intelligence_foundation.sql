-- LMU Phase 1A: Teacher Intelligence Foundation.
-- Adds the canonical server-side data contract for actionable teacher intelligence.
-- No signal generation logic is introduced here; Phase 1B owns detection/clustering.

create table if not exists public.teacher_intelligence_signals (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete set null,
  signal_type text not null check (signal_type in ('individual','group','class','change','enrichment')),
  title text not null check (char_length(trim(title)) between 3 and 160),
  rationale text not null check (char_length(trim(rationale)) between 3 and 3000),
  strength_asset text,
  next_learning_goal text,
  recommended_action text,
  confidence text not null default 'low' check (confidence in ('low','medium','high')),
  evidence_summary jsonb not null default '{}'::jsonb,
  contradictory_evidence jsonb not null default '[]'::jsonb,
  status text not null default 'proposed' check (status in ('proposed','deferred','approved','rejected','resolved')),
  source text not null default 'teacher_intelligence_v1',
  detected_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(evidence_summary) = 'object'),
  check (jsonb_typeof(contradictory_evidence) = 'array')
);

create table if not exists public.teacher_intelligence_signal_learners (
  signal_id uuid not null references public.teacher_intelligence_signals(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  inclusion_reason text not null check (char_length(trim(inclusion_reason)) between 3 and 2000),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  independent_evidence_count integer not null default 0 check (independent_evidence_count >= 0),
  assisted_evidence_count integer not null default 0 check (assisted_evidence_count >= 0),
  misconception_count integer not null default 0 check (misconception_count >= 0),
  confidence text not null default 'low' check (confidence in ('low','medium','high')),
  created_at timestamptz not null default now(),
  primary key(signal_id, learner_id)
);

create index if not exists teacher_intelligence_signals_classroom_status_idx
  on public.teacher_intelligence_signals(classroom_id, status, detected_at desc);
create index if not exists teacher_intelligence_signals_skill_idx
  on public.teacher_intelligence_signals(skill_id, detected_at desc)
  where skill_id is not null;
create index if not exists teacher_intelligence_signal_learners_learner_idx
  on public.teacher_intelligence_signal_learners(learner_id, signal_id);

alter table public.teacher_intelligence_signals enable row level security;
alter table public.teacher_intelligence_signal_learners enable row level security;

revoke all on public.teacher_intelligence_signals from anon, authenticated;
revoke all on public.teacher_intelligence_signal_learners from anon, authenticated;

create or replace function public.get_teacher_intelligence_overview(
  p_classroom_id uuid
)
returns table(
  classroom_id uuid,
  active_learners integer,
  skills_with_reviewed_mastery integer,
  learners_needing_attention integer,
  proposed_signals integer,
  active_intervention_groups integer,
  active_enrichment_groups integer,
  submissions_waiting_review integer
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.teacher_owns_classroom(p_classroom_id) then
    raise exception 'You are not authorized to view teacher intelligence for this classroom.';
  end if;

  return query
  select
    p_classroom_id,
    (
      select count(*)::integer
      from public.classroom_members cm
      join public.learners l on l.id = cm.learner_id
      where cm.classroom_id = p_classroom_id
        and cm.status::text = 'active'
        and l.active = true
    ),
    (
      select count(distinct lsm.skill_id)::integer
      from public.classroom_members cm
      join public.learner_skill_mastery lsm on lsm.learner_id = cm.learner_id
      where cm.classroom_id = p_classroom_id
        and cm.status::text = 'active'
    ),
    (
      select count(distinct lsm.learner_id)::integer
      from public.classroom_members cm
      join public.learner_skill_mastery lsm on lsm.learner_id = cm.learner_id
      where cm.classroom_id = p_classroom_id
        and cm.status::text = 'active'
        and (
          lsm.current_judgement::text in ('not_yet','developing')
          or lsm.trend::text = 'declining'
          or lsm.misconception_count > 0
        )
    ),
    (
      select count(*)::integer
      from public.teacher_intelligence_signals tis
      where tis.classroom_id = p_classroom_id
        and tis.status = 'proposed'
    ),
    (
      select count(*)::integer
      from public.classrooms c
      where c.parent_classroom_id = p_classroom_id
        and c.classroom_type::text = 'intervention'
        and c.active = true
    ),
    (
      select count(*)::integer
      from public.classrooms c
      where c.parent_classroom_id = p_classroom_id
        and c.classroom_type::text = 'enrichment'
        and c.active = true
    ),
    (
      select count(*)::integer
      from public.learner_submissions ls
      join public.learning_items li on li.id = ls.learning_item_id
      where li.classroom_id = p_classroom_id
        and li.teacher_profile_id = (select auth.uid())
        and ls.status::text = 'submitted'
        and not exists (
          select 1 from public.submission_reviews sr
          where sr.submission_id = ls.id
        )
    );
end;
$function$;

create or replace function public.get_teacher_intelligence_signals(
  p_classroom_id uuid
)
returns table(
  signal_id uuid,
  signal_type text,
  skill_id uuid,
  skill_code text,
  skill_name text,
  subject text,
  title text,
  rationale text,
  strength_asset text,
  next_learning_goal text,
  recommended_action text,
  confidence text,
  evidence_summary jsonb,
  contradictory_evidence jsonb,
  signal_status text,
  detected_at timestamptz,
  learner_count integer,
  learner_ids uuid[],
  learner_names text[]
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.teacher_owns_classroom(p_classroom_id) then
    raise exception 'You are not authorized to view teacher intelligence for this classroom.';
  end if;

  return query
  select
    tis.id,
    tis.signal_type,
    s.id,
    s.skill_code,
    s.name,
    s.subject,
    tis.title,
    tis.rationale,
    tis.strength_asset,
    tis.next_learning_goal,
    tis.recommended_action,
    tis.confidence,
    tis.evidence_summary,
    tis.contradictory_evidence,
    tis.status,
    tis.detected_at,
    count(tisl.learner_id)::integer,
    coalesce(array_agg(tisl.learner_id order by l.display_name) filter (where tisl.learner_id is not null), '{}'::uuid[]),
    coalesce(array_agg(l.display_name order by l.display_name) filter (where l.display_name is not null), '{}'::text[])
  from public.teacher_intelligence_signals tis
  left join public.skills s on s.id = tis.skill_id
  left join public.teacher_intelligence_signal_learners tisl on tisl.signal_id = tis.id
  left join public.learners l on l.id = tisl.learner_id
  where tis.classroom_id = p_classroom_id
  group by
    tis.id,tis.signal_type,s.id,s.skill_code,s.name,s.subject,
    tis.title,tis.rationale,tis.strength_asset,tis.next_learning_goal,
    tis.recommended_action,tis.confidence,tis.evidence_summary,
    tis.contradictory_evidence,tis.status,tis.detected_at
  order by
    case tis.status when 'proposed' then 1 when 'deferred' then 2 when 'approved' then 3 when 'resolved' then 4 else 5 end,
    tis.detected_at desc;
end;
$function$;

revoke all on function public.get_teacher_intelligence_overview(uuid) from public;
revoke all on function public.get_teacher_intelligence_overview(uuid) from anon;
grant execute on function public.get_teacher_intelligence_overview(uuid) to authenticated;

revoke all on function public.get_teacher_intelligence_signals(uuid) from public;
revoke all on function public.get_teacher_intelligence_signals(uuid) from anon;
grant execute on function public.get_teacher_intelligence_signals(uuid) to authenticated;

comment on table public.teacher_intelligence_signals is
  'Phase 1A canonical teacher-intelligence signal contract. Signal generation is implemented separately.';
comment on table public.teacher_intelligence_signal_learners is
  'Per-learner evidence summary for a teacher-intelligence signal; learners may belong to multiple signals.';

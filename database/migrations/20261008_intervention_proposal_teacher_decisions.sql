-- LMU Phase 1C: Intervention Proposal & Teacher Decision Workflow.
-- Converts sufficient Phase 1B intelligence signals into editable, teacher-governed proposals.
-- Phase 1D owns active intervention lifecycle after approval.

create table if not exists public.teacher_intervention_proposals (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  source_signal_id uuid not null references public.teacher_intelligence_signals(id) on delete restrict,
  skill_id uuid references public.skills(id) on delete set null,
  proposal_type text not null check (proposal_type in ('intervention','enrichment','whole_class_review','monitor')),
  title text not null check (char_length(trim(title)) between 3 and 160),
  objective text not null check (char_length(trim(objective)) between 3 and 3000),
  rationale text not null check (char_length(trim(rationale)) between 3 and 3000),
  proposed_action text not null check (char_length(trim(proposed_action)) between 3 and 3000),
  status text not null default 'proposed'
    check (status in ('proposed','deferred','approved','rejected')),
  planned_review_date date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_signal_id)
);

create table if not exists public.teacher_intervention_proposal_members (
  proposal_id uuid not null references public.teacher_intervention_proposals(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  inclusion_reason text not null check (char_length(trim(inclusion_reason)) between 3 and 2000),
  selected boolean not null default true,
  added_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(proposal_id, learner_id)
);

create table if not exists public.teacher_intervention_decisions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.teacher_intervention_proposals(id) on delete cascade,
  decision text not null check (decision in ('created','edited','deferred','approved','rejected')),
  decided_by uuid not null references public.profiles(id) on delete restrict,
  reason text,
  membership_snapshot jsonb not null default '[]'::jsonb,
  proposal_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(membership_snapshot) = 'array'),
  check (jsonb_typeof(proposal_snapshot) = 'object')
);

create index if not exists teacher_intervention_proposals_classroom_status_idx
  on public.teacher_intervention_proposals(classroom_id,status,created_at desc);
create index if not exists teacher_intervention_proposal_members_learner_idx
  on public.teacher_intervention_proposal_members(learner_id,proposal_id);
create index if not exists teacher_intervention_decisions_proposal_idx
  on public.teacher_intervention_decisions(proposal_id,created_at desc);

alter table public.teacher_intervention_proposals enable row level security;
alter table public.teacher_intervention_proposal_members enable row level security;
alter table public.teacher_intervention_decisions enable row level security;

revoke all on public.teacher_intervention_proposals from anon, authenticated;
revoke all on public.teacher_intervention_proposal_members from anon, authenticated;
revoke all on public.teacher_intervention_decisions from anon, authenticated;

create or replace function public.create_teacher_intervention_proposal(
  p_signal_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_signal public.teacher_intelligence_signals%rowtype;
  v_proposal_id uuid;
  v_type text;
  v_members integer;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  select *
  into v_signal
  from public.teacher_intelligence_signals
  where id = p_signal_id
  for update;

  if not found then
    raise exception 'Teacher intelligence signal not found.';
  end if;

  if not public.teacher_owns_classroom(v_signal.classroom_id) then
    raise exception 'You are not authorized to create a proposal from this signal.';
  end if;

  if v_signal.status <> 'proposed' then
    raise exception 'This signal is no longer available for a new proposal.';
  end if;

  if v_signal.evidence_sufficiency <> 'sufficient' then
    raise exception 'Insufficient evidence. Collect more reviewed evidence before proposing an intervention.';
  end if;

  select count(*)::integer
  into v_members
  from public.teacher_intelligence_signal_learners tisl
  join public.classroom_members cm
    on cm.classroom_id = v_signal.classroom_id
   and cm.learner_id = tisl.learner_id
   and cm.status = 'active'::public.membership_status
  join public.learners l
    on l.id = tisl.learner_id
   and l.active = true
  where tisl.signal_id = v_signal.id;

  if v_signal.signal_type <> 'class' and v_members < 1 then
    raise exception 'This signal has no active learner membership.';
  end if;

  v_type := case v_signal.signal_type
    when 'enrichment' then 'enrichment'
    when 'class' then 'whole_class_review'
    when 'change' then 'monitor'
    else 'intervention'
  end;

  insert into public.teacher_intervention_proposals(
    classroom_id, source_signal_id, skill_id, proposal_type,
    title, objective, rationale, proposed_action, status, created_by
  )
  values(
    v_signal.classroom_id,
    v_signal.id,
    v_signal.skill_id,
    v_type,
    left(v_signal.title,160),
    coalesce(nullif(trim(v_signal.next_learning_goal),''),'Review the evidence and define the next learning goal.'),
    v_signal.rationale,
    coalesce(nullif(trim(v_signal.recommended_action),''),'Review the evidence and decide the appropriate teacher-led action.'),
    'proposed',
    v_uid
  )
  returning id into v_proposal_id;

  insert into public.teacher_intervention_proposal_members(
    proposal_id, learner_id, inclusion_reason, selected, added_by
  )
  select
    v_proposal_id,
    tisl.learner_id,
    tisl.inclusion_reason,
    true,
    v_uid
  from public.teacher_intelligence_signal_learners tisl
  join public.classroom_members cm
    on cm.classroom_id = v_signal.classroom_id
   and cm.learner_id = tisl.learner_id
   and cm.status = 'active'::public.membership_status
  join public.learners l
    on l.id = tisl.learner_id
   and l.active = true
  where tisl.signal_id = v_signal.id;

  update public.teacher_intelligence_signals
  set
    status = 'deferred',
    reviewed_by = v_uid,
    reviewed_at = now(),
    updated_at = now()
  where id = v_signal.id;

  insert into public.teacher_intervention_decisions(
    proposal_id, decision, decided_by, membership_snapshot, proposal_snapshot
  )
  select
    v_proposal_id,
    'created',
    v_uid,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'learnerId',m.learner_id,
        'selected',m.selected,
        'inclusionReason',m.inclusion_reason
      ) order by m.learner_id)
      from public.teacher_intervention_proposal_members m
      where m.proposal_id = v_proposal_id
    ),'[]'::jsonb),
    jsonb_build_object(
      'proposalType',v_type,
      'title',left(v_signal.title,160),
      'objective',coalesce(nullif(trim(v_signal.next_learning_goal),''),'Review the evidence and define the next learning goal.'),
      'status','proposed'
    );

  return v_proposal_id;
end;
$function$;

create or replace function public.update_teacher_intervention_proposal(
  p_proposal_id uuid,
  p_title text,
  p_objective text,
  p_proposed_action text,
  p_planned_review_date date default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_proposal public.teacher_intervention_proposals%rowtype;
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;

  select * into v_proposal
  from public.teacher_intervention_proposals
  where id = p_proposal_id
  for update;

  if not found then raise exception 'Proposal not found.'; end if;
  if not public.teacher_owns_classroom(v_proposal.classroom_id) then
    raise exception 'You are not authorized to edit this proposal.';
  end if;
  if v_proposal.status not in ('proposed','deferred') then
    raise exception 'A decided proposal can no longer be edited.';
  end if;
  if char_length(trim(coalesce(p_title,''))) not between 3 and 160
     or char_length(trim(coalesce(p_objective,''))) not between 3 and 3000
     or char_length(trim(coalesce(p_proposed_action,''))) not between 3 and 3000 then
    raise exception 'Proposal title, objective and action are required.';
  end if;

  update public.teacher_intervention_proposals
  set
    title = trim(p_title),
    objective = trim(p_objective),
    proposed_action = trim(p_proposed_action),
    planned_review_date = p_planned_review_date,
    updated_at = now()
  where id = p_proposal_id;

  insert into public.teacher_intervention_decisions(
    proposal_id,decision,decided_by,membership_snapshot,proposal_snapshot
  )
  select
    p_proposal_id,'edited',v_uid,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'learnerId',m.learner_id,'selected',m.selected,'inclusionReason',m.inclusion_reason
      ) order by m.learner_id)
      from public.teacher_intervention_proposal_members m
      where m.proposal_id=p_proposal_id
    ),'[]'::jsonb),
    jsonb_build_object(
      'title',trim(p_title),
      'objective',trim(p_objective),
      'proposedAction',trim(p_proposed_action),
      'plannedReviewDate',p_planned_review_date
    );

  return true;
end;
$function$;

create or replace function public.set_teacher_intervention_proposal_members(
  p_proposal_id uuid,
  p_learner_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_proposal public.teacher_intervention_proposals%rowtype;
  v_ids uuid[];
  v_count integer;
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;

  select * into v_proposal
  from public.teacher_intervention_proposals
  where id=p_proposal_id
  for update;

  if not found then raise exception 'Proposal not found.'; end if;
  if not public.teacher_owns_classroom(v_proposal.classroom_id) then
    raise exception 'You are not authorized to edit proposal membership.';
  end if;
  if v_proposal.status not in ('proposed','deferred') then
    raise exception 'A decided proposal can no longer be edited.';
  end if;
  if v_proposal.proposal_type = 'whole_class_review' then
    raise exception 'Whole-class review proposals use the active classroom roster and do not have editable subgroup membership.';
  end if;

  select coalesce(array_agg(x order by x),'{}'::uuid[])
  into v_ids
  from (
    select distinct learner_id as x
    from unnest(coalesce(p_learner_ids,'{}'::uuid[])) learner_id
    where learner_id is not null
  ) n;

  v_count := coalesce(cardinality(v_ids),0);
  if v_count < 1 then raise exception 'Select at least one learner.'; end if;
  if v_count > 50 then raise exception 'A proposal may contain at most 50 learners.'; end if;

  if exists (
    select 1
    from unnest(v_ids) requested(learner_id)
    where not exists (
      select 1
      from public.classroom_members cm
      join public.learners l on l.id=cm.learner_id and l.active=true
      where cm.classroom_id=v_proposal.classroom_id
        and cm.learner_id=requested.learner_id
        and cm.status='active'::public.membership_status
    )
  ) then
    raise exception 'Every selected learner must be an active member of the parent classroom.';
  end if;

  update public.teacher_intervention_proposal_members
  set selected=false, updated_at=now()
  where proposal_id=p_proposal_id;

  insert into public.teacher_intervention_proposal_members(
    proposal_id,learner_id,inclusion_reason,selected,added_by
  )
  select
    p_proposal_id,
    requested.learner_id,
    coalesce(
      (
        select tisl.inclusion_reason
        from public.teacher_intelligence_signal_learners tisl
        where tisl.signal_id=v_proposal.source_signal_id
          and tisl.learner_id=requested.learner_id
      ),
      'Added by the teacher after reviewing classroom evidence.'
    ),
    true,
    v_uid
  from unnest(v_ids) requested(learner_id)
  on conflict (proposal_id,learner_id)
  do update set selected=true, updated_at=now();

  insert into public.teacher_intervention_decisions(
    proposal_id,decision,decided_by,membership_snapshot,proposal_snapshot
  )
  select
    p_proposal_id,'edited',v_uid,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'learnerId',m.learner_id,'selected',m.selected,'inclusionReason',m.inclusion_reason
      ) order by m.learner_id)
      from public.teacher_intervention_proposal_members m
      where m.proposal_id=p_proposal_id
    ),'[]'::jsonb),
    jsonb_build_object('membershipEdited',true);

  return v_count;
end;
$function$;

create or replace function public.decide_teacher_intervention_proposal(
  p_proposal_id uuid,
  p_decision text,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_proposal public.teacher_intervention_proposals%rowtype;
  v_selected integer;
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;
  if p_decision not in ('approved','rejected','deferred') then
    raise exception 'Decision must be approved, rejected, or deferred.';
  end if;

  select * into v_proposal
  from public.teacher_intervention_proposals
  where id=p_proposal_id
  for update;

  if not found then raise exception 'Proposal not found.'; end if;
  if not public.teacher_owns_classroom(v_proposal.classroom_id) then
    raise exception 'You are not authorized to decide this proposal.';
  end if;
  if v_proposal.status not in ('proposed','deferred') then
    raise exception 'This proposal has already been decided.';
  end if;

  if p_decision='approved' and v_proposal.proposal_type <> 'whole_class_review' then
    select count(*)::integer into v_selected
    from public.teacher_intervention_proposal_members
    where proposal_id=p_proposal_id and selected=true;
    if v_selected < 1 then raise exception 'Approve at least one selected learner.'; end if;
  end if;

  update public.teacher_intervention_proposals
  set
    status=p_decision,
    decided_by=case when p_decision in ('approved','rejected') then v_uid else null end,
    decided_at=case when p_decision in ('approved','rejected') then now() else null end,
    decision_reason=nullif(trim(coalesce(p_reason,'')),''),
    updated_at=now()
  where id=p_proposal_id;

  update public.teacher_intelligence_signals
  set
    status=case p_decision
      when 'approved' then 'approved'
      when 'rejected' then 'rejected'
      else 'deferred'
    end,
    reviewed_by=v_uid,
    reviewed_at=now(),
    updated_at=now()
  where id=v_proposal.source_signal_id;

  insert into public.teacher_intervention_decisions(
    proposal_id,decision,decided_by,reason,membership_snapshot,proposal_snapshot
  )
  select
    p_proposal_id,
    case p_decision when 'approved' then 'approved' when 'rejected' then 'rejected' else 'deferred' end,
    v_uid,
    nullif(trim(coalesce(p_reason,'')),''),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'learnerId',m.learner_id,'selected',m.selected,'inclusionReason',m.inclusion_reason
      ) order by m.learner_id)
      from public.teacher_intervention_proposal_members m
      where m.proposal_id=p_proposal_id
    ),'[]'::jsonb),
    jsonb_build_object(
      'proposalType',v_proposal.proposal_type,
      'title',v_proposal.title,
      'objective',v_proposal.objective,
      'proposedAction',v_proposal.proposed_action,
      'status',p_decision
    );

  return p_decision;
end;
$function$;

create or replace function public.get_teacher_intervention_proposals(
  p_classroom_id uuid
)
returns table(
  proposal_id uuid,
  classroom_id uuid,
  source_signal_id uuid,
  proposal_type text,
  skill_id uuid,
  skill_name text,
  subject text,
  title text,
  objective text,
  rationale text,
  proposed_action text,
  proposal_status text,
  planned_review_date date,
  learner_ids uuid[],
  learner_names text[],
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  if not public.teacher_owns_classroom(p_classroom_id) then
    raise exception 'You are not authorized to view intervention proposals for this classroom.';
  end if;

  return query
  select
    p.id,
    p.classroom_id,
    p.source_signal_id,
    p.proposal_type,
    p.skill_id,
    s.name,
    s.subject,
    p.title,
    p.objective,
    p.rationale,
    p.proposed_action,
    p.status,
    p.planned_review_date,
    coalesce(array_agg(m.learner_id order by l.display_name)
      filter (where m.selected=true and m.learner_id is not null),'{}'::uuid[]),
    coalesce(array_agg(l.display_name order by l.display_name)
      filter (where m.selected=true and l.display_name is not null),'{}'::text[]),
    p.created_at,
    p.updated_at
  from public.teacher_intervention_proposals p
  left join public.skills s on s.id=p.skill_id
  left join public.teacher_intervention_proposal_members m on m.proposal_id=p.id
  left join public.learners l on l.id=m.learner_id
  where p.classroom_id=p_classroom_id
  group by p.id,s.id,s.name,s.subject
  order by
    case p.status when 'proposed' then 1 when 'deferred' then 2 when 'approved' then 3 else 4 end,
    p.updated_at desc;
end;
$function$;

revoke all on function public.create_teacher_intervention_proposal(uuid) from public;
revoke all on function public.create_teacher_intervention_proposal(uuid) from anon;
grant execute on function public.create_teacher_intervention_proposal(uuid) to authenticated;

revoke all on function public.update_teacher_intervention_proposal(uuid,text,text,text,date) from public;
revoke all on function public.update_teacher_intervention_proposal(uuid,text,text,text,date) from anon;
grant execute on function public.update_teacher_intervention_proposal(uuid,text,text,text,date) to authenticated;

revoke all on function public.set_teacher_intervention_proposal_members(uuid,uuid[]) from public;
revoke all on function public.set_teacher_intervention_proposal_members(uuid,uuid[]) from anon;
grant execute on function public.set_teacher_intervention_proposal_members(uuid,uuid[]) to authenticated;

revoke all on function public.decide_teacher_intervention_proposal(uuid,text,text) from public;
revoke all on function public.decide_teacher_intervention_proposal(uuid,text,text) from anon;
grant execute on function public.decide_teacher_intervention_proposal(uuid,text,text) to authenticated;

revoke all on function public.get_teacher_intervention_proposals(uuid) from public;
revoke all on function public.get_teacher_intervention_proposals(uuid) from anon;
grant execute on function public.get_teacher_intervention_proposals(uuid) to authenticated;

comment on table public.teacher_intervention_proposals is
  'Phase 1C teacher-governed intervention/enrichment proposals derived from sufficient intelligence signals.';
comment on table public.teacher_intervention_decisions is
  'Immutable audit trail of proposal creation, teacher edits and teacher decisions.';

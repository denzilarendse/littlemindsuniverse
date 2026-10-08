-- LMU Phase 1E: transfer, retention and verified-learning evidence.
-- A single successful retry cannot verify learning. Verified status requires
-- independent novel-context transfer plus a later independent retention check.
-- This migration never writes learner_skill_mastery automatically.

create table if not exists public.learning_verification_cycles (
  id uuid primary key default gen_random_uuid(),
  support_group_lifecycle_id uuid not null references public.support_group_lifecycles(id) on delete cascade,
  group_classroom_id uuid not null references public.classrooms(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  baseline_judgement public.mastery_judgement,
  baseline_confidence public.mastery_confidence,
  baseline_evidence_count integer not null default 0 check (baseline_evidence_count >= 0),
  baseline_independent_evidence_count integer not null default 0 check (baseline_independent_evidence_count >= 0),
  baseline_assisted_evidence_count integer not null default 0 check (baseline_assisted_evidence_count >= 0),
  baseline_misconception_count integer not null default 0 check (baseline_misconception_count >= 0),
  retention_delay_days smallint not null default 7 check (retention_delay_days between 1 and 30),
  status text not null default 'active'
    check (status in ('active','transfer_pending','retention_pending','needs_support','verified','closed')),
  transfer_demonstrated_at timestamptz,
  retention_due_at timestamptz,
  retention_demonstrated_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists learning_verification_cycles_open_unique
  on public.learning_verification_cycles(support_group_lifecycle_id,learner_id,skill_id)
  where status not in ('verified','closed');

create index if not exists learning_verification_cycles_group_status_idx
  on public.learning_verification_cycles(group_classroom_id,status,updated_at desc);
create index if not exists learning_verification_cycles_learner_skill_idx
  on public.learning_verification_cycles(learner_id,skill_id,started_at desc);

create table if not exists public.learning_verification_observations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.learning_verification_cycles(id) on delete cascade,
  stage text not null check (stage in ('retry','transfer','retention')),
  source_event_id uuid references public.milo_learning_events(id) on delete restrict,
  source_mastery_evidence_id uuid references public.mastery_evidence(id) on delete restrict,
  result text not null check (result in ('not_demonstrated','emerging','demonstrated')),
  independence text not null check (independence in ('independent','assisted')),
  assistance_level smallint not null check (assistance_level between 0 and 5),
  novel_context boolean not null default false,
  teacher_profile_id uuid not null references public.profiles(id) on delete restrict,
  observed_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  check (
    (source_event_id is not null and source_mastery_evidence_id is null)
    or
    (source_event_id is null and source_mastery_evidence_id is not null)
  )
);

create index if not exists learning_verification_observations_cycle_stage_idx
  on public.learning_verification_observations(cycle_id,stage,observed_at desc);

alter table public.learning_verification_cycles enable row level security;
alter table public.learning_verification_observations enable row level security;
revoke all on public.learning_verification_cycles from anon,authenticated;
revoke all on public.learning_verification_observations from anon,authenticated;

create or replace function public.start_learning_verification_cycle(
  p_group_classroom_id uuid,
  p_learner_id uuid,
  p_retention_delay_days smallint default 7
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=(select auth.uid());
  v_group public.classrooms%rowtype;
  v_lifecycle public.support_group_lifecycles%rowtype;
  v_mastery public.learner_skill_mastery%rowtype;
  v_cycle_id uuid;
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;
  if p_retention_delay_days is null or p_retention_delay_days not between 1 and 30 then
    raise exception 'Retention delay must be between 1 and 30 days.';
  end if;

  select * into v_group from public.classrooms where id=p_group_classroom_id;
  if not found or v_group.teacher_profile_id<>v_uid or v_group.parent_classroom_id is null
     or v_group.classroom_type not in ('intervention'::public.classroom_type,'enrichment'::public.classroom_type)
     or not public.teacher_owns_classroom(v_group.parent_classroom_id)
  then raise exception 'Not authorized to start verification for this support group.'; end if;

  select * into v_lifecycle from public.support_group_lifecycles
   where group_classroom_id=p_group_classroom_id;
  if not found or v_lifecycle.status not in ('active','continued','modified') then
    raise exception 'The support group is not active.';
  end if;
  if v_lifecycle.target_skill_id is null then raise exception 'The support group has no target skill.'; end if;

  if not exists(
    select 1 from public.classroom_members cm
    join public.learners l on l.id=cm.learner_id
    where cm.classroom_id=p_group_classroom_id and cm.learner_id=p_learner_id
      and cm.status::text='active' and l.active=true
  ) then raise exception 'Learner is not an active member of this support group.'; end if;

  select id into v_cycle_id
  from public.learning_verification_cycles
  where support_group_lifecycle_id=v_lifecycle.id
    and learner_id=p_learner_id
    and skill_id=v_lifecycle.target_skill_id
    and status not in ('verified','closed')
  order by started_at desc limit 1;
  if v_cycle_id is not null then return v_cycle_id; end if;

  select * into v_mastery from public.learner_skill_mastery
   where learner_id=p_learner_id and skill_id=v_lifecycle.target_skill_id;

  insert into public.learning_verification_cycles(
    support_group_lifecycle_id,group_classroom_id,learner_id,skill_id,
    baseline_judgement,baseline_confidence,baseline_evidence_count,
    baseline_independent_evidence_count,baseline_assisted_evidence_count,
    baseline_misconception_count,retention_delay_days
  ) values(
    v_lifecycle.id,p_group_classroom_id,p_learner_id,v_lifecycle.target_skill_id,
    v_mastery.current_judgement,v_mastery.confidence,coalesce(v_mastery.evidence_count,0),
    coalesce(v_mastery.independent_evidence_count,0),coalesce(v_mastery.assisted_evidence_count,0),
    coalesce(v_mastery.misconception_count,0),p_retention_delay_days
  ) returning id into v_cycle_id;

  return v_cycle_id;
end $$;

create or replace function public.record_learning_verification_observation(
  p_cycle_id uuid,
  p_stage text,
  p_source_event_id uuid default null,
  p_source_mastery_evidence_id uuid default null,
  p_novel_context boolean default false
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=(select auth.uid());
  v_cycle public.learning_verification_cycles%rowtype;
  v_group public.classrooms%rowtype;
  v_event public.milo_learning_events%rowtype;
  v_evidence public.mastery_evidence%rowtype;
  v_result text;
  v_independence text;
  v_assistance smallint;
  v_observed_at timestamptz;
  v_observation_id uuid;
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;
  if p_stage not in ('retry','transfer','retention') then raise exception 'Invalid verification stage.'; end if;
  if (p_source_event_id is null)=(p_source_mastery_evidence_id is null) then
    raise exception 'Provide exactly one verification evidence source.';
  end if;

  select * into v_cycle from public.learning_verification_cycles where id=p_cycle_id for update;
  if not found then raise exception 'Verification cycle not found.'; end if;
  if v_cycle.status in ('verified','closed') then raise exception 'This verification cycle is already closed.'; end if;

  select * into v_group from public.classrooms where id=v_cycle.group_classroom_id;
  if not found or v_group.teacher_profile_id<>v_uid or not public.teacher_owns_classroom(v_group.parent_classroom_id) then
    raise exception 'Not authorized to record verification for this cycle.';
  end if;

  if p_source_event_id is not null then
    select * into v_event from public.milo_learning_events where id=p_source_event_id;
    if not found or v_event.learner_id<>v_cycle.learner_id or v_event.skill_id<>v_cycle.skill_id
       or v_event.occurred_at<v_cycle.started_at
    then raise exception 'Learning event does not belong to this verification cycle.'; end if;

    if p_stage='retry' then
      if v_event.activity_type not in ('retry','learner_attempt') then
        raise exception 'Retry verification requires a learner attempt or retry event.';
      end if;
      v_result:=case coalesce(v_event.metadata->>'outcome','')
        when 'demonstrated' then 'demonstrated'
        when 'emerging' then 'emerging'
        else 'not_demonstrated' end;
    else
      if v_event.activity_type<>'transfer_check' then
        raise exception 'Transfer and retention verification require a transfer-check event.';
      end if;
      if v_event.transfer_result not in ('emerging','demonstrated') then
        raise exception 'Transfer-check result must be emerging or demonstrated.';
      end if;
      v_result:=case when v_event.transfer_result='demonstrated' then 'demonstrated' else 'emerging' end;
    end if;

    v_independence:=case when v_event.independence='independent' then 'independent' else 'assisted' end;
    v_assistance:=v_event.assistance_level;
    v_observed_at:=v_event.occurred_at;
  else
    if p_stage<>'retry' then
      raise exception 'Teacher-reviewed mastery evidence may be used only for retry verification.';
    end if;
    select * into v_evidence from public.mastery_evidence where id=p_source_mastery_evidence_id;
    if not found or v_evidence.learner_id<>v_cycle.learner_id or v_evidence.skill_id<>v_cycle.skill_id
       or v_evidence.observed_at<v_cycle.started_at
    then raise exception 'Mastery evidence does not belong to this verification cycle.'; end if;

    v_result:=case v_evidence.judgement::text
      when 'strong' then 'demonstrated'
      when 'secure' then 'demonstrated'
      when 'developing' then 'emerging'
      else 'not_demonstrated' end;
    v_independence:=case when v_evidence.independent_evidence then 'independent' else 'assisted' end;
    v_assistance:=v_evidence.assistance_level;
    v_observed_at:=v_evidence.observed_at;
  end if;

  if p_stage in ('transfer','retention') then
    if v_independence<>'independent' or v_assistance<>0 then
      raise exception 'Transfer and retention must be independent and unassisted.';
    end if;
  end if;

  if p_stage='transfer' and p_novel_context is not true then
    raise exception 'Transfer verification requires a novel context.';
  end if;

  if p_stage='retention' then
    if v_cycle.transfer_demonstrated_at is null or v_cycle.retention_due_at is null then
      raise exception 'Independent transfer must be demonstrated before retention is checked.';
    end if;
    if v_observed_at<v_cycle.retention_due_at then
      raise exception 'Retention check is too early.';
    end if;
  end if;

  insert into public.learning_verification_observations(
    cycle_id,stage,source_event_id,source_mastery_evidence_id,result,
    independence,assistance_level,novel_context,teacher_profile_id,observed_at,
    metadata
  ) values(
    p_cycle_id,p_stage,p_source_event_id,p_source_mastery_evidence_id,v_result,
    v_independence,v_assistance,coalesce(p_novel_context,false),v_uid,v_observed_at,
    jsonb_build_object('source',case when p_source_event_id is not null then 'milo_event' else 'mastery_evidence' end)
  ) returning id into v_observation_id;

  if p_stage='retry' then
    update public.learning_verification_cycles
       set status=case when v_result='demonstrated' then 'transfer_pending' else 'needs_support' end,
           updated_at=now()
     where id=p_cycle_id;
  elsif p_stage='transfer' then
    update public.learning_verification_cycles
       set status=case when v_result='demonstrated' then 'retention_pending' else 'needs_support' end,
           transfer_demonstrated_at=case when v_result='demonstrated' then v_observed_at else transfer_demonstrated_at end,
           retention_due_at=case when v_result='demonstrated'
                                 then v_observed_at + make_interval(days=>retention_delay_days)
                                 else retention_due_at end,
           updated_at=now()
     where id=p_cycle_id;
  else
    update public.learning_verification_cycles
       set status=case when v_result='demonstrated' and transfer_demonstrated_at is not null
                       then 'verified' else 'needs_support' end,
           retention_demonstrated_at=case when v_result='demonstrated' then v_observed_at else retention_demonstrated_at end,
           completed_at=case when v_result='demonstrated' and transfer_demonstrated_at is not null then now() else completed_at end,
           updated_at=now()
     where id=p_cycle_id;
  end if;

  return v_observation_id;
end $$;

create or replace function public.get_teacher_learning_verification(p_parent_classroom_id uuid)
returns table(
  cycle_id uuid,
  group_classroom_id uuid,
  group_name text,
  learner_id uuid,
  learner_name text,
  skill_id uuid,
  skill_name text,
  baseline_judgement text,
  baseline_confidence text,
  baseline_evidence_count integer,
  baseline_independent_evidence_count integer,
  baseline_assisted_evidence_count integer,
  baseline_misconception_count integer,
  verification_status text,
  transfer_demonstrated_at timestamptz,
  retention_due_at timestamptz,
  retention_demonstrated_at timestamptz,
  retry_observations integer,
  transfer_observations integer,
  retention_observations integer,
  verified_for_exit boolean,
  started_at timestamptz,
  completed_at timestamptz
)
language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  if not public.teacher_owns_classroom(p_parent_classroom_id) then raise exception 'Not authorized.'; end if;

  return query
  select vc.id,vc.group_classroom_id,c.name,vc.learner_id,l.display_name,vc.skill_id,s.name,
         vc.baseline_judgement::text,vc.baseline_confidence::text,
         vc.baseline_evidence_count,vc.baseline_independent_evidence_count,
         vc.baseline_assisted_evidence_count,vc.baseline_misconception_count,
         vc.status,vc.transfer_demonstrated_at,vc.retention_due_at,vc.retention_demonstrated_at,
         count(vo.id) filter(where vo.stage='retry')::integer,
         count(vo.id) filter(where vo.stage='transfer')::integer,
         count(vo.id) filter(where vo.stage='retention')::integer,
         (vc.status='verified' and vc.transfer_demonstrated_at is not null and vc.retention_demonstrated_at is not null),
         vc.started_at,vc.completed_at
  from public.learning_verification_cycles vc
  join public.classrooms c on c.id=vc.group_classroom_id
  join public.learners l on l.id=vc.learner_id
  join public.skills s on s.id=vc.skill_id
  left join public.learning_verification_observations vo on vo.cycle_id=vc.id
  where c.parent_classroom_id=p_parent_classroom_id
    and c.teacher_profile_id=(select auth.uid())
  group by vc.id,c.id,l.id,s.id
  order by case vc.status when 'needs_support' then 0 when 'retention_pending' then 1
                          when 'transfer_pending' then 2 when 'active' then 3 else 4 end,
           vc.updated_at desc;
end $$;

revoke all on function public.start_learning_verification_cycle(uuid,uuid,smallint) from public,anon;
grant execute on function public.start_learning_verification_cycle(uuid,uuid,smallint) to authenticated;
revoke all on function public.record_learning_verification_observation(uuid,text,uuid,uuid,boolean) from public,anon;
grant execute on function public.record_learning_verification_observation(uuid,text,uuid,uuid,boolean) to authenticated;
revoke all on function public.get_teacher_learning_verification(uuid) from public,anon;
grant execute on function public.get_teacher_learning_verification(uuid) to authenticated;

comment on table public.learning_verification_cycles is
  'Phase 1E verified-learning cycles. Verified requires independent transfer plus delayed independent retention and never auto-writes learner_skill_mastery.';

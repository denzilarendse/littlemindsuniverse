-- LMU Phase 1C: signal-backed intervention proposals and teacher decisions.
-- Milo may propose; only the owning teacher may decide or edit membership.

alter type public.milo_recommendation_status add value if not exists 'deferred';

alter table public.milo_recommendations
  add column if not exists signal_id uuid references public.teacher_intelligence_signals(id) on delete set null,
  add column if not exists proposed_learner_ids uuid[] not null default '{}'::uuid[],
  add column if not exists teacher_edited_learner_ids uuid[],
  add column if not exists decision_note text,
  add column if not exists deferred_by uuid references public.profiles(id) on delete set null,
  add column if not exists deferred_at timestamptz;

create index if not exists milo_recommendations_signal_idx
  on public.milo_recommendations(signal_id) where signal_id is not null;

create table if not exists public.milo_recommendation_decisions (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.milo_recommendations(id) on delete cascade,
  teacher_profile_id uuid not null references public.profiles(id) on delete restrict,
  decision text not null check (decision in ('approve','reject','defer','edit_members')),
  previous_status text not null,
  new_status text not null,
  previous_learner_ids uuid[] not null default '{}'::uuid[],
  new_learner_ids uuid[] not null default '{}'::uuid[],
  note text,
  created_at timestamptz not null default now()
);

alter table public.milo_recommendation_decisions enable row level security;
revoke all on public.milo_recommendation_decisions from anon, authenticated;

create or replace function public.propose_signal_intervention(p_signal_id uuid)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_signal public.teacher_intelligence_signals%rowtype;
  v_learner_ids uuid[];
  v_first uuid;
  v_type public.milo_recommendation_type;
  v_id uuid;
  v_count integer;
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  select * into v_signal from public.teacher_intelligence_signals where id=p_signal_id;
  if not found then raise exception 'Signal not found.'; end if;
  if not public.teacher_owns_classroom(v_signal.classroom_id) then raise exception 'Not authorized.'; end if;
  if v_signal.skill_id is null then raise exception 'A skill-backed signal is required.'; end if;

  select coalesce(array_agg(learner_id order by learner_id),'{}'::uuid[]), count(*)::integer
    into v_learner_ids,v_count
  from public.teacher_intelligence_signal_learners where signal_id=p_signal_id;
  if v_count=0 then raise exception 'Signal has no learner evidence.'; end if;
  v_first:=v_learner_ids[1];
  v_type:=case when v_signal.signal_type='enrichment' then 'enrichment'::public.milo_recommendation_type
               else 'intervention'::public.milo_recommendation_type end;

  select id into v_id from public.milo_recommendations
   where signal_id=p_signal_id and status::text in ('proposed','deferred') order by created_at desc limit 1;
  if v_id is not null then return v_id; end if;

  -- Reuse a still-open legacy recommendation for the same learner/skill/evidence
  -- rather than violating the historical uniqueness key. Attach the richer
  -- signal contract and grouped membership to that proposal.
  select id into v_id
  from public.milo_recommendations
  where classroom_id=v_signal.classroom_id
    and learner_id=v_first
    and skill_id=v_signal.skill_id
    and evidence_count_snapshot=coalesce((select max(tisl.evidence_count) from public.teacher_intelligence_signal_learners tisl where tisl.signal_id=p_signal_id),v_count)
    and status::text in ('proposed','deferred')
  order by created_at desc limit 1;
  if v_id is not null then
    update public.milo_recommendations
       set signal_id=p_signal_id,
           proposed_learner_ids=v_learner_ids,
           recommendation_type=v_type,
           rationale=v_signal.rationale,
           recommended_action=coalesce(v_signal.recommended_action,recommended_action),
           source='teacher_intelligence_v1',
           updated_at=now()
     where id=v_id;
    return v_id;
  end if;

  insert into public.milo_recommendations(
    classroom_id,learner_id,skill_id,recommendation_type,rationale,recommended_action,
    evidence_count_snapshot,source,signal_id,proposed_learner_ids
  ) values (
    v_signal.classroom_id,v_first,v_signal.skill_id,v_type,v_signal.rationale,
    coalesce(v_signal.recommended_action,'Review the evidence and choose the appropriate teacher-led response.'),
    coalesce((select max(tisl.evidence_count) from public.teacher_intelligence_signal_learners tisl where tisl.signal_id=p_signal_id),v_count),'teacher_intelligence_v1',p_signal_id,v_learner_ids
  ) returning id into v_id;
  return v_id;
end $$;

create or replace function public.decide_signal_recommendation(
  p_recommendation_id uuid,
  p_decision text,
  p_learner_ids uuid[] default null,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_rec public.milo_recommendations%rowtype;
  v_parent public.classrooms%rowtype;
  v_ids uuid[];
  v_previous uuid[];
  v_group uuid;
  v_skill text;
  v_bad integer;
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  if p_decision not in ('approve','reject','defer','edit_members') then raise exception 'Invalid decision.'; end if;
  select * into v_rec from public.milo_recommendations where id=p_recommendation_id for update;
  if not found then raise exception 'Recommendation not found.'; end if;
  if not public.teacher_owns_classroom(v_rec.classroom_id) then raise exception 'Not authorized.'; end if;
  if v_rec.signal_id is null then raise exception 'This decision workflow requires a signal-backed proposal.'; end if;
  if v_rec.status::text not in ('proposed','deferred') then raise exception 'This recommendation has already been decided.'; end if;

  v_previous:=coalesce(v_rec.teacher_edited_learner_ids,v_rec.proposed_learner_ids,array[v_rec.learner_id]);
  v_ids:=coalesce(p_learner_ids,v_previous);
  if coalesce(array_length(v_ids,1),0)=0 then raise exception 'At least one learner is required.'; end if;
  select count(*)::integer into v_bad from unnest(v_ids) x
   where not exists(select 1 from public.classroom_members cm where cm.classroom_id=v_rec.classroom_id and cm.learner_id=x and cm.status::text='active');
  if v_bad>0 then raise exception 'All selected learners must be active members of the parent classroom.'; end if;

  if p_decision='edit_members' then
    update public.milo_recommendations set teacher_edited_learner_ids=v_ids,decision_note=p_note,updated_at=now()
     where id=p_recommendation_id;
    insert into public.milo_recommendation_decisions(recommendation_id,teacher_profile_id,decision,previous_status,new_status,previous_learner_ids,new_learner_ids,note)
      values(p_recommendation_id,(select auth.uid()),p_decision,v_rec.status::text,v_rec.status::text,v_previous,v_ids,p_note);
    return null;
  end if;

  if p_decision='defer' then
    update public.milo_recommendations set status='deferred',deferred_by=(select auth.uid()),deferred_at=now(),
      teacher_edited_learner_ids=case when p_learner_ids is null then teacher_edited_learner_ids else v_ids end,
      decision_note=p_note,updated_at=now() where id=p_recommendation_id;
    insert into public.milo_recommendation_decisions(recommendation_id,teacher_profile_id,decision,previous_status,new_status,previous_learner_ids,new_learner_ids,note)
      values(p_recommendation_id,(select auth.uid()),p_decision,v_rec.status::text,'deferred',v_previous,v_ids,p_note);
    return null;
  end if;

  if p_decision='reject' then
    update public.milo_recommendations set status='rejected',rejected_by=(select auth.uid()),rejected_at=now(),
      teacher_edited_learner_ids=case when p_learner_ids is null then teacher_edited_learner_ids else v_ids end,
      decision_note=p_note,updated_at=now() where id=p_recommendation_id;
    insert into public.milo_recommendation_decisions(recommendation_id,teacher_profile_id,decision,previous_status,new_status,previous_learner_ids,new_learner_ids,note)
      values(p_recommendation_id,(select auth.uid()),p_decision,v_rec.status::text,'rejected',v_previous,v_ids,p_note);
    return null;
  end if;

  select * into v_parent from public.classrooms where id=v_rec.classroom_id;
  select name into v_skill from public.skills where id=v_rec.skill_id;
  if v_rec.recommendation_type in ('intervention','enrichment') then
    insert into public.classrooms(organization_id,teacher_profile_id,classroom_type,parent_classroom_id,name,age_band,curriculum_code,default_language,active)
    values(v_parent.organization_id,(select auth.uid()),
      case when v_rec.recommendation_type='intervention' then 'intervention'::public.classroom_type else 'enrichment'::public.classroom_type end,
      v_parent.id,
      case when v_rec.recommendation_type='intervention' then 'Support • '||v_skill else 'Enrichment • '||v_skill end,
      v_parent.age_band,v_parent.curriculum_code,v_parent.default_language,true)
    returning id into v_group;
    insert into public.classroom_members(classroom_id,learner_id,status)
      select v_group,x,'active' from unnest(v_ids) x
      on conflict(classroom_id,learner_id) do update set status='active';
  end if;
  update public.milo_recommendations set status='approved',approved_by=(select auth.uid()),approved_at=now(),
    group_classroom_id=v_group,teacher_edited_learner_ids=case when p_learner_ids is null then teacher_edited_learner_ids else v_ids end,
    decision_note=p_note,updated_at=now() where id=p_recommendation_id;
  insert into public.milo_recommendation_decisions(recommendation_id,teacher_profile_id,decision,previous_status,new_status,previous_learner_ids,new_learner_ids,note)
    values(p_recommendation_id,(select auth.uid()),p_decision,v_rec.status::text,'approved',v_previous,v_ids,p_note);
  return v_group;
end $$;

revoke all on function public.propose_signal_intervention(uuid) from public,anon;
grant execute on function public.propose_signal_intervention(uuid) to authenticated;
revoke all on function public.decide_signal_recommendation(uuid,text,uuid[],text) from public,anon;
grant execute on function public.decide_signal_recommendation(uuid,text,uuid[],text) to authenticated;

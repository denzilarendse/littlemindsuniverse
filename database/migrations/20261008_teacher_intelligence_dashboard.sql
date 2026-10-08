-- LMU Phase 1F: consolidated Teacher Intelligence Dashboard contract.
-- Joins signals, teacher decisions, temporary-group lifecycle and verified-learning outcomes.

create or replace function public.sync_teacher_intelligence_recommendation_status()
returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if new.signal_id is null then return new; end if;

  update public.teacher_intelligence_signals
     set status=case new.status::text
                  when 'proposed' then 'proposed'
                  when 'deferred' then 'deferred'
                  when 'approved' then 'approved'
                  when 'rejected' then 'rejected'
                  when 'completed' then 'resolved'
                  else status end,
         reviewed_by=case when new.status::text in ('approved','rejected','deferred','completed')
                          then coalesce(new.approved_by,new.rejected_by,new.deferred_by,reviewed_by)
                          else reviewed_by end,
         reviewed_at=case when new.status::text in ('approved','rejected','deferred','completed')
                          then coalesce(new.approved_at,new.rejected_at,new.deferred_at,reviewed_at,now())
                          else reviewed_at end,
         resolved_at=case when new.status::text='completed' then coalesce(resolved_at,now()) else resolved_at end,
         updated_at=now()
   where id=new.signal_id;
  return new;
end $$;

drop trigger if exists milo_recommendation_sync_teacher_intelligence_status on public.milo_recommendations;
create trigger milo_recommendation_sync_teacher_intelligence_status
after insert or update of status on public.milo_recommendations
for each row execute function public.sync_teacher_intelligence_recommendation_status();

create or replace function public.sync_teacher_intelligence_support_outcome()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare
  v_signal_id uuid;
begin
  if new.status not in ('completed','dissolved') or new.status is not distinct from old.status then
    return new;
  end if;

  if new.recommendation_id is not null then
    update public.milo_recommendations
       set status='completed'::public.milo_recommendation_status,
           updated_at=now()
     where id=new.recommendation_id
       and status::text='approved'
    returning signal_id into v_signal_id;

    if v_signal_id is not null then
      update public.teacher_intelligence_signals
         set status='resolved',resolved_at=coalesce(resolved_at,now()),updated_at=now()
       where id=v_signal_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists support_lifecycle_sync_teacher_intelligence_outcome on public.support_group_lifecycles;
create trigger support_lifecycle_sync_teacher_intelligence_outcome
after update of status on public.support_group_lifecycles
for each row execute function public.sync_teacher_intelligence_support_outcome();

-- Synchronize any signal-backed recommendations created before this trigger.
update public.teacher_intelligence_signals tis
set status=case mr.status::text
             when 'proposed' then 'proposed'
             when 'deferred' then 'deferred'
             when 'approved' then 'approved'
             when 'rejected' then 'rejected'
             when 'completed' then 'resolved'
             else tis.status end,
    updated_at=now()
from public.milo_recommendations mr
where mr.signal_id=tis.id;

create or replace function public.get_teacher_intelligence_dashboard(p_classroom_id uuid)
returns table(
  classroom_id uuid,
  classroom_name text,
  signal_id uuid,
  signal_type text,
  signal_status text,
  detected_at timestamptz,
  skill_id uuid,
  skill_name text,
  subject text,
  need text,
  why text,
  evidence_summary jsonb,
  evidence_sufficiency text,
  confidence text,
  contradictory_evidence jsonb,
  strength_asset text,
  next_learning_goal text,
  recommended_action text,
  learner_ids uuid[],
  learner_names text[],
  recommendation_id uuid,
  recommendation_type text,
  recommendation_status text,
  decision_note text,
  proposed_learner_ids uuid[],
  selected_learner_ids uuid[],
  group_classroom_id uuid,
  group_name text,
  lifecycle_status text,
  review_at timestamptz,
  exit_criteria text,
  outcome text,
  verification_cycles integer,
  verified_cycles integer,
  needs_support_cycles integer,
  retention_pending_cycles integer
)
language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  if not public.teacher_owns_classroom(p_classroom_id) then raise exception 'Not authorized.'; end if;

  return query
  select
    c.id,c.name,
    tis.id,tis.signal_type,tis.status,tis.detected_at,
    s.id,s.name,s.subject,
    tis.title,tis.rationale,tis.evidence_summary,tis.evidence_sufficiency,tis.confidence,
    tis.contradictory_evidence,tis.strength_asset,tis.next_learning_goal,tis.recommended_action,
    array(
      select sl.learner_id
      from public.teacher_intelligence_signal_learners sl
      join public.learners l on l.id=sl.learner_id
      where sl.signal_id=tis.id
      order by l.display_name,sl.learner_id
    )::uuid[],
    array(
      select l.display_name
      from public.teacher_intelligence_signal_learners sl
      join public.learners l on l.id=sl.learner_id
      where sl.signal_id=tis.id
      order by l.display_name,sl.learner_id
    )::text[],
    mr.id,mr.recommendation_type::text,mr.status::text,mr.decision_note,
    coalesce(mr.proposed_learner_ids,'{}'::uuid[]),
    coalesce(mr.teacher_edited_learner_ids,mr.proposed_learner_ids,'{}'::uuid[]),
    mr.group_classroom_id,gc.name,
    case when sg.status in ('active','continued','modified') and sg.review_at<=now()
         then 'review_due' else sg.status end,
    sg.review_at,sg.exit_criteria,sg.outcome,
    coalesce(v.total_cycles,0),coalesce(v.verified_cycles,0),
    coalesce(v.needs_support_cycles,0),coalesce(v.retention_pending_cycles,0)
  from public.teacher_intelligence_signals tis
  join public.classrooms c on c.id=tis.classroom_id
  left join public.skills s on s.id=tis.skill_id
  left join lateral (
    select r.*
    from public.milo_recommendations r
    where r.signal_id=tis.id
    order by r.created_at desc
    limit 1
  ) mr on true
  left join public.classrooms gc on gc.id=mr.group_classroom_id
  left join public.support_group_lifecycles sg on sg.group_classroom_id=mr.group_classroom_id
  left join lateral (
    select count(*)::integer total_cycles,
           count(*) filter(where vc.status='verified')::integer verified_cycles,
           count(*) filter(where vc.status='needs_support')::integer needs_support_cycles,
           count(*) filter(where vc.status='retention_pending')::integer retention_pending_cycles
    from public.learning_verification_cycles vc
    where vc.group_classroom_id=mr.group_classroom_id
      and (tis.skill_id is null or vc.skill_id=tis.skill_id)
  ) v on true
  where tis.classroom_id=p_classroom_id
  order by
    case tis.status when 'proposed' then 0 when 'deferred' then 1 when 'approved' then 2
                    when 'rejected' then 3 when 'resolved' then 4 else 5 end,
    tis.detected_at desc;
end $$;

revoke all on function public.get_teacher_intelligence_dashboard(uuid) from public,anon;
grant execute on function public.get_teacher_intelligence_dashboard(uuid) to authenticated;

comment on function public.get_teacher_intelligence_dashboard(uuid) is
  'Phase 1F teacher-owned dashboard hierarchy: Need, Why, Evidence, Strength, Next goal, Recommended action, Teacher decision, Outcome.';

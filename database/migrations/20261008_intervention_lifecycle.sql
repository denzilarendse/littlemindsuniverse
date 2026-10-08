-- LMU Phase 1D: intervention lifecycle and temporary support groups.
-- Extends existing teacher-approved support classrooms; no permanent learner labels.

create table if not exists public.support_group_lifecycles (
  id uuid primary key default gen_random_uuid(),
  group_classroom_id uuid not null unique references public.classrooms(id) on delete cascade,
  parent_classroom_id uuid not null references public.classrooms(id) on delete cascade,
  recommendation_id uuid references public.milo_recommendations(id) on delete set null,
  target_skill_id uuid references public.skills(id) on delete set null,
  objective text not null,
  entry_reason text not null,
  review_at timestamptz not null,
  exit_criteria text not null,
  status text not null default 'active'
    check (status in ('active','continued','modified','completed','dissolved')),
  outcome text,
  started_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  completed_at timestamptz,
  dissolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.support_group_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  lifecycle_id uuid not null references public.support_group_lifecycles(id) on delete cascade,
  teacher_profile_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in (
    'activated','continued','modified','learner_exit','membership_changed','completed','dissolved'
  )),
  previous_status text,
  new_status text,
  note text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);

create table if not exists public.support_group_membership_events (
  id uuid primary key default gen_random_uuid(),
  group_classroom_id uuid not null references public.classrooms(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  teacher_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('entered','removed','reentered')),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_group_lifecycle_parent_status_idx
  on public.support_group_lifecycles(parent_classroom_id,status,review_at);
create index if not exists support_group_lifecycle_events_lifecycle_idx
  on public.support_group_lifecycle_events(lifecycle_id,created_at desc);
create index if not exists support_group_membership_events_group_idx
  on public.support_group_membership_events(group_classroom_id,learner_id,created_at desc);

alter table public.support_group_lifecycles enable row level security;
alter table public.support_group_lifecycle_events enable row level security;
alter table public.support_group_membership_events enable row level security;

revoke all on public.support_group_lifecycles from anon,authenticated;
revoke all on public.support_group_lifecycle_events from anon,authenticated;
revoke all on public.support_group_membership_events from anon,authenticated;

create or replace function public.initialize_support_group_lifecycle_from_recommendation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_group public.classrooms%rowtype;
  v_lifecycle_id uuid;
  v_objective text;
  v_entry text;
begin
  if new.group_classroom_id is null or new.group_classroom_id is not distinct from old.group_classroom_id then
    return new;
  end if;

  select * into v_group
  from public.classrooms
  where id=new.group_classroom_id
    and classroom_type in ('intervention'::public.classroom_type,'enrichment'::public.classroom_type);

  if not found then return new; end if;

  v_objective:=coalesce(nullif(trim(new.recommended_action),''),
    'Provide targeted temporary support and collect new independent evidence.');
  v_entry:=coalesce(nullif(trim(new.rationale),''),
    'Teacher-approved support based on reviewed learner evidence.');

  insert into public.support_group_lifecycles(
    group_classroom_id,parent_classroom_id,recommendation_id,target_skill_id,
    objective,entry_reason,review_at,exit_criteria,status
  ) values(
    v_group.id,v_group.parent_classroom_id,new.id,new.skill_id,
    v_objective,v_entry,now()+interval '7 days',
    'Teacher confirms the target skill has sufficient independent evidence for the learner to leave this temporary group.',
    'active'
  )
  on conflict(group_classroom_id) do update set
    recommendation_id=excluded.recommendation_id,
    target_skill_id=coalesce(public.support_group_lifecycles.target_skill_id,excluded.target_skill_id),
    updated_at=now()
  returning id into v_lifecycle_id;

  insert into public.support_group_lifecycle_events(
    lifecycle_id,teacher_profile_id,action,previous_status,new_status,note,metadata
  )
  select v_lifecycle_id,new.approved_by,'activated',null,'active',
    'Teacher-approved support group activated.',
    jsonb_build_object('recommendation_id',new.id)
  where not exists(
    select 1 from public.support_group_lifecycle_events e
    where e.lifecycle_id=v_lifecycle_id and e.action='activated'
  );

  insert into public.support_group_membership_events(
    group_classroom_id,learner_id,teacher_profile_id,event_type,reason
  )
  select v_group.id,cm.learner_id,new.approved_by,'entered',v_entry
  from public.classroom_members cm
  where cm.classroom_id=v_group.id and cm.status::text='active'
    and not exists(
      select 1 from public.support_group_membership_events me
      where me.group_classroom_id=v_group.id and me.learner_id=cm.learner_id
    );

  return new;
end $$;

drop trigger if exists milo_recommendation_initialize_support_lifecycle on public.milo_recommendations;
create trigger milo_recommendation_initialize_support_lifecycle
after update of group_classroom_id on public.milo_recommendations
for each row execute function public.initialize_support_group_lifecycle_from_recommendation();

-- Backfill lifecycle metadata for support groups already created by approved recommendations.
insert into public.support_group_lifecycles(
  group_classroom_id,parent_classroom_id,recommendation_id,target_skill_id,
  objective,entry_reason,review_at,exit_criteria,status,started_at
)
select c.id,c.parent_classroom_id,mr.id,mr.skill_id,
  coalesce(nullif(trim(mr.recommended_action),''),'Provide targeted temporary support and collect new independent evidence.'),
  coalesce(nullif(trim(mr.rationale),''),'Teacher-approved support based on reviewed learner evidence.'),
  coalesce(mr.approved_at,c.created_at,now())+interval '7 days',
  'Teacher confirms the target skill has sufficient independent evidence for the learner to leave this temporary group.',
  case when c.active then 'active' else 'dissolved' end,
  coalesce(mr.approved_at,c.created_at,now())
from public.milo_recommendations mr
join public.classrooms c on c.id=mr.group_classroom_id
where c.classroom_type in ('intervention'::public.classroom_type,'enrichment'::public.classroom_type)
on conflict(group_classroom_id) do nothing;

insert into public.support_group_membership_events(
  group_classroom_id,learner_id,teacher_profile_id,event_type,reason,created_at
)
select sg.group_classroom_id,cm.learner_id,c.teacher_profile_id,'entered',sg.entry_reason,
       coalesce(cm.joined_at,sg.started_at)
from public.support_group_lifecycles sg
join public.classrooms c on c.id=sg.group_classroom_id
join public.classroom_members cm on cm.classroom_id=sg.group_classroom_id
where cm.status::text='active'
  and not exists(
    select 1 from public.support_group_membership_events me
    where me.group_classroom_id=sg.group_classroom_id and me.learner_id=cm.learner_id
  );

create or replace function public.get_teacher_support_group_lifecycles(p_parent_classroom_id uuid)
returns table(
  group_classroom_id uuid,
  group_name text,
  group_type text,
  target_skill_id uuid,
  skill_name text,
  objective text,
  entry_reason text,
  review_at timestamptz,
  exit_criteria text,
  lifecycle_status text,
  outcome text,
  started_at timestamptz,
  last_reviewed_at timestamptz,
  learner_ids uuid[],
  learner_names text[]
)
language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  if not public.teacher_owns_classroom(p_parent_classroom_id) then raise exception 'Not authorized.'; end if;

  return query
  select c.id,c.name,c.classroom_type::text,sg.target_skill_id,s.name,
         sg.objective,sg.entry_reason,sg.review_at,sg.exit_criteria,
         case when sg.status in ('active','continued','modified') and sg.review_at<=now()
              then 'review_due' else sg.status end,
         sg.outcome,sg.started_at,sg.last_reviewed_at,
         array(select cm.learner_id
               from public.classroom_members cm join public.learners l on l.id=cm.learner_id
               where cm.classroom_id=c.id and cm.status::text='active' and l.active=true
               order by l.display_name,cm.learner_id),
         array(select l.display_name
               from public.classroom_members cm join public.learners l on l.id=cm.learner_id
               where cm.classroom_id=c.id and cm.status::text='active' and l.active=true
               order by l.display_name,cm.learner_id)
  from public.support_group_lifecycles sg
  join public.classrooms c on c.id=sg.group_classroom_id
  left join public.skills s on s.id=sg.target_skill_id
  where sg.parent_classroom_id=p_parent_classroom_id
    and c.teacher_profile_id=(select auth.uid())
  order by case when sg.status in ('active','continued','modified') and sg.review_at<=now() then 0 else 1 end,
           sg.review_at,c.created_at;
end $$;

create or replace function public.review_support_group(
  p_group_classroom_id uuid,
  p_action text,
  p_note text default null,
  p_objective text default null,
  p_review_at timestamptz default null,
  p_exit_criteria text default null,
  p_outcome text default null
) returns text
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=(select auth.uid());
  v_group public.classrooms%rowtype;
  v_lifecycle public.support_group_lifecycles%rowtype;
  v_new_status text;
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;
  if p_action not in ('continue','modify','complete','dissolve') then raise exception 'Invalid lifecycle action.'; end if;

  select * into v_group from public.classrooms where id=p_group_classroom_id for update;
  if not found or v_group.parent_classroom_id is null or v_group.teacher_profile_id<>v_uid
     or v_group.classroom_type not in ('intervention'::public.classroom_type,'enrichment'::public.classroom_type)
     or not public.teacher_owns_classroom(v_group.parent_classroom_id)
  then raise exception 'Not authorized to review this support group.'; end if;

  select * into v_lifecycle from public.support_group_lifecycles
   where group_classroom_id=p_group_classroom_id for update;
  if not found then raise exception 'Support-group lifecycle not found.'; end if;
  if v_lifecycle.status in ('completed','dissolved') then raise exception 'This support group is already closed.'; end if;

  if p_action in ('continue','modify') and (p_review_at is null or p_review_at<=now()) then
    raise exception 'A future review date is required to continue or modify support.';
  end if;

  v_new_status:=case p_action
    when 'continue' then 'continued'
    when 'modify' then 'modified'
    when 'complete' then 'completed'
    else 'dissolved' end;

  update public.support_group_lifecycles set
    status=v_new_status,
    objective=coalesce(nullif(trim(p_objective),''),objective),
    review_at=coalesce(p_review_at,review_at),
    exit_criteria=coalesce(nullif(trim(p_exit_criteria),''),exit_criteria),
    outcome=coalesce(nullif(trim(p_outcome),''),outcome),
    last_reviewed_at=now(),
    completed_at=case when p_action='complete' then now() else completed_at end,
    dissolved_at=case when p_action='dissolve' then now() else dissolved_at end,
    updated_at=now()
  where id=v_lifecycle.id;

  if p_action in ('complete','dissolve') then
    insert into public.support_group_membership_events(group_classroom_id,learner_id,teacher_profile_id,event_type,reason)
    select p_group_classroom_id,cm.learner_id,v_uid,'removed',
      coalesce(nullif(trim(p_note),''),'Support group closed by teacher.')
    from public.classroom_members cm
    where cm.classroom_id=p_group_classroom_id and cm.status::text='active';

    update public.classroom_members
       set status='removed'::public.membership_status
     where classroom_id=p_group_classroom_id and status::text='active';

    update public.classrooms set active=false where id=p_group_classroom_id;
  end if;

  insert into public.support_group_lifecycle_events(
    lifecycle_id,teacher_profile_id,action,previous_status,new_status,note,metadata
  ) values(
    v_lifecycle.id,v_uid,
    case p_action when 'continue' then 'continued'
                  when 'modify' then 'modified'
                  when 'complete' then 'completed'
                  else 'dissolved' end,
    v_lifecycle.status,v_new_status,p_note,
    jsonb_build_object('review_at',coalesce(p_review_at,v_lifecycle.review_at))
  );

  return v_new_status;
end $$;

create or replace function public.exit_support_group_learner(
  p_group_classroom_id uuid,
  p_learner_id uuid,
  p_reason text
) returns text
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=(select auth.uid());
  v_group public.classrooms%rowtype;
  v_lifecycle public.support_group_lifecycles%rowtype;
  v_remaining integer;
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'An exit reason is required.'; end if;

  select * into v_group from public.classrooms where id=p_group_classroom_id for update;
  if not found or v_group.teacher_profile_id<>v_uid or v_group.parent_classroom_id is null
     or not public.teacher_owns_classroom(v_group.parent_classroom_id)
  then raise exception 'Not authorized to manage this support group.'; end if;

  select * into v_lifecycle from public.support_group_lifecycles
   where group_classroom_id=p_group_classroom_id for update;
  if not found or v_lifecycle.status in ('completed','dissolved') then
    raise exception 'This support group is not active.';
  end if;

  if not exists(select 1 from public.classroom_members
                where classroom_id=p_group_classroom_id and learner_id=p_learner_id and status::text='active')
  then raise exception 'Learner is not an active member of this support group.'; end if;

  update public.classroom_members set status='removed'::public.membership_status
   where classroom_id=p_group_classroom_id and learner_id=p_learner_id;

  insert into public.support_group_membership_events(
    group_classroom_id,learner_id,teacher_profile_id,event_type,reason
  ) values(p_group_classroom_id,p_learner_id,v_uid,'removed',trim(p_reason));

  insert into public.support_group_lifecycle_events(
    lifecycle_id,teacher_profile_id,action,previous_status,new_status,note,metadata
  ) values(v_lifecycle.id,v_uid,'learner_exit',v_lifecycle.status,v_lifecycle.status,trim(p_reason),
           jsonb_build_object('learner_id',p_learner_id));

  select count(*)::integer into v_remaining
  from public.classroom_members
  where classroom_id=p_group_classroom_id and status::text='active';

  if v_remaining=0 then
    update public.support_group_lifecycles
       set status='dissolved',dissolved_at=now(),last_reviewed_at=now(),
           outcome=coalesce(outcome,'Group dissolved after final learner exit.'),updated_at=now()
     where id=v_lifecycle.id;
    update public.classrooms set active=false where id=p_group_classroom_id;
    insert into public.support_group_lifecycle_events(
      lifecycle_id,teacher_profile_id,action,previous_status,new_status,note,metadata
    ) values(v_lifecycle.id,v_uid,'dissolved',v_lifecycle.status,'dissolved',
             'Group dissolved automatically after the final learner exited.','{}'::jsonb);
    return 'dissolved';
  end if;

  return 'active';
end $$;

-- Preserve the existing membership-management signature while adding lifecycle history.
create or replace function public.set_support_group_members(
  p_group_classroom_id uuid,
  p_learner_ids uuid[]
) returns integer
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=(select auth.uid());
  v_group public.classrooms%rowtype;
  v_ids uuid[];
  v_before uuid[];
  v_count integer;
  v_lifecycle_id uuid;
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;
  select c.* into v_group from public.classrooms c where c.id=p_group_classroom_id for update;
  if not found then raise exception 'Support group not found.'; end if;
  if v_group.teacher_profile_id<>v_uid or v_group.active is not true
     or v_group.classroom_type not in ('intervention'::public.classroom_type,'enrichment'::public.classroom_type)
     or v_group.parent_classroom_id is null
  then raise exception 'You are not authorized to manage this support group.'; end if;
  if not public.teacher_owns_classroom(v_group.parent_classroom_id) then
    raise exception 'The parent classroom is not available to this teacher.';
  end if;

  select coalesce(array_agg(cm.learner_id order by cm.learner_id),'{}'::uuid[])
    into v_before from public.classroom_members cm
   where cm.classroom_id=p_group_classroom_id and cm.status::text='active';

  select coalesce(array_agg(x order by x),'{}'::uuid[]) into v_ids
  from (select distinct learner_id as x from unnest(coalesce(p_learner_ids,'{}'::uuid[])) learner_id where learner_id is not null) n;

  v_count:=coalesce(cardinality(v_ids),0);
  if v_count<1 then raise exception 'A support group must contain at least one learner.'; end if;
  if v_count>50 then raise exception 'A support group may contain at most 50 learners.'; end if;

  if exists(
    select 1 from unnest(v_ids) requested(learner_id)
    where not exists(
      select 1 from public.classroom_members parent_member
      join public.learners l on l.id=parent_member.learner_id
      where parent_member.classroom_id=v_group.parent_classroom_id
        and parent_member.learner_id=requested.learner_id
        and parent_member.status::text='active' and l.active=true
    )
  ) then raise exception 'Every support-group learner must be an active member of the parent classroom.'; end if;

  insert into public.support_group_membership_events(group_classroom_id,learner_id,teacher_profile_id,event_type,reason)
  select p_group_classroom_id,x,v_uid,'removed','Teacher updated support-group membership.'
  from unnest(v_before) x where not (x=any(v_ids));

  insert into public.support_group_membership_events(group_classroom_id,learner_id,teacher_profile_id,event_type,reason)
  select p_group_classroom_id,x,v_uid,
         case when exists(select 1 from public.classroom_members cm where cm.classroom_id=p_group_classroom_id and cm.learner_id=x)
              then 'reentered' else 'entered' end,
         'Teacher updated support-group membership.'
  from unnest(v_ids) x where not (x=any(v_before));

  update public.classroom_members cm set status='removed'::public.membership_status
   where cm.classroom_id=p_group_classroom_id and cm.status::text='active' and not (cm.learner_id=any(v_ids));

  insert into public.classroom_members(classroom_id,learner_id,status)
  select p_group_classroom_id,learner_id,'active'::public.membership_status
  from unnest(v_ids) requested(learner_id)
  on conflict(classroom_id,learner_id) do update set status='active'::public.membership_status;

  select id into v_lifecycle_id from public.support_group_lifecycles where group_classroom_id=p_group_classroom_id;
  if v_lifecycle_id is not null and v_before is distinct from v_ids then
    insert into public.support_group_lifecycle_events(
      lifecycle_id,teacher_profile_id,action,previous_status,new_status,note,metadata
    )
    select v_lifecycle_id,v_uid,'membership_changed',sg.status,sg.status,
           'Teacher updated support-group membership.',
           jsonb_build_object('before',v_before,'after',v_ids)
    from public.support_group_lifecycles sg where sg.id=v_lifecycle_id;
  end if;

  select count(*)::integer into v_count from public.classroom_members
   where classroom_id=p_group_classroom_id and status::text='active';
  return v_count;
end $$;

revoke all on function public.get_teacher_support_group_lifecycles(uuid) from public,anon;
grant execute on function public.get_teacher_support_group_lifecycles(uuid) to authenticated;
revoke all on function public.review_support_group(uuid,text,text,text,timestamptz,text,text) from public,anon;
grant execute on function public.review_support_group(uuid,text,text,text,timestamptz,text,text) to authenticated;
revoke all on function public.exit_support_group_learner(uuid,uuid,text) from public,anon;
grant execute on function public.exit_support_group_learner(uuid,uuid,text) to authenticated;

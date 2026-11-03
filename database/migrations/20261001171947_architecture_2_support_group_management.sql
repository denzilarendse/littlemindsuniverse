-- Batch 6: teacher-controlled intervention and enrichment group management.
-- Keep membership mutation behind an authorization-aware RPC. Direct classroom member inserts remain locked.

create or replace function public.get_teacher_support_groups(
  p_parent_classroom_id uuid
)
returns table(
  group_classroom_id uuid,
  parent_classroom_id uuid,
  group_name text,
  group_type text,
  skill_id uuid,
  skill_name text,
  created_at timestamptz,
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

  if not public.teacher_owns_classroom(p_parent_classroom_id) then
    raise exception 'You are not authorized to view support groups for this classroom.';
  end if;

  return query
  select
    c.id,
    c.parent_classroom_id,
    c.name,
    c.classroom_type::text,
    target.skill_id,
    target.skill_name,
    c.created_at,
    array(
      select cm.learner_id
      from public.classroom_members cm
      join public.learners l on l.id = cm.learner_id
      where cm.classroom_id = c.id
        and cm.status = 'active'::public.membership_status
        and l.active = true
      order by l.display_name, cm.learner_id
    )::uuid[] as learner_ids,
    array(
      select l.display_name
      from public.classroom_members cm
      join public.learners l on l.id = cm.learner_id
      where cm.classroom_id = c.id
        and cm.status = 'active'::public.membership_status
        and l.active = true
      order by l.display_name, cm.learner_id
    )::text[] as learner_names
  from public.classrooms c
  left join lateral (
    select mr.skill_id, s.name as skill_name
    from public.milo_recommendations mr
    join public.skills s on s.id = mr.skill_id
    where mr.group_classroom_id = c.id
    order by mr.created_at desc
    limit 1
  ) target on true
  where c.parent_classroom_id = p_parent_classroom_id
    and c.teacher_profile_id = (select auth.uid())
    and c.active = true
    and c.classroom_type in (
      'intervention'::public.classroom_type,
      'enrichment'::public.classroom_type
    )
  order by c.created_at desc, c.id;
end;
$function$;

revoke all on function public.get_teacher_support_groups(uuid) from public, anon;
grant execute on function public.get_teacher_support_groups(uuid) to authenticated;

create or replace function public.set_support_group_members(
  p_group_classroom_id uuid,
  p_learner_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_group public.classrooms%rowtype;
  v_ids uuid[];
  v_count integer;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  select c.*
  into v_group
  from public.classrooms c
  where c.id = p_group_classroom_id
  for update;

  if not found then
    raise exception 'Support group not found.';
  end if;

  if v_group.teacher_profile_id <> v_uid
     or v_group.active is not true
     or v_group.classroom_type not in (
       'intervention'::public.classroom_type,
       'enrichment'::public.classroom_type
     )
     or v_group.parent_classroom_id is null then
    raise exception 'You are not authorized to manage this support group.';
  end if;

  if not public.teacher_owns_classroom(v_group.parent_classroom_id) then
    raise exception 'The parent classroom is not available to this teacher.';
  end if;

  select coalesce(array_agg(x order by x), '{}'::uuid[])
  into v_ids
  from (
    select distinct learner_id as x
    from unnest(coalesce(p_learner_ids, '{}'::uuid[])) learner_id
    where learner_id is not null
  ) normalized;

  v_count := coalesce(cardinality(v_ids), 0);
  if v_count < 1 then
    raise exception 'A support group must contain at least one learner.';
  end if;
  if v_count > 50 then
    raise exception 'A support group may contain at most 50 learners.';
  end if;

  if exists (
    select 1
    from unnest(v_ids) requested(learner_id)
    where not exists (
      select 1
      from public.classroom_members parent_member
      join public.learners l on l.id = parent_member.learner_id
      where parent_member.classroom_id = v_group.parent_classroom_id
        and parent_member.learner_id = requested.learner_id
        and parent_member.status = 'active'::public.membership_status
        and l.active = true
    )
  ) then
    raise exception 'Every support-group learner must be an active member of the parent classroom.';
  end if;

  update public.classroom_members cm
  set status = 'removed'::public.membership_status
  where cm.classroom_id = p_group_classroom_id
    and cm.status = 'active'::public.membership_status
    and not (cm.learner_id = any(v_ids));

  insert into public.classroom_members(classroom_id, learner_id, status)
  select p_group_classroom_id, learner_id, 'active'::public.membership_status
  from unnest(v_ids) requested(learner_id)
  on conflict (classroom_id, learner_id)
  do update set status = 'active'::public.membership_status;

  select count(*)::integer
  into v_count
  from public.classroom_members cm
  where cm.classroom_id = p_group_classroom_id
    and cm.status = 'active'::public.membership_status;

  return v_count;
end;
$function$;

revoke all on function public.set_support_group_members(uuid,uuid[]) from public, anon;
grant execute on function public.set_support_group_members(uuid,uuid[]) to authenticated;

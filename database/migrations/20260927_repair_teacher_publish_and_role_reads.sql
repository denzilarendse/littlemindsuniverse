-- Production browser E2E repair: teacher draft save/publish and learner role reads.
--
-- Keep internal authorization predicates out of the exposed public RPC surface.
-- RLS uses bounded SECURITY DEFINER helpers in a non-exposed private schema instead.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.has_commercial_learning_access(
  p_learner_id uuid,
  p_learning_item_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1
    from public.learning_items li
    join public.learning_item_recipients lir
      on lir.learning_item_id = li.id
     and lir.learner_id = p_learner_id
    where li.id = p_learning_item_id
      and li.status in ('published','closed')
      and (
        li.week_number = 1
        or public.has_premium_access(p_learner_id)
      )
  );
$$;

create or replace function private.learner_in_learning_item_classroom(
  p_learning_item_id uuid,
  p_learner_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1
    from public.learning_items li
    join public.classroom_members cm
      on cm.classroom_id = li.classroom_id
    where li.id = p_learning_item_id
      and cm.learner_id = p_learner_id
      and cm.status::text = 'active'
  );
$$;

revoke all on function private.has_commercial_learning_access(uuid, uuid) from public;
revoke all on function private.learner_in_learning_item_classroom(uuid, uuid) from public;
grant execute on function private.has_commercial_learning_access(uuid, uuid) to authenticated;
grant execute on function private.learner_in_learning_item_classroom(uuid, uuid) to authenticated;

-- The browser still must not be able to call these public internal helpers directly.
revoke execute on function public.has_commercial_learning_access(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.has_premium_access(uuid) from public, anon, authenticated;
revoke execute on function public.learner_in_learning_item_classroom(uuid, uuid) from public, anon, authenticated;

alter policy allowed_users_read_recipients
on public.learning_item_recipients
using (
  public.teacher_owns_learning_item(learning_item_id)
  or (
    exists (
      select 1
      from public.learning_items li
      where li.id = learning_item_recipients.learning_item_id
        and li.status in ('published','closed')
    )
    and (
      exists (
        select 1
        from public.learners l
        where l.id = learning_item_recipients.learner_id
          and l.user_id = (select auth.uid())
          and l.active = true
      )
      or exists (
        select 1
        from public.guardian_learner_links gl
        where gl.learner_id = learning_item_recipients.learner_id
          and gl.guardian_profile_id = (select auth.uid())
          and gl.verified = true
      )
    )
    and private.has_commercial_learning_access(learner_id, learning_item_id)
  )
);

alter policy learner_updates_own_recipient
on public.learning_item_recipients
using (
  exists (
    select 1
    from public.learners l
    join public.learning_items li on li.id = learning_item_recipients.learning_item_id
    where l.id = learning_item_recipients.learner_id
      and l.user_id = (select auth.uid())
      and l.active = true
      and li.status in ('published','closed')
  )
  and private.has_commercial_learning_access(learner_id, learning_item_id)
)
with check (
  exists (
    select 1
    from public.learners l
    join public.learning_items li on li.id = learning_item_recipients.learning_item_id
    where l.id = learning_item_recipients.learner_id
      and l.user_id = (select auth.uid())
      and l.active = true
      and li.status in ('published','closed')
  )
  and private.has_commercial_learning_access(learner_id, learning_item_id)
);

alter policy teacher_assigns_learning_item
on public.learning_item_recipients
with check (
  public.teacher_owns_learning_item(learning_item_id)
  and private.learner_in_learning_item_classroom(learning_item_id, learner_id)
);

alter policy allowed_users_read_submissions
on public.learner_submissions
using (
  public.teacher_owns_learning_item(learning_item_id)
  or (
    private.has_commercial_learning_access(learner_id, learning_item_id)
    and (
      exists (
        select 1
        from public.learners l
        where l.id = learner_submissions.learner_id
          and l.user_id = (select auth.uid())
          and l.active = true
      )
      or exists (
        select 1
        from public.guardian_learner_links gl
        where gl.learner_id = learner_submissions.learner_id
          and gl.guardian_profile_id = (select auth.uid())
          and gl.verified = true
      )
    )
  )
);

alter policy learner_or_verified_guardian_creates_submission
on public.learner_submissions
with check (
  public.is_learning_item_recipient(learning_item_id, learner_id)
  and private.has_commercial_learning_access(learner_id, learning_item_id)
  and (
    exists (
      select 1
      from public.learners l
      where l.id = learner_submissions.learner_id
        and l.user_id = (select auth.uid())
        and l.active = true
    )
    or exists (
      select 1
      from public.guardian_learner_links gl
      where gl.learner_id = learner_submissions.learner_id
        and gl.guardian_profile_id = (select auth.uid())
        and gl.verified = true
    )
  )
);

alter policy learner_or_verified_guardian_updates_submission
on public.learner_submissions
using (
  private.has_commercial_learning_access(learner_id, learning_item_id)
  and (
    exists (
      select 1
      from public.learners l
      where l.id = learner_submissions.learner_id
        and l.user_id = (select auth.uid())
        and l.active = true
    )
    or exists (
      select 1
      from public.guardian_learner_links gl
      where gl.learner_id = learner_submissions.learner_id
        and gl.guardian_profile_id = (select auth.uid())
        and gl.verified = true
    )
  )
)
with check (
  public.is_learning_item_recipient(learning_item_id, learner_id)
  and private.has_commercial_learning_access(learner_id, learning_item_id)
  and (
    exists (
      select 1
      from public.learners l
      where l.id = learner_submissions.learner_id
        and l.user_id = (select auth.uid())
        and l.active = true
    )
    or exists (
      select 1
      from public.guardian_learner_links gl
      where gl.learner_id = learner_submissions.learner_id
        and gl.guardian_profile_id = (select auth.uid())
        and gl.verified = true
    )
  )
);

-- Direct browser report reads are intentionally RLS-scoped; the missing table grant
-- caused 403 before the teacher/guardian policies could run.
grant select on table public.weekly_reports to authenticated;

-- The existing teacher authoring UI does not yet ask for a curriculum week. Preserve
-- its current contract by deriving the classroom's active week and falling back to
-- week 1 for a new classroom. This keeps week_number non-null without weakening it.
create or replace function public.create_teacher_draft_with_skill(
  p_classroom_id uuid,
  p_title text,
  p_subject text,
  p_instructions text,
  p_help_level smallint,
  p_skill_id uuid
)
returns public.learning_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.learning_items;
  v_week smallint;
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  if not public.is_current_user_teacher() then raise exception 'Teacher access required.'; end if;
  if not public.teacher_owns_classroom(p_classroom_id) then raise exception 'You are not authorized to manage this classroom.'; end if;
  if trim(coalesce(p_title,''))='' then raise exception 'A title is required.'; end if;
  if trim(coalesce(p_instructions,''))='' then raise exception 'Instructions are required.'; end if;
  if p_help_level not between 0 and 5 then raise exception 'Help level must be between 0 and 5.'; end if;
  if p_skill_id is null then raise exception 'Select a curriculum skill.'; end if;

  if not exists (
    select 1
    from public.skills s
    join public.classrooms c on c.id=p_classroom_id
    where s.id=p_skill_id and s.active=true
      and s.curriculum_code=c.curriculum_code
      and (
        s.stage_code is null or s.stage_code in (
          select distinct l.stage_code
          from public.classroom_members cm
          join public.learners l on l.id=cm.learner_id
          where cm.classroom_id=c.id and cm.status='active'
        )
      )
  ) then raise exception 'Selected skill is not available for this classroom.'; end if;

  select coalesce(max(lwp.week_number) filter (where lwp.week_number between 1 and 40), 1)::smallint
  into v_week
  from public.classroom_members cm
  join public.classrooms c on c.id=cm.classroom_id
  left join public.learner_week_progress lwp
    on lwp.learner_id=cm.learner_id
   and lwp.curriculum_code=c.curriculum_code
  where cm.classroom_id=p_classroom_id
    and cm.status='active';

  insert into public.learning_items(
    classroom_id,teacher_profile_id,item_type,title,subject,instructions,
    content_json,curriculum_code,week_number,day_role,source,status
  )
  select c.id,(select auth.uid()),'lesson',trim(p_title),nullif(trim(coalesce(p_subject,'')),''),
         trim(p_instructions),jsonb_build_object('helpLevel',p_help_level,'authentic',true),
         coalesce(c.curriculum_code,'CAPS'),v_week,'teaching','teacher','draft'
  from public.classrooms c where c.id=p_classroom_id
  returning * into v_item;

  insert into public.learning_item_skills(learning_item_id,skill_id,is_primary)
  values(v_item.id,p_skill_id,true);

  return v_item;
end;
$$;

revoke execute on function public.create_teacher_draft_with_skill(uuid,text,text,text,smallint,uuid) from public, anon;
grant execute on function public.create_teacher_draft_with_skill(uuid,text,text,text,smallint,uuid) to authenticated;

-- The teacher branch has one row per classroom/learner/guardian because both
-- membership/link pairs are unique. DISTINCT was unnecessary and made the ORDER BY
-- on primary_guardian invalid in PostgreSQL.
create or replace function public.get_connect_contacts()
returns table(
  classroom_id uuid,
  classroom_name text,
  learner_id uuid,
  learner_name text,
  guardian_profile_id uuid,
  guardian_name text,
  teacher_profile_id uuid,
  teacher_name text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role = 'parent' then
    return query
    select distinct
      c.id, c.name, l.id, l.display_name, gl.guardian_profile_id, gp.display_name,
      c.teacher_profile_id, tp.display_name
    from public.guardian_learner_links gl
    join public.learners l on l.id = gl.learner_id
    join public.classroom_members cm on cm.learner_id = l.id and cm.status = 'active'
    join public.classrooms c on c.id = cm.classroom_id and c.active = true
    join public.profiles gp on gp.id = gl.guardian_profile_id
    join public.profiles tp on tp.id = c.teacher_profile_id
    where gl.guardian_profile_id = auth.uid()
      and gl.verified = true
      and gl.can_receive_class_messages = true
    order by c.name, l.display_name;
  elsif v_role = 'teacher' then
    return query
    select
      c.id, c.name, l.id, l.display_name, gl.guardian_profile_id, gp.display_name,
      c.teacher_profile_id, tp.display_name
    from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id and cm.status = 'active'
    join public.learners l on l.id = cm.learner_id
    join public.guardian_learner_links gl
      on gl.learner_id = l.id
     and gl.verified = true
     and gl.can_receive_class_messages = true
    join public.profiles gp on gp.id = gl.guardian_profile_id
    join public.profiles tp on tp.id = c.teacher_profile_id
    where c.teacher_profile_id = auth.uid()
      and c.active = true
    order by c.name, l.display_name, gl.primary_guardian desc, gp.display_name;
  else
    raise exception 'Connect classroom messaging is available to verified teachers and guardians.';
  end if;
end;
$$;

revoke execute on function public.get_connect_contacts() from public, anon;
grant execute on function public.get_connect_contacts() to authenticated;

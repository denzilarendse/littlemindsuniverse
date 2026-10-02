-- Architecture 2.0 Stage 2: transactional teacher publishing and explicit privacy deny policy.

drop policy if exists "privacy_requests_no_direct_client_access" on public.privacy_requests;
create policy "privacy_requests_no_direct_client_access"
on public.privacy_requests
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.publish_teacher_learning_item(
  p_learning_item_id uuid,
  p_learner_ids uuid[]
)
returns public.learning_items
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_item public.learning_items;
  v_expected integer;
  v_valid integer;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_current_user_teacher() then
    raise exception 'Teacher access required.';
  end if;

  if p_learning_item_id is null then
    raise exception 'Learning item is required.';
  end if;

  v_expected := coalesce(cardinality(p_learner_ids), 0);
  if v_expected < 1 then
    raise exception 'Select at least one learner.';
  end if;
  if v_expected > 200 then
    raise exception 'Too many learners selected.';
  end if;
  if exists (select 1 from unnest(p_learner_ids) as x(id) where x.id is null) then
    raise exception 'Learner selection is invalid.';
  end if;
  if (select count(distinct x.id) from unnest(p_learner_ids) as x(id)) <> v_expected then
    raise exception 'Learner selection contains duplicates.';
  end if;

  select li.*
  into v_item
  from public.learning_items li
  where li.id = p_learning_item_id
  for update;

  if v_item.id is null then
    raise exception 'Learning item not found.';
  end if;
  if v_item.teacher_profile_id <> v_uid then
    raise exception 'You are not authorized to publish this learning item.';
  end if;
  if not public.teacher_owns_classroom(v_item.classroom_id) then
    raise exception 'You are not authorized to manage this classroom.';
  end if;
  if v_item.status not in ('draft'::public.learning_item_status, 'published'::public.learning_item_status) then
    raise exception 'This learning item cannot be published from its current status.';
  end if;
  if not exists (
    select 1
    from public.learning_item_skills lis
    where lis.learning_item_id = v_item.id
  ) then
    raise exception 'Map at least one curriculum skill before publishing.';
  end if;

  select count(*)
  into v_valid
  from public.classroom_members cm
  join public.learners l on l.id = cm.learner_id
  where cm.classroom_id = v_item.classroom_id
    and cm.status = 'active'::public.membership_status
    and l.active = true
    and cm.learner_id = any(p_learner_ids);

  if v_valid <> v_expected then
    raise exception 'One or more learners are not active members of this classroom.';
  end if;

  insert into public.learning_item_recipients(learning_item_id, learner_id, status)
  select v_item.id, x.id, 'assigned'::public.recipient_learning_status
  from unnest(p_learner_ids) as x(id)
  on conflict (learning_item_id, learner_id) do update
  set status = case
    when public.learning_item_recipients.status = 'assigned'::public.recipient_learning_status
      then excluded.status
    else public.learning_item_recipients.status
  end;

  update public.learning_items
  set status = 'published'::public.learning_item_status,
      approved_by = coalesce(approved_by, v_uid),
      approved_at = coalesce(approved_at, now()),
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id = v_item.id
  returning * into v_item;

  return v_item;
end;
$function$;

revoke all on function public.publish_teacher_learning_item(uuid, uuid[]) from public;
revoke all on function public.publish_teacher_learning_item(uuid, uuid[]) from anon;
grant execute on function public.publish_teacher_learning_item(uuid, uuid[]) to authenticated;

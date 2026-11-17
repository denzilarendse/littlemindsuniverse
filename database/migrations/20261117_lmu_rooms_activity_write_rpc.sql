-- LMU room activity write boundary.
-- Authenticated learner-self writes only; no guardian/teacher impersonation.
-- The actor and event timestamp are always derived by PostgreSQL.

begin;

create index if not exists room_activity_actor_created_idx
  on public.room_activity_events (actor_profile_id, created_at desc);

create or replace function public.record_room_activity(
  p_learner_id uuid,
  p_room_key text,
  p_content_item_id uuid,
  p_event_type text,
  p_result jsonb default '{}'::jsonb,
  p_duration_seconds integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_profile_role text;
  v_language text;
  v_stage_code text;
  v_content_locale text;
  v_event_id uuid;
  v_recent_count integer;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  if p_learner_id is null
     or p_room_key not in ('playworld', 'storyverse')
     or p_event_type not in ('activity_started', 'activity_completed') then
    raise exception using errcode = '22023', message = 'invalid room activity parameters';
  end if;

  if p_duration_seconds is not null
     and p_duration_seconds not between 0 and 7200 then
    raise exception using errcode = '22023', message = 'duration is outside allowed bounds';
  end if;

  if p_result is null
     or pg_catalog.jsonb_typeof(p_result) <> 'object'
     or pg_catalog.pg_column_size(p_result) > 2048 then
    raise exception using errcode = '22023', message = 'result must be a bounded JSON object';
  end if;

  -- Only compact, non-identifying assessment/progress primitives are accepted.
  -- Free text, nested objects, arrays and arbitrary metadata are rejected.
  if exists (
    select 1
    from pg_catalog.jsonb_each(p_result) as item(key, value)
    where case item.key
      when 'score' then
        pg_catalog.jsonb_typeof(item.value) <> 'number'
        or (item.value #>> '{}')::numeric not between 0 and 100000
      when 'correct_count' then
        pg_catalog.jsonb_typeof(item.value) <> 'number'
        or (item.value #>> '{}')::numeric not between 0 and 10000
      when 'total_count' then
        pg_catalog.jsonb_typeof(item.value) <> 'number'
        or (item.value #>> '{}')::numeric not between 0 and 10000
      when 'attempts' then
        pg_catalog.jsonb_typeof(item.value) <> 'number'
        or (item.value #>> '{}')::numeric not between 0 and 10000
      when 'progress' then
        pg_catalog.jsonb_typeof(item.value) <> 'number'
        or (item.value #>> '{}')::numeric not between 0 and 100
      when 'outcome' then
        pg_catalog.jsonb_typeof(item.value) <> 'string'
        or item.value #>> '{}' not in ('started', 'completed', 'passed', 'needs_practice')
      when 'completed' then
        pg_catalog.jsonb_typeof(item.value) <> 'boolean'
      else true
    end
  ) then
    raise exception using errcode = '22023', message = 'result contains unsupported or invalid fields';
  end if;

  -- Writes are strictly learner-self. A verified guardian or classroom teacher
  -- may read activity but cannot submit events as the learner.
  select p.role::text,
         coalesce(
           nullif(l.learning_language, ''),
           nullif(l.home_language, ''),
           nullif(p.preferred_language, ''),
           'en'
         ),
         l.stage_code
    into v_profile_role, v_language, v_stage_code
  from public.learners l
  join public.profiles p on p.id = l.user_id
  where l.id = p_learner_id
    and l.user_id = v_actor_id
    and l.active = true;

  if not found or v_profile_role <> 'learner' then
    raise exception using errcode = '42501', message = 'learner-self access required';
  end if;

  select ci.locale
    into v_content_locale
  from public.room_content_items ci
  where ci.id = p_content_item_id
    and ci.room_key = p_room_key
    and ci.status = 'published'
    and (ci.stage_code is null or ci.stage_code = v_stage_code);

  if not found
     or pg_catalog.lower(pg_catalog.split_part(v_content_locale, '-', 1))
        <> pg_catalog.lower(pg_catalog.split_part(v_language, '-', 1)) then
    raise exception using errcode = '22023', message = 'content is not published for this learner stage and language';
  end if;

  -- Serialize per-actor rate checks to avoid concurrent requests bypassing the cap.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('lmu-room-activity:' || v_actor_id::text, 0)
  );

  select pg_catalog.count(*)::integer
    into v_recent_count
  from public.room_activity_events e
  where e.actor_profile_id = v_actor_id
    and e.created_at >= pg_catalog.now() - interval '1 minute';

  if v_recent_count >= 30 then
    raise exception using errcode = '53300', message = 'room activity rate limit exceeded';
  end if;

  insert into public.room_activity_events (
    learner_id,
    room_key,
    content_item_id,
    event_type,
    result,
    duration_seconds,
    actor_profile_id
  ) values (
    p_learner_id,
    p_room_key,
    p_content_item_id,
    p_event_type,
    p_result,
    p_duration_seconds,
    v_actor_id
  )
  returning id into v_event_id;

  return v_event_id;
end;
$function$;

revoke all on function public.record_room_activity(uuid, text, uuid, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.record_room_activity(uuid, text, uuid, text, jsonb, integer)
  to authenticated;

comment on function public.record_room_activity(uuid, text, uuid, text, jsonb, integer)
  is 'Append one validated PlayWorld/StoryVerse learner-self activity event; actor and timestamp are server-derived.';

commit;

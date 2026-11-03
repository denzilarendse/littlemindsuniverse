-- Architecture 2.0 Stages 5-7: stage-aware Milo engines and learner tutor catalogue.

create or replace function public.start_milo_learning_session(
  p_learner_id uuid,
  p_learning_item_id uuid,
  p_engine text,
  p_session_mode text,
  p_assistance_level smallint,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_role public.app_role;
  v_skill_id uuid;
  v_session_id uuid;
  v_stage_code text;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_uid;

  if v_role <> 'learner'::public.app_role then
    raise exception 'Learner session required.';
  end if;

  select l.stage_code
  into v_stage_code
  from public.learners l
  where l.id = p_learner_id
    and l.user_id = v_uid
    and l.active = true;

  if v_stage_code is null then
    raise exception 'Active learner access required.';
  end if;

  if p_engine not in (
    'early_learning','play_story','ai_literacy','reasoning_missions',
    'voice_language','adaptive_practice','coding_ai','brilliant_tutor'
  ) then
    raise exception 'Unsupported Milo engine.';
  end if;

  if v_stage_code = 'EE24' and p_engine not in ('early_learning','play_story','voice_language') then
    raise exception 'This Milo learning mode is not available for the learner stage.';
  elsif v_stage_code = 'F57' and p_engine not in (
    'early_learning','play_story','voice_language','reasoning_missions',
    'adaptive_practice','ai_literacy'
  ) then
    raise exception 'This Milo learning mode is not available for the learner stage.';
  elsif v_stage_code in ('DB810','CA1113','PA1415','EDGE1618') and p_engine not in (
    'voice_language','reasoning_missions','adaptive_practice',
    'ai_literacy','coding_ai','brilliant_tutor'
  ) then
    raise exception 'This Milo learning mode is not available for the learner stage.';
  end if;

  if p_session_mode not in ('learn','practice','assessment','project') then
    raise exception 'Unsupported session mode.';
  end if;

  if p_assistance_level is null or p_assistance_level not between 0 and 5 then
    raise exception 'Assistance level must be between 0 and 5.';
  end if;

  if octet_length(coalesce(p_metadata,'{}'::jsonb)::text) > 8192 then
    raise exception 'Session metadata is too large.';
  end if;

  if p_learning_item_id is not null then
    if not exists (
      select 1
      from public.learning_item_recipients lir
      join public.learning_items li on li.id = lir.learning_item_id
      where lir.learning_item_id = p_learning_item_id
        and lir.learner_id = p_learner_id
        and li.status = 'published'::public.learning_item_status
    ) then
      raise exception 'This learning item is not assigned to the learner.';
    end if;

    select lis.skill_id
    into v_skill_id
    from public.learning_item_skills lis
    where lis.learning_item_id = p_learning_item_id
    order by lis.is_primary desc, lis.created_at
    limit 1;
  end if;

  insert into public.milo_learning_sessions(
    profile_id, learner_id, learning_item_id, primary_skill_id,
    engine, session_mode, assistance_level, metadata
  )
  values(
    v_uid, p_learner_id, p_learning_item_id, v_skill_id,
    p_engine, p_session_mode, p_assistance_level, coalesce(p_metadata,'{}'::jsonb)
  )
  returning id into v_session_id;

  insert into public.milo_learning_events(
    session_id, profile_id, learner_id, learning_item_id, skill_id,
    engine, activity_type, assistance_level, independence, metadata
  )
  values(
    v_session_id, v_uid, p_learner_id, p_learning_item_id, v_skill_id,
    p_engine, 'session_started', p_assistance_level, 'unknown',
    jsonb_build_object('stageCode', v_stage_code)
  );

  return v_session_id;
end;
$function$;

revoke all on function public.start_milo_learning_session(uuid, uuid, text, text, smallint, jsonb) from public;
revoke all on function public.start_milo_learning_session(uuid, uuid, text, text, smallint, jsonb) from anon;
grant execute on function public.start_milo_learning_session(uuid, uuid, text, text, smallint, jsonb) to authenticated;

create or replace function public.get_learner_tutor_catalog(p_learner_id uuid)
returns table(
  skill_id uuid,
  skill_code text,
  curriculum_code text,
  stage_code text,
  subject text,
  skill_name text,
  description text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_curriculum text;
  v_stage text;
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.can_access_learner(p_learner_id) then
    raise exception 'You are not authorized to access this learner.';
  end if;

  select l.curriculum_code, l.stage_code
  into v_curriculum, v_stage
  from public.learners l
  where l.id = p_learner_id
    and l.active = true;

  if v_curriculum is null or v_stage is null then
    return;
  end if;

  return query
  select
    s.id,
    s.skill_code,
    s.curriculum_code,
    s.stage_code,
    s.subject,
    s.name,
    s.description
  from public.skills s
  where s.active = true
    and s.curriculum_code = v_curriculum
    and s.stage_code = v_stage
  order by s.subject, s.name
  limit 200;
end;
$function$;

revoke all on function public.get_learner_tutor_catalog(uuid) from public;
revoke all on function public.get_learner_tutor_catalog(uuid) from anon;
grant execute on function public.get_learner_tutor_catalog(uuid) to authenticated;

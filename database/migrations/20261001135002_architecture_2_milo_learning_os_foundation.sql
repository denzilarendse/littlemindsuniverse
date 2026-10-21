-- Architecture 2.0 Stage 3: Milo Learning OS session and learning-event foundation.

create table if not exists public.milo_learning_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  learning_item_id uuid references public.learning_items(id) on delete set null,
  primary_skill_id uuid references public.skills(id) on delete set null,
  engine text not null check (engine in (
    'early_learning','play_story','ai_literacy','reasoning_missions',
    'voice_language','adaptive_practice','coding_ai','brilliant_tutor'
  )),
  session_mode text not null check (session_mode in ('learn','practice','assessment','project')),
  assistance_level smallint not null default 2 check (assistance_level between 0 and 5),
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists milo_learning_sessions_learner_started_idx
  on public.milo_learning_sessions(learner_id, started_at desc);
create index if not exists milo_learning_sessions_profile_status_idx
  on public.milo_learning_sessions(profile_id, status, started_at desc);
create index if not exists milo_learning_sessions_item_idx
  on public.milo_learning_sessions(learning_item_id)
  where learning_item_id is not null;

alter table public.milo_learning_sessions enable row level security;
revoke all on public.milo_learning_sessions from anon, authenticated;

create table if not exists public.milo_learning_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.milo_learning_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  learning_item_id uuid references public.learning_items(id) on delete set null,
  skill_id uuid references public.skills(id) on delete set null,
  engine text not null check (engine in (
    'early_learning','play_story','ai_literacy','reasoning_missions',
    'voice_language','adaptive_practice','coding_ai','brilliant_tutor'
  )),
  activity_type text not null check (activity_type in (
    'session_started','activity_opened','learner_attempt','tutor_turn',
    'hint','retry','transfer_check','activity_completed','session_completed'
  )),
  attempt_number smallint not null default 0 check (attempt_number between 0 and 50),
  assistance_level smallint not null default 0 check (assistance_level between 0 and 5),
  independence text not null default 'unknown' check (independence in ('independent','assisted','unknown')),
  transfer_result text check (transfer_result is null or transfer_result in ('not_checked','emerging','demonstrated')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists milo_learning_events_session_time_idx
  on public.milo_learning_events(session_id, occurred_at);
create index if not exists milo_learning_events_learner_time_idx
  on public.milo_learning_events(learner_id, occurred_at desc);
create index if not exists milo_learning_events_skill_time_idx
  on public.milo_learning_events(skill_id, occurred_at desc)
  where skill_id is not null;

alter table public.milo_learning_events enable row level security;
revoke all on public.milo_learning_events from anon, authenticated;

create table if not exists public.milo_safety_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.milo_learning_sessions(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  learner_id uuid references public.learners(id) on delete set null,
  category text not null,
  severity text not null check (severity in ('info','low','medium','high','critical')),
  action_taken text not null,
  attention_required boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists milo_safety_events_learner_time_idx
  on public.milo_safety_events(learner_id, occurred_at desc)
  where learner_id is not null;

alter table public.milo_safety_events enable row level security;
revoke all on public.milo_safety_events from anon, authenticated;

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

  if not exists (
    select 1 from public.learners l
    where l.id = p_learner_id
      and l.user_id = v_uid
      and l.active = true
  ) then
    raise exception 'Active learner access required.';
  end if;

  if p_engine not in (
    'early_learning','play_story','ai_literacy','reasoning_missions',
    'voice_language','adaptive_practice','coding_ai','brilliant_tutor'
  ) then
    raise exception 'Unsupported Milo engine.';
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
    p_engine, 'session_started', p_assistance_level, 'unknown', '{}'::jsonb
  );

  return v_session_id;
end;
$function$;

create or replace function public.record_milo_learning_event(
  p_session_id uuid,
  p_activity_type text,
  p_attempt_number smallint default 0,
  p_assistance_level smallint default 0,
  p_independence text default 'unknown',
  p_transfer_result text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_session public.milo_learning_sessions;
  v_event_id uuid;
  v_metadata jsonb := coalesce(p_metadata,'{}'::jsonb);
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  select s.*
  into v_session
  from public.milo_learning_sessions s
  where s.id = p_session_id
    and s.profile_id = v_uid
  for update;

  if v_session.id is null then
    raise exception 'Milo session not found.';
  end if;
  if v_session.status <> 'active' then
    raise exception 'Milo session is not active.';
  end if;

  if p_activity_type not in (
    'activity_opened','learner_attempt','tutor_turn','hint','retry',
    'transfer_check','activity_completed','session_completed'
  ) then
    raise exception 'Unsupported learning event.';
  end if;
  if p_attempt_number is null or p_attempt_number not between 0 and 50 then
    raise exception 'Attempt number is invalid.';
  end if;
  if p_assistance_level is null or p_assistance_level not between 0 and 5 then
    raise exception 'Assistance level is invalid.';
  end if;
  if p_independence not in ('independent','assisted','unknown') then
    raise exception 'Independence value is invalid.';
  end if;
  if p_transfer_result is not null and p_transfer_result not in ('not_checked','emerging','demonstrated') then
    raise exception 'Transfer result is invalid.';
  end if;
  if octet_length(v_metadata::text) > 8192 then
    raise exception 'Learning event metadata is too large.';
  end if;
  if v_metadata ?| array['message','prompt','response','transcript','fullText','conversation'] then
    raise exception 'Learning events must not store conversation content.';
  end if;

  insert into public.milo_learning_events(
    session_id, profile_id, learner_id, learning_item_id, skill_id,
    engine, activity_type, attempt_number, assistance_level,
    independence, transfer_result, metadata
  )
  values(
    v_session.id, v_session.profile_id, v_session.learner_id,
    v_session.learning_item_id, v_session.primary_skill_id,
    v_session.engine, p_activity_type, p_attempt_number, p_assistance_level,
    p_independence, p_transfer_result, v_metadata
  )
  returning id into v_event_id;

  if p_activity_type = 'session_completed' then
    update public.milo_learning_sessions
    set status = 'completed', completed_at = now()
    where id = v_session.id;
  end if;

  return v_event_id;
end;
$function$;

revoke all on function public.start_milo_learning_session(uuid, uuid, text, text, smallint, jsonb) from public;
revoke all on function public.start_milo_learning_session(uuid, uuid, text, text, smallint, jsonb) from anon;
grant execute on function public.start_milo_learning_session(uuid, uuid, text, text, smallint, jsonb) to authenticated;

revoke all on function public.record_milo_learning_event(uuid, text, smallint, smallint, text, text, jsonb) from public;
revoke all on function public.record_milo_learning_event(uuid, text, smallint, smallint, text, text, jsonb) from anon;
grant execute on function public.record_milo_learning_event(uuid, text, smallint, smallint, text, text, jsonb) to authenticated;

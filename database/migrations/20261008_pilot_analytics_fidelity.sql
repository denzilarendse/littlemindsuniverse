-- LMU Phase 1G: pilot analytics, fidelity, teacher workload and AI usage.
-- Instruments the approved validation loop without changing academic judgement.

create table if not exists public.pilot_signal_reviews (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.teacher_intelligence_signals(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_profile_id uuid not null references public.profiles(id) on delete cascade,
  usefulness text not null check (usefulness in ('meaningful','not_meaningful','uncertain')),
  false_positive boolean not null default false,
  review_seconds integer check (review_seconds is null or review_seconds between 0 and 3600),
  note text check (note is null or char_length(note) <= 1200),
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(signal_id,teacher_profile_id)
);

create table if not exists public.pilot_teacher_workload_events (
  id uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references public.profiles(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  event_type text not null check (event_type in (
    'signal_review','proposal_decision','membership_edit','support_review',
    'learner_exit','submission_review','pilot_review','other'
  )),
  entity_type text,
  entity_id uuid,
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 7200),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);

create table if not exists public.milo_provider_usage (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  learner_id uuid references public.learners(id) on delete set null,
  session_id uuid references public.milo_learning_sessions(id) on delete set null,
  learning_item_id uuid references public.learning_items(id) on delete set null,
  provider text not null,
  model text not null,
  provider_request_id text,
  outcome text not null check (outcome in ('answered','provider_error','empty_response')),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  estimated_cost_usd numeric(14,8) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  occurred_at timestamptz not null default now()
);

create index if not exists pilot_signal_reviews_classroom_idx
  on public.pilot_signal_reviews(classroom_id,reviewed_at desc);
create index if not exists pilot_teacher_workload_classroom_idx
  on public.pilot_teacher_workload_events(classroom_id,created_at desc);
create index if not exists milo_provider_usage_session_idx
  on public.milo_provider_usage(session_id,occurred_at desc);
create index if not exists milo_provider_usage_learner_idx
  on public.milo_provider_usage(learner_id,occurred_at desc);

alter table public.pilot_signal_reviews enable row level security;
alter table public.pilot_teacher_workload_events enable row level security;
alter table public.milo_provider_usage enable row level security;

revoke all on public.pilot_signal_reviews from anon,authenticated;
revoke all on public.pilot_teacher_workload_events from anon,authenticated;
revoke all on public.milo_provider_usage from anon,authenticated;

create or replace function public.record_pilot_signal_review(
  p_signal_id uuid,
  p_usefulness text,
  p_false_positive boolean default false,
  p_review_seconds integer default null,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_signal public.teacher_intelligence_signals%rowtype;
  v_id uuid;
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;
  if p_usefulness not in ('meaningful','not_meaningful','uncertain') then
    raise exception 'Invalid usefulness judgement.';
  end if;
  if p_review_seconds is not null and p_review_seconds not between 0 and 3600 then
    raise exception 'Review time is outside the allowed range.';
  end if;
  if p_note is not null and char_length(p_note)>1200 then raise exception 'Review note is too long.'; end if;

  select * into v_signal from public.teacher_intelligence_signals where id=p_signal_id;
  if not found then raise exception 'Signal not found.'; end if;
  if not public.teacher_owns_classroom(v_signal.classroom_id) then raise exception 'Not authorized.'; end if;

  insert into public.pilot_signal_reviews(
    signal_id,classroom_id,teacher_profile_id,usefulness,false_positive,review_seconds,note
  ) values(
    p_signal_id,v_signal.classroom_id,v_uid,p_usefulness,coalesce(p_false_positive,false),p_review_seconds,nullif(trim(p_note),'')
  )
  on conflict(signal_id,teacher_profile_id) do update set
    usefulness=excluded.usefulness,
    false_positive=excluded.false_positive,
    review_seconds=excluded.review_seconds,
    note=excluded.note,
    reviewed_at=now(),
    updated_at=now()
  returning id into v_id;

  insert into public.pilot_teacher_workload_events(
    teacher_profile_id,classroom_id,event_type,entity_type,entity_id,duration_seconds,
    metadata
  ) values(
    v_uid,v_signal.classroom_id,'signal_review','teacher_intelligence_signal',p_signal_id,
    coalesce(p_review_seconds,0),
    jsonb_build_object('usefulness',p_usefulness,'falsePositive',coalesce(p_false_positive,false))
  );
  return v_id;
end $$;

create or replace function public.log_pilot_teacher_workload(
  p_classroom_id uuid,
  p_event_type text,
  p_duration_seconds integer default 0,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;
  if not public.teacher_owns_classroom(p_classroom_id) then raise exception 'Not authorized.'; end if;
  if p_event_type not in (
    'signal_review','proposal_decision','membership_edit','support_review',
    'learner_exit','submission_review','pilot_review','other'
  ) then raise exception 'Invalid workload event type.'; end if;
  if p_duration_seconds is null or p_duration_seconds not between 0 and 7200 then
    raise exception 'Workload duration is outside the allowed range.';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata)<>'object' then raise exception 'Workload metadata must be an object.'; end if;

  insert into public.pilot_teacher_workload_events(
    teacher_profile_id,classroom_id,event_type,entity_type,entity_id,duration_seconds,metadata
  ) values(v_uid,p_classroom_id,p_event_type,p_entity_type,p_entity_id,p_duration_seconds,p_metadata)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.log_milo_provider_usage(
  p_profile_id uuid,
  p_learner_id uuid,
  p_session_id uuid,
  p_learning_item_id uuid,
  p_provider text,
  p_model text,
  p_provider_request_id text,
  p_outcome text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_total_tokens integer,
  p_latency_ms integer,
  p_estimated_cost_usd numeric
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_id uuid;
begin
  if p_provider is null or char_length(trim(p_provider)) not between 1 and 80 then raise exception 'Invalid provider.'; end if;
  if p_model is null or char_length(trim(p_model)) not between 1 and 160 then raise exception 'Invalid model.'; end if;
  if p_outcome not in ('answered','provider_error','empty_response') then raise exception 'Invalid provider outcome.'; end if;

  insert into public.milo_provider_usage(
    profile_id,learner_id,session_id,learning_item_id,provider,model,provider_request_id,outcome,
    input_tokens,output_tokens,total_tokens,latency_ms,estimated_cost_usd
  ) values(
    p_profile_id,p_learner_id,p_session_id,p_learning_item_id,trim(p_provider),trim(p_model),
    nullif(trim(p_provider_request_id),''),
    p_outcome,greatest(coalesce(p_input_tokens,0),0),greatest(coalesce(p_output_tokens,0),0),
    greatest(coalesce(p_total_tokens,0),0),greatest(coalesce(p_latency_ms,0),0),
    case when p_estimated_cost_usd is null then null else greatest(p_estimated_cost_usd,0) end
  ) returning id into v_id;
  return v_id;
end $$;

revoke all on function public.log_milo_provider_usage(uuid,uuid,uuid,uuid,text,text,text,text,integer,integer,integer,integer,numeric) from public,anon,authenticated;
grant execute on function public.log_milo_provider_usage(uuid,uuid,uuid,uuid,text,text,text,text,integer,integer,integer,integer,numeric) to service_role;

create or replace function public.get_teacher_pilot_analytics(
  p_classroom_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null
) returns table(
  window_start timestamptz,
  window_end timestamptz,
  active_learners integer,
  signals_generated integer,
  signals_reviewed integer,
  meaningful_signals integer,
  false_positive_signals integer,
  usefulness_rate numeric,
  false_positive_rate numeric,
  alerts_per_week numeric,
  proposals_reviewed integer,
  proposals_approved integer,
  proposals_rejected integer,
  proposals_deferred integer,
  approved_support_groups integer,
  fidelity_groups integer,
  fidelity_rate numeric,
  verification_cycles integer,
  verified_cycles integer,
  retention_pending_cycles integer,
  needs_support_cycles integer,
  teacher_workload_actions integer,
  teacher_workload_seconds bigint,
  ai_requests integer,
  ai_input_tokens bigint,
  ai_output_tokens bigint,
  ai_total_tokens bigint,
  ai_estimated_cost_usd numeric,
  cost_per_verified_cycle_usd numeric
)
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_from timestamptz := coalesce(p_from,now()-interval '90 days');
  v_to timestamptz := coalesce(p_to,now());
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;
  if not public.teacher_owns_classroom(p_classroom_id) then raise exception 'Not authorized.'; end if;
  if v_to<=v_from then raise exception 'Analytics window is invalid.'; end if;

  return query
  with
  members as (
    select cm.learner_id
    from public.classroom_members cm join public.learners l on l.id=cm.learner_id
    where cm.classroom_id=p_classroom_id and cm.status::text='active' and l.active=true
  ),
  sig as (
    select tis.id
    from public.teacher_intelligence_signals tis
    where tis.classroom_id=p_classroom_id and tis.detected_at>=v_from and tis.detected_at<v_to
  ),
  reviews as (
    select psr.*
    from public.pilot_signal_reviews psr
    where psr.classroom_id=p_classroom_id and psr.reviewed_at>=v_from and psr.reviewed_at<v_to
  ),
  rec as (
    select mr.*
    from public.milo_recommendations mr
    where mr.classroom_id=p_classroom_id and mr.updated_at>=v_from and mr.updated_at<v_to
  ),
  groups as (
    select mr.id recommendation_id,mr.group_classroom_id,sg.id lifecycle_id
    from public.milo_recommendations mr
    left join public.support_group_lifecycles sg on sg.group_classroom_id=mr.group_classroom_id
    where mr.classroom_id=p_classroom_id and mr.status::text in ('approved','completed')
      and mr.group_classroom_id is not null
      and coalesce(mr.approved_at,mr.updated_at)>=v_from and coalesce(mr.approved_at,mr.updated_at)<v_to
  ),
  verification as (
    select vc.*
    from public.learning_verification_cycles vc
    join public.classrooms gc on gc.id=vc.group_classroom_id
    where gc.parent_classroom_id=p_classroom_id
      and vc.started_at>=v_from and vc.started_at<v_to
  ),
  workload as (
    select pwe.*
    from public.pilot_teacher_workload_events pwe
    where pwe.classroom_id=p_classroom_id and pwe.created_at>=v_from and pwe.created_at<v_to
  ),
  usage as (
    select mpu.*
    from public.milo_provider_usage mpu
    join public.milo_learning_sessions mls on mls.id=mpu.session_id
    where mls.learner_id in (select learner_id from members)
      and mpu.occurred_at>=v_from and mpu.occurred_at<v_to
  )
  select
    v_from,v_to,
    (select count(*)::integer from members),
    (select count(*)::integer from sig),
    (select count(*)::integer from reviews),
    (select count(*)::integer from reviews where usefulness='meaningful'),
    (select count(*)::integer from reviews where false_positive),
    case when (select count(*) from reviews)>0
      then round((select count(*)::numeric from reviews where usefulness='meaningful')/(select count(*)::numeric from reviews),4)
      else null end,
    case when (select count(*) from reviews)>0
      then round((select count(*)::numeric from reviews where false_positive)/(select count(*)::numeric from reviews),4)
      else null end,
    round((select count(*)::numeric from sig) /
      greatest(1::numeric,extract(epoch from (v_to-v_from))/604800.0),2),
    (select count(*)::integer from rec where status::text in ('approved','rejected','deferred','completed')),
    (select count(*)::integer from rec where status::text in ('approved','completed')),
    (select count(*)::integer from rec where status::text='rejected'),
    (select count(*)::integer from rec where status::text='deferred'),
    (select count(*)::integer from groups),
    (select count(*)::integer from groups g where g.lifecycle_id is not null and exists(
       select 1 from verification vc where vc.group_classroom_id=g.group_classroom_id
     )),
    case when (select count(*) from groups)>0 then round(
      (select count(*)::numeric from groups g where g.lifecycle_id is not null and exists(
        select 1 from verification vc where vc.group_classroom_id=g.group_classroom_id
      ))/(select count(*)::numeric from groups),4) else null end,
    (select count(*)::integer from verification),
    (select count(*)::integer from verification where status='verified'),
    (select count(*)::integer from verification where status='retention_pending'),
    (select count(*)::integer from verification where status='needs_support'),
    (select count(*)::integer from workload),
    coalesce((select sum(duration_seconds)::bigint from workload),0),
    (select count(*)::integer from usage),
    coalesce((select sum(input_tokens)::bigint from usage),0),
    coalesce((select sum(output_tokens)::bigint from usage),0),
    coalesce((select sum(total_tokens)::bigint from usage),0),
    coalesce((select sum(estimated_cost_usd) from usage),0::numeric),
    case when (select count(*) from verification where status='verified')>0
      then round(coalesce((select sum(estimated_cost_usd) from usage),0::numeric) /
        (select count(*)::numeric from verification where status='verified'),8)
      else null end;
end $$;

revoke all on function public.record_pilot_signal_review(uuid,text,boolean,integer,text) from public,anon;
grant execute on function public.record_pilot_signal_review(uuid,text,boolean,integer,text) to authenticated;
revoke all on function public.log_pilot_teacher_workload(uuid,text,integer,text,uuid,jsonb) from public,anon;
grant execute on function public.log_pilot_teacher_workload(uuid,text,integer,text,uuid,jsonb) to authenticated;
revoke all on function public.get_teacher_pilot_analytics(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.get_teacher_pilot_analytics(uuid,timestamptz,timestamptz) to authenticated;

comment on function public.get_teacher_pilot_analytics(uuid,timestamptz,timestamptz) is
  'Phase 1G pilot metrics: detection usefulness, alert burden, decisions, fidelity, verified learning, teacher workload and Milo usage/cost.';

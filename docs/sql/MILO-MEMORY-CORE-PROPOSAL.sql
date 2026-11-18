-- PROPOSAL ONLY — DO NOT APPLY UNTIL THE LMU-V45-TESTING BASELINE IS RESTORED
-- PostgreSQL 17 / Supabase. This file is not in the migrations directory.
-- Preconditions to verify against the authoritative schema baseline:
--   public.learners(id uuid, user_id uuid, active boolean)
--   public.profiles(id uuid, role text)
-- The API must perform trusted relationship/consent checks before invoking these
-- service-role-only RPCs. The service-role key must remain server-side.
-- No production schema or data is touched by this proposal.

create table public.learner_memory_items (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete restrict,
  memory_key text not null check (memory_key ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  memory_category text not null check (memory_category in (
    'learning_preference','language_preference','learning_goal','interest',
    'support_strategy','strength','misconception_pattern'
  )),
  memory_value jsonb not null check (octet_length(memory_value::text) <= 2048),
  source_type text not null check (source_type in (
    'learner_statement','teacher_observation','guardian_statement',
    'reviewed_submission','mastery_evidence','learning_event','teacher_decision'
  )),
  source_reference jsonb check (
    source_reference is null or (
      jsonb_typeof(source_reference) = 'object'
      and source_reference - array['id','kind','version'] = '{}'::jsonb
    )
  ),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  status text not null default 'proposed' check (status in (
    'proposed','confirmed','disputed','withdrawn','expired'
  )),
  visibility_scope text not null default 'learner_and_teacher' check (
    visibility_scope in ('learner_and_teacher','teacher_only','learner_only')
  ),
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,learner_id),
  check ((status = 'confirmed') = (confirmed_at is not null and confirmed_by is not null))
);

create unique index learner_memory_items_one_current_key
  on public.learner_memory_items(learner_id,memory_key)
  where status in ('proposed','confirmed','disputed');
create index learner_memory_items_learner_status_idx
  on public.learner_memory_items(learner_id,status,updated_at desc);

create table public.learner_memory_events (
  id uuid primary key default gen_random_uuid(),
  memory_item_id uuid not null,
  learner_id uuid not null references public.learners(id) on delete restrict,
  event_type text not null check (event_type in (
    'propose','confirm','update','dispute','withdraw','expire'
  )),
  previous_value jsonb,
  new_value jsonb,
  source_type text not null check (source_type in (
    'learner_statement','teacher_observation','guardian_statement',
    'reviewed_submission','mastery_evidence','learning_event','teacher_decision'
  )),
  source_reference jsonb,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  reason text check (char_length(reason) <= 500),
  occurred_at timestamptz not null default now(),
  foreign key(memory_item_id,learner_id)
    references public.learner_memory_items(id,learner_id) on delete restrict
);
create index learner_memory_events_learner_time_idx
  on public.learner_memory_events(learner_id,occurred_at desc);
create index learner_memory_events_item_time_idx
  on public.learner_memory_events(memory_item_id,occurred_at desc);

alter table public.learner_memory_items enable row level security;
alter table public.learner_memory_events enable row level security;
revoke all on public.learner_memory_items,public.learner_memory_events from public,anon,authenticated;
grant select,insert,update on public.learner_memory_items to service_role;
grant select,insert on public.learner_memory_events to service_role;
revoke update,delete,truncate on public.learner_memory_events from public,anon,authenticated,service_role;

create schema if not exists private;
create or replace function private.reject_learner_memory_event_mutation()
returns trigger language plpgsql set search_path = pg_catalog
as $$
begin
  raise exception 'learner memory events are append-only' using errcode='55000';
end;
$$;
revoke all on function private.reject_learner_memory_event_mutation() from public,anon,authenticated;
drop trigger if exists learner_memory_events_immutable on public.learner_memory_events;
create trigger learner_memory_events_immutable
before update or delete on public.learner_memory_events
for each row execute function private.reject_learner_memory_event_mutation();

-- Each RPC is one PostgreSQL transaction: the projection change and its audit
-- event either both commit or both roll back. These are SECURITY INVOKER functions.
create or replace function public.milo_memory_propose(
  p_actor_profile_id uuid,p_input jsonb,p_reason text default null
) returns public.learner_memory_items
language plpgsql security invoker
set search_path = pg_catalog,public
as $$
declare v_role text; v_learner_id uuid; v_row public.learner_memory_items;
begin
  select role into v_role from public.profiles where id=p_actor_profile_id;
  if v_role not in ('learner','teacher','parent') then
    raise exception 'actor cannot propose learner memory' using errcode='42501';
  end if;
  v_learner_id := (p_input->>'learnerId')::uuid;
  if v_role='learner' and not exists (
    select 1 from public.learners where id=v_learner_id and user_id=p_actor_profile_id and active=true
  ) then raise exception 'learner may only propose own memory' using errcode='42501'; end if;
  insert into public.learner_memory_items(
    learner_id,memory_key,memory_category,memory_value,source_type,source_reference,
    confidence,status,visibility_scope
  ) values (
    v_learner_id,p_input->>'memoryKey',p_input->>'category',p_input->'value',
    p_input->>'sourceType',p_input->'sourceReference',(p_input->>'confidence')::numeric,
    'proposed',coalesce(p_input->>'visibilityScope','learner_and_teacher')
  ) returning * into v_row;
  insert into public.learner_memory_events(
    memory_item_id,learner_id,event_type,previous_value,new_value,source_type,source_reference,actor_profile_id,reason
  ) values (
    v_row.id,v_row.learner_id,'propose',null,v_row.memory_value,v_row.source_type,
    v_row.source_reference,p_actor_profile_id,left(coalesce(p_reason,''),500)
  );
  return v_row;
end;
$$;

create or replace function public.milo_memory_confirm(
  p_actor_profile_id uuid,p_memory_item_id uuid,p_reason text default null
) returns public.learner_memory_items
language plpgsql security invoker
set search_path = pg_catalog,public
as $$
declare v_role text; v_old public.learner_memory_items; v_row public.learner_memory_items;
begin
  select role into v_role from public.profiles where id=p_actor_profile_id;
  if v_role <> 'teacher' then raise exception 'teacher approval required' using errcode='42501'; end if;
  select * into v_old from public.learner_memory_items where id=p_memory_item_id for update;
  if not found or v_old.status not in ('proposed','confirmed') then
    raise exception 'memory item cannot be confirmed' using errcode='40001';
  end if;
  update public.learner_memory_items set status='confirmed',confirmed_by=p_actor_profile_id,
    confirmed_at=coalesce(confirmed_at,now()),updated_at=now()
  where id=p_memory_item_id returning * into v_row;
  insert into public.learner_memory_events(
    memory_item_id,learner_id,event_type,previous_value,new_value,source_type,source_reference,actor_profile_id,reason
  ) values (v_row.id,v_row.learner_id,'confirm',v_old.memory_value,v_row.memory_value,
    v_row.source_type,v_row.source_reference,p_actor_profile_id,left(coalesce(p_reason,''),500));
  return v_row;
end;
$$;

create or replace function public.milo_memory_update(
  p_actor_profile_id uuid,p_memory_item_id uuid,p_input jsonb,p_reason text default null
) returns public.learner_memory_items
language plpgsql security invoker
set search_path = pg_catalog,public
as $$
declare v_role text; v_old public.learner_memory_items; v_row public.learner_memory_items;
begin
  select role into v_role from public.profiles where id=p_actor_profile_id;
  if v_role <> 'teacher' then raise exception 'teacher update required' using errcode='42501'; end if;
  select * into v_old from public.learner_memory_items where id=p_memory_item_id for update;
  if not found or v_old.status not in ('proposed','confirmed') then
    raise exception 'memory item cannot be updated' using errcode='40001';
  end if;
  update public.learner_memory_items set
    memory_category=p_input->>'category',memory_value=p_input->'value',
    source_type=p_input->>'sourceType',source_reference=p_input->'sourceReference',
    confidence=(p_input->>'confidence')::numeric,
    visibility_scope=coalesce(p_input->>'visibilityScope','learner_and_teacher'),updated_at=now()
  where id=p_memory_item_id returning * into v_row;
  insert into public.learner_memory_events(
    memory_item_id,learner_id,event_type,previous_value,new_value,source_type,source_reference,actor_profile_id,reason
  ) values (v_row.id,v_row.learner_id,'update',v_old.memory_value,v_row.memory_value,
    v_row.source_type,v_row.source_reference,p_actor_profile_id,left(coalesce(p_reason,''),500));
  return v_row;
end;
$$;

create or replace function public.milo_memory_transition(
  p_actor_profile_id uuid,p_memory_item_id uuid,p_event_type text,p_reason text default null
) returns public.learner_memory_items
language plpgsql security invoker
set search_path = pg_catalog,public
as $$
declare v_role text; v_old public.learner_memory_items; v_row public.learner_memory_items; v_status text;
begin
  select role into v_role from public.profiles where id=p_actor_profile_id;
  if p_event_type='expire' then
    if v_role <> 'admin' then raise exception 'system expiry authority required' using errcode='42501'; end if;
    v_status := 'expired';
  elsif p_event_type='dispute' then
    if v_role not in ('learner','parent','teacher') then raise exception 'actor cannot dispute memory' using errcode='42501'; end if;
    v_status := 'disputed';
  elsif p_event_type='withdraw' then
    if v_role not in ('learner','parent','teacher') then raise exception 'actor cannot withdraw memory' using errcode='42501'; end if;
    v_status := 'withdrawn';
  else raise exception 'unsupported memory transition' using errcode='22023';
  end if;
  select * into v_old from public.learner_memory_items where id=p_memory_item_id for update;
  if not found then raise exception 'memory item not found' using errcode='P0002'; end if;
  if not (
    (p_event_type='dispute' and v_old.status in ('proposed','confirmed')) or
    (p_event_type='withdraw' and v_old.status in ('proposed','confirmed','disputed')) or
    (p_event_type='expire' and v_old.status in ('proposed','confirmed'))
  ) then raise exception 'memory state transition is not allowed' using errcode='40001'; end if;
  update public.learner_memory_items set status=v_status,updated_at=now()
  where id=p_memory_item_id returning * into v_row;
  insert into public.learner_memory_events(
    memory_item_id,learner_id,event_type,previous_value,new_value,source_type,source_reference,actor_profile_id,reason
  ) values (v_row.id,v_row.learner_id,p_event_type,v_old.memory_value,null,
    v_row.source_type,v_row.source_reference,p_actor_profile_id,left(coalesce(p_reason,''),500));
  return v_row;
end;
$$;

revoke all on function public.milo_memory_propose(uuid,jsonb,text) from public,anon,authenticated;
revoke all on function public.milo_memory_confirm(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.milo_memory_update(uuid,uuid,jsonb,text) from public,anon,authenticated;
revoke all on function public.milo_memory_transition(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.milo_memory_propose(uuid,jsonb,text) to service_role;
grant execute on function public.milo_memory_confirm(uuid,uuid,text) to service_role;
grant execute on function public.milo_memory_update(uuid,uuid,jsonb,text) to service_role;
grant execute on function public.milo_memory_transition(uuid,uuid,text,text) to service_role;

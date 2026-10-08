-- LMU Phase 1H: safety, consent and behavioural-signal guardrails.
-- Keep Milo's machine-generated Teacher Intelligence learning-focused and non-diagnostic.

alter table public.teacher_intelligence_signals
  add column if not exists signal_domain text not null default 'learning';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='teacher_intelligence_signal_domain_check'
      and conrelid='public.teacher_intelligence_signals'::regclass
  ) then
    alter table public.teacher_intelligence_signals
      add constraint teacher_intelligence_signal_domain_check
      check (signal_domain in ('learning','observable_behavior'));
  end if;
end $$;

create or replace function public.teacher_intelligence_text_is_allowed(p_text text)
returns boolean
language sql
immutable
set search_path=''
as $$
  select coalesce(p_text,'') !~* '(adhd|autis(m|tic)|dyslex(ia|ic)|lazy|aggressiv(e|ion)|naughty|stupid|defiant|unmotivated|bad[ -]?child|slow[ -]?learner)'
$$;

create or replace function public.enforce_teacher_intelligence_signal_guardrails()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_text text;
begin
  if new.source like 'teacher_intelligence%' then
    if new.signal_domain <> 'learning' then
      raise exception 'Machine-generated Teacher Intelligence signals are restricted to observable learning evidence.';
    end if;

    v_text:=concat_ws(' ',
      new.title,new.rationale,new.strength_asset,new.next_learning_goal,new.recommended_action
    );

    if not public.teacher_intelligence_text_is_allowed(v_text) then
      raise exception 'Teacher Intelligence cannot create diagnostic, medical or moral learner labels.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists teacher_intelligence_signal_guardrails on public.teacher_intelligence_signals;
create trigger teacher_intelligence_signal_guardrails
before insert or update of title,rationale,strength_asset,next_learning_goal,recommended_action,source,signal_domain
on public.teacher_intelligence_signals
for each row execute function public.enforce_teacher_intelligence_signal_guardrails();

create or replace function public.log_milo_safety_event(
  p_session_id uuid,
  p_profile_id uuid,
  p_learner_id uuid,
  p_category text,
  p_severity text,
  p_action_taken text,
  p_attention_required boolean default false,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_id uuid;
begin
  if p_category not in ('policy_boundary','prompt_injection','personal_data','self_harm','violence','sexual_content','other') then
    raise exception 'Unsupported Milo safety category.';
  end if;
  if p_severity not in ('low','medium','high','critical') then
    raise exception 'Unsupported Milo safety severity.';
  end if;
  if p_action_taken not in ('blocked','redirected','safe_response','escalated','logged') then
    raise exception 'Unsupported Milo safety action.';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata)<>'object' then
    raise exception 'Safety metadata must be an object.';
  end if;
  if p_metadata ?| array['message','content','prompt','response','transcript','text','email','phone','name'] then
    raise exception 'Raw conversation or direct personal data must not be stored in Milo safety metadata.';
  end if;
  if p_session_id is not null and not exists(
    select 1 from public.milo_learning_sessions s
    where s.id=p_session_id
      and (p_learner_id is null or s.learner_id=p_learner_id)
  ) then
    raise exception 'Safety event session does not match the learner.';
  end if;

  insert into public.milo_safety_events(
    session_id,profile_id,learner_id,category,severity,action_taken,
    attention_required,metadata
  ) values(
    p_session_id,p_profile_id,p_learner_id,p_category,p_severity,p_action_taken,
    coalesce(p_attention_required,false),p_metadata
  ) returning id into v_id;
  return v_id;
end $$;

revoke all on function public.log_milo_safety_event(uuid,uuid,uuid,text,text,text,boolean,jsonb)
  from public,anon,authenticated;
grant execute on function public.log_milo_safety_event(uuid,uuid,uuid,text,text,text,boolean,jsonb)
  to service_role;

create or replace function public.get_teacher_safety_consent_summary(p_classroom_id uuid)
returns table(
  active_learners integer,
  learners_with_verified_primary_guardian integer,
  camera_consent_learners integer,
  video_consent_learners integer,
  audio_consent_learners integer,
  transcription_consent_learners integer,
  pending_evidence_items integer,
  safety_events_30d integer,
  attention_required_safety_events_30d integer,
  machine_signal_mode text
)
language plpgsql
security definer
set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  if not public.teacher_owns_classroom(p_classroom_id) then raise exception 'Not authorized.'; end if;

  return query
  with members as (
    select distinct cm.learner_id
    from public.classroom_members cm
    join public.learners l on l.id=cm.learner_id
    where cm.classroom_id=p_classroom_id
      and cm.status::text='active'
      and l.active=true
  ),
  guardians as (
    select distinct gl.learner_id,gl.guardian_profile_id
    from public.guardian_learner_links gl
    where gl.learner_id in (select learner_id from members)
      and gl.verified=true
      and gl.primary_guardian=true
      and gl.can_approve_evidence=true
  ),
  consent as (
    select distinct gec.learner_id,gec.consent_type
    from public.guardian_evidence_consents gec
    join guardians g
      on g.learner_id=gec.learner_id
     and g.guardian_profile_id=gec.guardian_profile_id
    join public.evidence_policy_versions ep on ep.id=gec.policy_version_id
    where gec.status='granted' and ep.active=true and ep.policy_key=gec.consent_type
  )
  select
    (select count(*)::integer from members),
    (select count(distinct learner_id)::integer from guardians),
    (select count(distinct learner_id)::integer from consent where consent_type='camera_evidence'),
    (select count(distinct learner_id)::integer from consent where consent_type='video_evidence'),
    (select count(distinct learner_id)::integer from consent where consent_type='audio_evidence'),
    (select count(distinct learner_id)::integer from consent where consent_type='speech_transcription'),
    (select count(*)::integer from public.learner_evidence_items e
      where e.learner_id in (select learner_id from members)
        and e.status::text='pending_parent_approval'),
    (select count(*)::integer from public.milo_safety_events mse
      where mse.learner_id in (select learner_id from members)
        and mse.occurred_at>=now()-interval '30 days'),
    (select count(*)::integer from public.milo_safety_events mse
      where mse.learner_id in (select learner_id from members)
        and mse.occurred_at>=now()-interval '30 days'
        and mse.attention_required=true),
    'learning_only_non_diagnostic'::text;
end $$;

revoke all on function public.get_teacher_safety_consent_summary(uuid) from public,anon;
grant execute on function public.get_teacher_safety_consent_summary(uuid) to authenticated;

create or replace function public.get_teacher_safety_events(
  p_classroom_id uuid,
  p_limit integer default 50
)
returns table(
  event_id uuid,
  learner_id uuid,
  learner_name text,
  category text,
  severity text,
  action_taken text,
  attention_required boolean,
  occurred_at timestamptz
)
language plpgsql
security definer
set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  if not public.teacher_owns_classroom(p_classroom_id) then raise exception 'Not authorized.'; end if;
  if p_limit is null or p_limit<1 or p_limit>200 then raise exception 'Safety event limit must be between 1 and 200.'; end if;

  return query
  select mse.id,l.id,l.display_name,mse.category,mse.severity,mse.action_taken,
         mse.attention_required,mse.occurred_at
  from public.milo_safety_events mse
  join public.learners l on l.id=mse.learner_id
  where exists(
    select 1 from public.classroom_members cm
    where cm.classroom_id=p_classroom_id
      and cm.learner_id=mse.learner_id
      and cm.status::text='active'
  )
  order by mse.occurred_at desc
  limit p_limit;
end $$;

revoke all on function public.get_teacher_safety_events(uuid,integer) from public,anon;
grant execute on function public.get_teacher_safety_events(uuid,integer) to authenticated;

comment on function public.get_teacher_safety_consent_summary(uuid) is
  'Phase 1H teacher-owned aggregate consent and safety readiness view. No raw learner evidence or conversation content.';
comment on function public.teacher_intelligence_text_is_allowed(text) is
  'Phase 1H machine-signal language guard: prevents diagnostic/medical/moral learner labels in Teacher Intelligence.';

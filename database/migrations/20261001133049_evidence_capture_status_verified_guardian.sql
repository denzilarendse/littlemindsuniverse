-- LMU Architecture 2.0 Stage 2
-- Consent-aware evidence capture status and explicit verified-guardian checks.

create or replace function public.get_learner_evidence_capture_status(p_learner_id uuid)
returns table(
  camera_enabled boolean,
  video_enabled boolean,
  audio_evidence_enabled boolean,
  speech_transcription_enabled boolean,
  evidence_approver_label text,
  camera_max_capture_seconds integer,
  video_max_capture_seconds integer
)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_guardian uuid;
  v_label text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.can_access_learner(p_learner_id) then
    raise exception 'You are not authorized to access this learner.';
  end if;

  select
    gl.guardian_profile_id,
    coalesce(
      nullif(trim(gl.child_facing_label),''),
      case lower(coalesce(gl.relationship,''))
        when 'mother' then 'Mom'
        when 'father' then 'Dad'
        when 'grandmother' then 'Gran'
        when 'grandfather' then 'Grandpa'
        when 'aunt' then 'Aunt'
        when 'uncle' then 'Uncle'
        else 'Guardian'
      end
    )
  into v_guardian, v_label
  from public.guardian_learner_links gl
  where gl.learner_id = p_learner_id
    and gl.verified = true
    and gl.primary_guardian = true
    and gl.can_approve_evidence = true
  order by gl.created_at
  limit 1;

  return query
  select
    exists (
      select 1
      from public.guardian_evidence_consents gec
      join public.evidence_policy_versions ep on ep.id=gec.policy_version_id
      where gec.guardian_profile_id=v_guardian
        and gec.learner_id=p_learner_id
        and gec.consent_type='camera_evidence'
        and gec.status='granted'
        and ep.policy_key='camera_evidence'
        and ep.active=true
    ),
    exists (
      select 1
      from public.guardian_evidence_consents gec
      join public.evidence_policy_versions ep on ep.id=gec.policy_version_id
      where gec.guardian_profile_id=v_guardian
        and gec.learner_id=p_learner_id
        and gec.consent_type='video_evidence'
        and gec.status='granted'
        and ep.policy_key='video_evidence'
        and ep.active=true
    ),
    exists (
      select 1
      from public.guardian_evidence_consents gec
      join public.evidence_policy_versions ep on ep.id=gec.policy_version_id
      where gec.guardian_profile_id=v_guardian
        and gec.learner_id=p_learner_id
        and gec.consent_type='audio_evidence'
        and gec.status='granted'
        and ep.policy_key='audio_evidence'
        and ep.active=true
    ),
    exists (
      select 1
      from public.guardian_evidence_consents gec
      join public.evidence_policy_versions ep on ep.id=gec.policy_version_id
      where gec.guardian_profile_id=v_guardian
        and gec.learner_id=p_learner_id
        and gec.consent_type='speech_transcription'
        and gec.status='granted'
        and ep.policy_key='speech_transcription'
        and ep.active=true
    ),
    coalesce(v_label,'Guardian'),
    (
      select ep.max_capture_seconds
      from public.evidence_policy_versions ep
      where ep.policy_key='camera_evidence' and ep.active=true
      order by ep.version desc limit 1
    ),
    (
      select ep.max_capture_seconds
      from public.evidence_policy_versions ep
      where ep.policy_key='video_evidence' and ep.active=true
      order by ep.version desc limit 1
    );
end;
$$;

revoke all on function public.get_learner_evidence_capture_status(uuid) from public, anon;
grant execute on function public.get_learner_evidence_capture_status(uuid) to authenticated;

create or replace function public.set_guardian_evidence_consent(
  p_learner_id uuid,
  p_consent_type text,
  p_policy_version_id uuid,
  p_grant boolean
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_consent_id uuid;
  v_event_id uuid;
  v_policy public.evidence_policy_versions%rowtype;
  v_relationship text;
  v_child_label text;
  v_action text;
  v_agreement_text text;
  v_button_text text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select gl.relationship, gl.child_facing_label
  into v_relationship, v_child_label
  from public.guardian_learner_links gl
  where gl.guardian_profile_id=auth.uid()
    and gl.learner_id=p_learner_id
    and gl.verified=true
    and gl.primary_guardian=true
    and gl.can_approve_evidence=true;

  if not found then
    raise exception 'Verified primary caregiver evidence-approval permission is required.';
  end if;

  if p_consent_type not in (
    'camera_evidence','video_evidence','audio_evidence','speech_transcription'
  ) then
    raise exception 'Unsupported evidence consent type.';
  end if;

  select * into v_policy
  from public.evidence_policy_versions ep
  where ep.id=p_policy_version_id and ep.active=true;

  if not found then
    raise exception 'Evidence policy version not found or inactive.';
  end if;

  if v_policy.policy_key <> p_consent_type then
    raise exception 'The selected policy does not match this consent type.';
  end if;

  if p_grant then
    v_action := 'granted';
    v_agreement_text := 'I have read this policy and agree to enable this feature for this learner.';
    v_button_text := 'Agree & Enable';
  else
    v_action := 'revoked';
    v_agreement_text := 'I revoke future permission for this feature for this learner.';
    v_button_text := 'Revoke Permission';
  end if;

  insert into public.guardian_evidence_consents (
    guardian_profile_id, learner_id, consent_type, policy_version_id,
    status, granted_at, revoked_at, updated_at
  ) values (
    auth.uid(), p_learner_id, p_consent_type, p_policy_version_id,
    v_action,
    case when p_grant then now() else null end,
    case when not p_grant then now() else null end,
    now()
  )
  on conflict (guardian_profile_id, learner_id, consent_type)
  do update set
    policy_version_id=excluded.policy_version_id,
    status=excluded.status,
    granted_at=case when p_grant then now() else guardian_evidence_consents.granted_at end,
    revoked_at=case when not p_grant then now() else null end,
    updated_at=now()
  returning id into v_consent_id;

  insert into public.guardian_evidence_consent_events (
    guardian_profile_id, learner_id, consent_type, policy_version_id, action
  ) values (
    auth.uid(), p_learner_id, p_consent_type, p_policy_version_id, v_action
  ) returning id into v_event_id;

  insert into public.guardian_consent_receipts (
    consent_event_id, guardian_profile_id, learner_id, consent_type, action,
    policy_version_id, policy_key_snapshot, policy_version_snapshot,
    policy_title_snapshot, policy_body_snapshot, relationship_snapshot,
    child_facing_label_snapshot, agreement_text_snapshot,
    action_button_snapshot, receipt_origin, occurred_at
  ) values (
    v_event_id, auth.uid(), p_learner_id, p_consent_type, v_action,
    v_policy.id, v_policy.policy_key, v_policy.version,
    v_policy.title, v_policy.policy_body, v_relationship,
    v_child_label, v_agreement_text, v_button_text,
    'live_capture', now()
  );

  return v_consent_id;
end;
$$;

revoke all on function public.set_guardian_evidence_consent(uuid,text,uuid,boolean) from public, anon;
grant execute on function public.set_guardian_evidence_consent(uuid,text,uuid,boolean) to authenticated;

create or replace function public.get_guardian_pending_evidence()
returns table(
  evidence_id uuid,
  learner_id uuid,
  learner_name text,
  evidence_type text,
  storage_path text,
  mime_type text,
  duration_seconds numeric,
  transcript_text text,
  captured_at timestamptz,
  pending_expires_at timestamptz,
  caregiver_label text
)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  return query
  select
    e.id,
    l.id,
    l.display_name,
    e.evidence_type::text,
    e.storage_path,
    e.mime_type,
    e.duration_seconds,
    e.transcript_text,
    e.captured_at,
    e.pending_expires_at,
    coalesce(nullif(trim(gl.child_facing_label),''),'Guardian')
  from public.learner_evidence_items e
  join public.learners l on l.id=e.learner_id
  join public.guardian_learner_links gl
    on gl.learner_id=e.learner_id
   and gl.guardian_profile_id=auth.uid()
  where e.status='pending_parent_approval'
    and gl.verified=true
    and gl.can_approve_evidence=true
  order by e.created_at desc;
end;
$$;

revoke all on function public.get_guardian_pending_evidence() from public, anon;
grant execute on function public.get_guardian_pending_evidence() to authenticated;

create or replace function public.decide_learner_evidence(
  p_evidence_id uuid,
  p_approve boolean,
  p_decision_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_evidence public.learner_evidence_items%rowtype;
  v_policy public.evidence_policy_versions%rowtype;
  v_consent_type text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select * into v_evidence
  from public.learner_evidence_items
  where id=p_evidence_id
  for update;

  if not found then
    raise exception 'Evidence item not found.';
  end if;

  if v_evidence.status <> 'pending_parent_approval' then
    raise exception 'This evidence item has already been decided.';
  end if;

  if not exists (
    select 1
    from public.guardian_learner_links gl
    where gl.guardian_profile_id=auth.uid()
      and gl.learner_id=v_evidence.learner_id
      and gl.verified=true
      and gl.can_approve_evidence=true
  ) then
    raise exception 'You are not authorized to approve this evidence.';
  end if;

  v_consent_type := case
    when v_evidence.evidence_type='photo' then 'camera_evidence'
    when v_evidence.evidence_type='video' then 'video_evidence'
    when v_evidence.evidence_type='audio' then 'audio_evidence'
    else null
  end;

  if p_approve and v_consent_type is not null then
    if not exists (
      select 1
      from public.guardian_evidence_consents gec
      join public.evidence_policy_versions ep on ep.id=gec.policy_version_id
      where gec.guardian_profile_id=auth.uid()
        and gec.learner_id=v_evidence.learner_id
        and gec.consent_type=v_consent_type
        and gec.status='granted'
        and ep.policy_key=v_consent_type
        and ep.active=true
    ) then
      raise exception 'Required evidence permission is not currently enabled.';
    end if;
  end if;

  if p_approve then
    if v_consent_type is not null then
      select ep.* into v_policy
      from public.guardian_evidence_consents gec
      join public.evidence_policy_versions ep on ep.id=gec.policy_version_id
      where gec.guardian_profile_id=auth.uid()
        and gec.learner_id=v_evidence.learner_id
        and gec.consent_type=v_consent_type
        and gec.status='granted'
        and ep.policy_key=v_consent_type
        and ep.active=true
      order by ep.version desc
      limit 1;
    end if;

    update public.learner_evidence_items
    set status='parent_approved',
        parent_approved_at=now(),
        raw_delete_after=case
          when v_policy.approved_raw_retention_days is null then null
          else now()+make_interval(days=>v_policy.approved_raw_retention_days)
        end,
        updated_at=now()
    where id=p_evidence_id;

    insert into public.evidence_approval_events(
      evidence_item_id,guardian_profile_id,action,decision_note
    ) values (
      p_evidence_id,auth.uid(),'approved',nullif(trim(coalesce(p_decision_note,'')),'')
    );
  else
    update public.learner_evidence_items
    set status='parent_rejected',
        parent_rejected_at=now(),
        raw_delete_after=now(),
        updated_at=now()
    where id=p_evidence_id;

    insert into public.evidence_approval_events(
      evidence_item_id,guardian_profile_id,action,decision_note
    ) values (
      p_evidence_id,auth.uid(),'rejected',nullif(trim(coalesce(p_decision_note,'')),'')
    );
  end if;

  return true;
end;
$$;

revoke all on function public.decide_learner_evidence(uuid,boolean,text) from public, anon;
grant execute on function public.decide_learner_evidence(uuid,boolean,text) to authenticated;

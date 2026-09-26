-- Hosted authenticated E2E found a real first-submission failure in save_learner_work.
-- In PL/pgSQL, SELECT ... INTO with no matching row assigns NULL to every target,
-- which overwrote the declaration defaults for v_help and v_evidence_json.
-- The subsequent INSERT then attempted to write evidence_json = NULL even though
-- learner_submissions.evidence_json is NOT NULL.
--
-- Preserve all existing authorization/commercial/assignment checks. Only restore
-- the intended defaults after the optional existing-submission lookup.

create or replace function public.save_learner_work(
  p_learning_item_id uuid,
  p_learner_id uuid,
  p_response_text text,
  p_submit boolean
)
returns table(
  submission_id uuid,
  submission_status text,
  recipient_status text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_submission_id uuid;
  v_existing_status public.submission_status;
  v_has_evidence boolean := false;
  v_help smallint := 0;
  v_evidence_json jsonb := '{}'::jsonb;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  if not (
    exists(
      select 1
      from public.learners l
      where l.id = p_learner_id
        and l.user_id = v_uid
        and l.active = true
    )
    or exists(
      select 1
      from public.guardian_learner_links gl
      where gl.learner_id = p_learner_id
        and gl.guardian_profile_id = v_uid
        and gl.verified = true
    )
  ) then
    raise exception 'Only the learner or a verified guardian may save this learner work.';
  end if;

  if not public.has_commercial_learning_access(p_learner_id, p_learning_item_id) then
    raise exception 'Payment is required to access this learning item.';
  end if;

  if not exists(
    select 1
    from public.learning_item_recipients lir
    join public.learning_items li on li.id = lir.learning_item_id
    where lir.learning_item_id = p_learning_item_id
      and lir.learner_id = p_learner_id
      and li.status = 'published'
      and lir.status in ('assigned', 'started')
  ) then
    raise exception 'This learning item is not available for submission.';
  end if;

  select
    ls.id,
    ls.status,
    ls.assistance_level,
    coalesce(ls.evidence_json, '{}'::jsonb)
  into
    v_submission_id,
    v_existing_status,
    v_help,
    v_evidence_json
  from public.learner_submissions ls
  where ls.learning_item_id = p_learning_item_id
    and ls.learner_id = p_learner_id
  for update;

  -- SELECT INTO clears targets to NULL when no existing submission is found.
  -- Re-establish the safe defaults required for a first save/submit.
  v_help := coalesce(v_help, 0);
  v_evidence_json := coalesce(v_evidence_json, '{}'::jsonb);

  if v_existing_status = 'submitted' then
    raise exception 'This work has already been submitted.';
  end if;

  if v_submission_id is not null then
    select exists(
      select 1
      from public.learner_evidence_items e
      where e.submission_id = v_submission_id
        and e.learner_id = p_learner_id
        and e.status not in ('parent_rejected', 'expired', 'deleted')
    ) into v_has_evidence;
  end if;

  if p_submit
     and trim(coalesce(p_response_text, '')) = ''
     and not v_has_evidence then
    raise exception 'Write, draw or attach learning evidence before submitting.';
  end if;

  insert into public.learner_submissions(
    learning_item_id,
    learner_id,
    response_text,
    evidence_json,
    assistance_level,
    status,
    submitted_at,
    updated_at
  ) values (
    p_learning_item_id,
    p_learner_id,
    nullif(trim(coalesce(p_response_text, '')), ''),
    v_evidence_json,
    v_help,
    case
      when p_submit then 'submitted'::public.submission_status
      else 'draft'::public.submission_status
    end,
    case when p_submit then now() else null end,
    now()
  )
  on conflict (learning_item_id, learner_id) do update set
    response_text = excluded.response_text,
    status = excluded.status,
    submitted_at = excluded.submitted_at,
    updated_at = now()
  returning id into v_submission_id;

  update public.learning_item_recipients
  set status = case
    when p_submit then 'submitted'::public.recipient_learning_status
    when status = 'assigned'::public.recipient_learning_status
      then 'started'::public.recipient_learning_status
    else status
  end
  where learning_item_id = p_learning_item_id
    and learner_id = p_learner_id
    and status in ('assigned', 'started');

  if not found then
    raise exception 'Learner workflow status could not be advanced.';
  end if;

  return query
  select
    v_submission_id,
    (select ls.status::text
       from public.learner_submissions ls
      where ls.id = v_submission_id),
    (select lir.status::text
       from public.learning_item_recipients lir
      where lir.learning_item_id = p_learning_item_id
        and lir.learner_id = p_learner_id);
end;
$function$;

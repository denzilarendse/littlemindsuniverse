-- LMU Architecture 2.0 Stage 2
-- Teacher review must not cross a pending guardian evidence boundary.

create or replace function public.review_learner_submission(
  p_submission_id uuid,
  p_mastery_judgement public.mastery_judgement,
  p_misconception text,
  p_teacher_feedback text,
  p_recommended_next_step text
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_review_id uuid;
  v_assistance_level smallint;
  v_submitted_actor text;
  v_learning_item_id uuid;
  v_learner_id uuid;
  v_submission_status public.submission_status;
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in.';
  end if;

  select ls.assistance_level, ls.submitted_actor, ls.learning_item_id, ls.learner_id, ls.status
    into v_assistance_level, v_submitted_actor, v_learning_item_id, v_learner_id, v_submission_status
  from public.learner_submissions ls
  join public.learning_items li on li.id=ls.learning_item_id
  where ls.id=p_submission_id
    and li.teacher_profile_id=(select auth.uid());

  if not found then
    raise exception 'You are not authorized to review this submission.';
  end if;

  if v_submission_status <> 'submitted'::public.submission_status then
    raise exception 'Only submitted work can be reviewed.';
  end if;

  if exists (
    select 1
    from public.learner_evidence_items e
    where e.submission_id=p_submission_id
      and e.status='pending_parent_approval'::public.evidence_status
  ) then
    raise exception 'Guardian evidence approval is still pending. Review cannot be completed yet.';
  end if;

  insert into public.submission_reviews(
    submission_id,teacher_profile_id,mastery_judgement,misconception,
    teacher_feedback,recommended_next_step,independent_evidence
  )
  values(
    p_submission_id,(select auth.uid()),p_mastery_judgement,
    nullif(trim(coalesce(p_misconception,'')),''),
    nullif(trim(coalesce(p_teacher_feedback,'')),''),
    nullif(trim(coalesce(p_recommended_next_step,'')),''),
    (v_assistance_level=0 and v_submitted_actor='learner')
  )
  on conflict(submission_id) do update set
    mastery_judgement=excluded.mastery_judgement,
    misconception=excluded.misconception,
    teacher_feedback=excluded.teacher_feedback,
    recommended_next_step=excluded.recommended_next_step,
    independent_evidence=excluded.independent_evidence,
    teacher_profile_id=(select auth.uid()),
    updated_at=now()
  returning id into v_review_id;

  update public.learning_item_recipients lir
  set status='reviewed'::public.recipient_learning_status
  where lir.learning_item_id=v_learning_item_id
    and lir.learner_id=v_learner_id
    and lir.status='submitted'::public.recipient_learning_status;

  if not found then
    raise exception 'Submission recipient is not in submitted state.';
  end if;

  return v_review_id;
end;
$$;

revoke all on function public.review_learner_submission(uuid,public.mastery_judgement,text,text,text) from public, anon;
grant execute on function public.review_learner_submission(uuid,public.mastery_judgement,text,text,text) to authenticated;

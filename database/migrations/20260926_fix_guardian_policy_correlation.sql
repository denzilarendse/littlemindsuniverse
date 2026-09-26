-- Fix a release-blocking RLS correlation defect discovered during live policy audit.
--
-- The previous predicates contained `gl.learner_id = gl.learner_id`, which is a
-- tautology. A verified guardian relationship must always be correlated to the
-- learner on the row currently being read or mutated.

alter policy learner_or_verified_guardian_creates_submission
on public.learner_submissions
with check (
  public.is_learning_item_recipient(learning_item_id, learner_id)
  and public.has_commercial_learning_access(learner_id, learning_item_id)
  and (
    exists (
      select 1
      from public.learners l
      where l.id = learner_submissions.learner_id
        and l.user_id = (select auth.uid())
        and l.active = true
    )
    or exists (
      select 1
      from public.guardian_learner_links gl
      where gl.learner_id = learner_submissions.learner_id
        and gl.guardian_profile_id = (select auth.uid())
        and gl.verified = true
    )
  )
);

alter policy allowed_users_read_submissions
on public.learner_submissions
using (
  public.teacher_owns_learning_item(learning_item_id)
  or (
    public.has_commercial_learning_access(learner_id, learning_item_id)
    and (
      exists (
        select 1
        from public.learners l
        where l.id = learner_submissions.learner_id
          and l.user_id = (select auth.uid())
          and l.active = true
      )
      or exists (
        select 1
        from public.guardian_learner_links gl
        where gl.learner_id = learner_submissions.learner_id
          and gl.guardian_profile_id = (select auth.uid())
          and gl.verified = true
      )
    )
  )
);

alter policy learner_or_verified_guardian_updates_submission
on public.learner_submissions
using (
  public.has_commercial_learning_access(learner_id, learning_item_id)
  and (
    exists (
      select 1
      from public.learners l
      where l.id = learner_submissions.learner_id
        and l.user_id = (select auth.uid())
        and l.active = true
    )
    or exists (
      select 1
      from public.guardian_learner_links gl
      where gl.learner_id = learner_submissions.learner_id
        and gl.guardian_profile_id = (select auth.uid())
        and gl.verified = true
    )
  )
)
with check (
  public.is_learning_item_recipient(learning_item_id, learner_id)
  and public.has_commercial_learning_access(learner_id, learning_item_id)
  and (
    exists (
      select 1
      from public.learners l
      where l.id = learner_submissions.learner_id
        and l.user_id = (select auth.uid())
        and l.active = true
    )
    or exists (
      select 1
      from public.guardian_learner_links gl
      where gl.learner_id = learner_submissions.learner_id
        and gl.guardian_profile_id = (select auth.uid())
        and gl.verified = true
    )
  )
);

alter policy allowed_users_read_recipients
on public.learning_item_recipients
using (
  public.teacher_owns_learning_item(learning_item_id)
  or (
    exists (
      select 1
      from public.learning_items li
      where li.id = learning_item_recipients.learning_item_id
        and li.status = any (array['published'::public.learning_item_status, 'closed'::public.learning_item_status])
    )
    and (
      exists (
        select 1
        from public.learners l
        where l.id = learning_item_recipients.learner_id
          and l.user_id = (select auth.uid())
          and l.active = true
      )
      or exists (
        select 1
        from public.guardian_learner_links gl
        where gl.learner_id = learning_item_recipients.learner_id
          and gl.guardian_profile_id = (select auth.uid())
          and gl.verified = true
      )
    )
    and public.has_commercial_learning_access(learner_id, learning_item_id)
  )
);

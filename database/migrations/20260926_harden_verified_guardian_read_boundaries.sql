-- Harden read boundaries so revoked or unverified guardian links cannot retain
-- classroom/report/private-evidence visibility through stale permission flags.

alter policy teacher_reads_own_classrooms
on public.classrooms
using (
  teacher_profile_id = (select auth.uid())
  or exists (
    select 1
    from public.classroom_members cm
    join public.learners l on l.id = cm.learner_id
    left join public.guardian_learner_links gl on gl.learner_id = l.id
    where cm.classroom_id = classrooms.id
      and cm.status = 'active'
      and l.active = true
      and (
        l.user_id = (select auth.uid())
        or (
          gl.guardian_profile_id = (select auth.uid())
          and gl.verified = true
        )
      )
  )
);

alter policy guardian_reads_approved_weekly_reports
on public.weekly_reports
using (
  status = 'approved'
  and exists (
    select 1
    from public.guardian_learner_links gl
    where gl.guardian_profile_id = (select auth.uid())
      and gl.learner_id = weekly_reports.learner_id
      and gl.verified = true
      and gl.can_receive_reports = true
  )
);

alter policy guardian_read_linked_private_evidence
on storage.objects
using (
  bucket_id = 'learner-evidence-private'
  and exists (
    select 1
    from public.guardian_learner_links gl
    where gl.guardian_profile_id = auth.uid()
      and gl.verified = true
      and gl.can_approve_evidence = true
      and gl.learner_id::text = (storage.foldername(objects.name))[1]
  )
);

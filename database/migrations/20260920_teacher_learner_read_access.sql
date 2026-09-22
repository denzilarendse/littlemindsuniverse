-- LittleMindsUniverse
-- Allow an authenticated teacher to access a learner only when:
--   1. the teacher owns an active classroom, and
--   2. that learner has an active membership in that classroom.
--
-- Existing learner-self and verified-guardian access is preserved.

create or replace function public.can_access_learner(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select
        exists (
            select 1
            from public.learners l
            where l.id = p_learner_id
              and l.user_id = auth.uid()
        )

        or

        exists (
            select 1
            from public.guardian_learner_links gl
            where gl.learner_id = p_learner_id
              and gl.guardian_profile_id = auth.uid()
              and gl.verified = true
        )

        or

        exists (
            select 1
            from public.classroom_members cm
            join public.classrooms c
              on c.id = cm.classroom_id
            where cm.learner_id = p_learner_id
              and cm.status = 'active'
              and c.teacher_profile_id = auth.uid()
              and c.active = true
        );
$$;

drop policy if exists guardian_reads_linked_learner
on public.learners;

create policy guardian_reads_linked_learner
on public.learners
for select
to authenticated
using (
    created_by = (select auth.uid())
    or public.can_access_learner(id)
);

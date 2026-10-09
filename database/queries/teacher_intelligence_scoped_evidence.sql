-- Phase 1B: scoped teacher-reviewed evidence read model.
-- :classroom_id and :teacher_id MUST be bound by a trusted server from verified auth.
-- Do not expose this query as a client-callable raw SQL endpoint.
select me.id as evidence_id, me.learner_id, me.skill_id,
       me.judgement::text as judgement, me.independent_evidence,
       me.misconception, me.observed_at, li.classroom_id,
       s.name as skill_name
from public.mastery_evidence me
join public.skills s on s.id=me.skill_id and s.active=true
join public.classroom_members cm on cm.classroom_id=:classroom_id::uuid
 and cm.learner_id=me.learner_id and cm.status='active'::public.membership_status
join public.learners l on l.id=me.learner_id and l.active=true
join public.learning_items li on li.id=me.learning_item_id
 and li.classroom_id=:classroom_id::uuid
join public.learner_submissions ls on ls.id=me.submission_id
 and ls.learner_id=me.learner_id and ls.learning_item_id=li.id
join public.submission_reviews sr on sr.id=me.review_id
 and sr.submission_id=ls.id and sr.teacher_profile_id=:teacher_id::uuid
where exists (select 1 from public.classrooms c
 where c.id=:classroom_id::uuid and c.teacher_profile_id=:teacher_id::uuid and c.active=true)
order by me.observed_at desc,me.id desc;

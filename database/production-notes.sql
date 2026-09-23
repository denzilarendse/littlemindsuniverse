-- LittleMindsUniverse production hardening notes.
-- Review in a Supabase branch/staging environment before applying to production.
-- Every exposed user-data table must have RLS enabled and least-privilege policies.
-- Current Supabase projects may not auto-expose new public tables to Data API; grant only after RLS is defined.

-- High-value FK indexes (safe if matching columns exist):
create index if not exists learning_item_recipients_learner_idx on public.learning_item_recipients(learner_id);
create index if not exists classroom_members_learner_idx on public.classroom_members(learner_id);
create index if not exists mastery_evidence_learner_skill_idx on public.mastery_evidence(learner_id,skill_id);
create index if not exists learner_skill_mastery_learner_idx on public.learner_skill_mastery(learner_id);
create index if not exists weekly_reports_learner_week_idx on public.weekly_reports(learner_id,week_start desc);
create index if not exists milo_recommendations_status_idx on public.milo_recommendations(status,created_at desc);

-- RLS performance pattern for policy authors:
-- use (select auth.uid()) rather than auth.uid() per-row when appropriate.
-- UPDATE policies need both USING and WITH CHECK.
-- Do not use user_metadata for authorization.
-- SECURITY DEFINER functions must not remain PUBLIC-executable by default.

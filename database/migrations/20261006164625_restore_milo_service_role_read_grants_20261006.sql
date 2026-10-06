-- Source reconciliation for the already-applied hosted migration
-- 20261006164625_restore_milo_service_role_read_grants_20261006.
--
-- Brilliant Milo's server-side Supabase Data API calls use a backend secret key
-- that executes as service_role. RLS bypass alone does not provide table
-- privileges, so these reads require explicit PostgreSQL SELECT grants.
--
-- Keep this least-privilege: no anon/authenticated grants and no write grants.

grant select on table
  public.profiles,
  public.learners,
  public.learning_items,
  public.milo_assistance_events,
  public.milo_learning_sessions,
  public.milo_learning_events,
  public.learner_skill_mastery,
  public.skills
to service_role;

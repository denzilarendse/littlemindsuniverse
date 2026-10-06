-- RC2: restore only the server-side reads required by Brilliant Milo.
-- Supabase secret keys execute Data API requests as service_role. RLS is bypassed
-- for that role, but PostgreSQL table grants are still required before RLS.
-- Public client privileges are intentionally unchanged.

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

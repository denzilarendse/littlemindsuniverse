-- Source ledger for the production repair applied on 2026-10-06.
-- Restore only the server-side SELECT grants required by Brilliant Milo.
-- Supabase server secret/service_role requests still need PostgreSQL table
-- privileges before RLS bypass semantics can apply. Browser roles are unchanged.

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

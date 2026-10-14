-- Phase 1J: remove direct API execution from trigger-only SECURITY DEFINER functions.
-- These functions are invoked by PostgreSQL triggers, never by browser or API clients.
-- Trigger execution does not require caller EXECUTE privilege on the trigger function.

revoke all on function public.initialize_support_group_lifecycle_from_recommendation() from public, anon, authenticated, service_role;
revoke all on function public.sync_teacher_intelligence_recommendation_status() from public, anon, authenticated, service_role;
revoke all on function public.sync_teacher_intelligence_support_outcome() from public, anon, authenticated, service_role;

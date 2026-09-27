-- Internal authorization predicates should not be callable as standalone browser RPCs.
-- They remain SECURITY DEFINER helpers owned by postgres and continue to execute
-- inside the bounded top-level RPCs that perform the real user-facing actions.
--
-- Do not revoke helper functions that are referenced directly by RLS policies;
-- policy evaluation requires the authenticated caller to be able to execute them.
-- These two helpers are not referenced by RLS policies and are not called directly
-- by the LMU or Connect web clients.

revoke execute on function public.connect_can_send(uuid) from public;
revoke execute on function public.connect_can_send(uuid) from anon;
revoke execute on function public.connect_can_send(uuid) from authenticated;

revoke execute on function public.has_premium_access(uuid) from public;
revoke execute on function public.has_premium_access(uuid) from anon;
revoke execute on function public.has_premium_access(uuid) from authenticated;

begin;

-- Internal relationship predicate: top-level SECURITY DEFINER functions invoke it,
-- but app roles must not call it directly with arbitrary conversation IDs.
revoke execute on function public.connect_classroom_relationship_active(uuid) from public;
revoke execute on function public.connect_classroom_relationship_active(uuid) from anon;
revoke execute on function public.connect_classroom_relationship_active(uuid) from authenticated;

commit;

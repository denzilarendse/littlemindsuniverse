-- Non-destructive reconciliation inventory for unregistered teacher evidence objects.
-- This migration adds a report-only RPC. It never deletes, moves, or changes Storage objects.
-- Apply and validate only in isolated staging; do not use this inventory as an automatic delete queue.

create or replace function public.list_teacher_chat_evidence_orphan_candidates(
  p_min_age interval default interval '24 hours',
  p_limit integer default 100
)
returns table (
  storage_object_id uuid,
  storage_path text,
  object_created_at timestamptz,
  object_size_bytes bigint,
  candidate_reason text
)
language plpgsql
security definer
set search_path = public, storage
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.';
  end if;

  if p_min_age is null or p_min_age < interval '24 hours' or p_min_age > interval '365 days' then
    raise exception 'Minimum age must be between 24 hours and 365 days.';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Limit must be between 1 and 100.';
  end if;

  return query
  select
    o.id,
    o.name,
    o.created_at,
    case
      when coalesce(o.metadata ->> 'size', '') ~ '^[0-9]{1,12}$'
      then (o.metadata ->> 'size')::bigint
      else null
    end,
    'unregistered_object_older_than_threshold'::text
  from storage.objects o
  where o.bucket_id = 'teacher-chat-evidence-quarantine'
    and o.created_at < now() - p_min_age
    and o.name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$'
    and not exists (
      select 1
      from public.teacher_chat_evidence e
      where e.storage_path = o.name
    )
  order by o.created_at asc, o.id
  limit p_limit;
end;
$function$;

revoke all on function public.list_teacher_chat_evidence_orphan_candidates(interval, integer) from public, anon, authenticated;
grant execute on function public.list_teacher_chat_evidence_orphan_candidates(interval, integer) to service_role;

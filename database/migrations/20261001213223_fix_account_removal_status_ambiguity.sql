create or replace function public.request_account_removal(p_source text default 'in_app'::text)
returns table(request_id uuid, created_at timestamptz, status text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_source text := lower(coalesce(nullif(trim(p_source), ''), 'in_app'));
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if v_source not in ('in_app','web') then
    raise exception 'Invalid request source' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'Account profile is not available' using errcode = 'P0002';
  end if;

  return query
  insert into public.privacy_requests as pr(profile_id, request_type, source, message)
  values (v_uid, 'account_removal', v_source, null)
  on conflict (profile_id)
    where request_type = 'account_removal'
      and pr.status in ('pending','processing')
  do update
    set updated_at = now(),
        source = excluded.source
  returning pr.id, pr.created_at, pr.status;
end;
$function$;

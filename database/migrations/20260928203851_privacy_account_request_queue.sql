begin;

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('account_removal','privacy_inquiry')),
  source text not null default 'in_app' check (source in ('in_app','web')),
  message text check (message is null or char_length(message) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending','processing','completed','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);

create index if not exists privacy_requests_profile_created_idx
  on public.privacy_requests(profile_id, created_at desc);

create unique index if not exists privacy_requests_one_active_account_removal_idx
  on public.privacy_requests(profile_id)
  where request_type = 'account_removal' and status in ('pending','processing');

alter table public.privacy_requests enable row level security;
revoke all on table public.privacy_requests from anon, authenticated;

create or replace function public.request_account_removal(p_source text default 'in_app')
returns table(request_id uuid, created_at timestamptz, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  insert into public.privacy_requests(profile_id, request_type, source, message)
  values (v_uid, 'account_removal', v_source, null)
  on conflict (profile_id)
    where request_type = 'account_removal' and status in ('pending','processing')
  do update set updated_at = now(), source = excluded.source
  returning privacy_requests.id, privacy_requests.created_at, privacy_requests.status;
end;
$$;

revoke all on function public.request_account_removal(text) from public, anon;
grant execute on function public.request_account_removal(text) to authenticated;

create or replace function public.submit_privacy_inquiry(p_message text, p_source text default 'in_app')
returns table(request_id uuid, created_at timestamptz, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_message text := trim(coalesce(p_message, ''));
  v_source text := lower(coalesce(nullif(trim(p_source), ''), 'in_app'));
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if v_source not in ('in_app','web') then
    raise exception 'Invalid request source' using errcode = '22023';
  end if;

  if char_length(v_message) < 20 or char_length(v_message) > 2000 then
    raise exception 'Privacy inquiry must contain between 20 and 2000 characters' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'Account profile is not available' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.privacy_requests r
    where r.profile_id = v_uid
      and r.request_type = 'privacy_inquiry'
      and r.created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Please wait before submitting another privacy inquiry' using errcode = 'P0001';
  end if;

  return query
  insert into public.privacy_requests(profile_id, request_type, source, message)
  values (v_uid, 'privacy_inquiry', v_source, v_message)
  returning privacy_requests.id, privacy_requests.created_at, privacy_requests.status;
end;
$$;

revoke all on function public.submit_privacy_inquiry(text,text) from public, anon;
grant execute on function public.submit_privacy_inquiry(text,text) to authenticated;

commit;

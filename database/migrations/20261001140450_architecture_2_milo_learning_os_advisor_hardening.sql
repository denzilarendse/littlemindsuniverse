-- Architecture 2.0 Stage 3/4 advisor hardening: explicit deny policies and covering indexes.

do $$
declare
  t text;
begin
  foreach t in array array['milo_learning_sessions','milo_learning_events','milo_safety_events']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_no_direct_client_access', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      t || '_no_direct_client_access', t
    );
  end loop;
end
$$;

create index if not exists milo_learning_sessions_primary_skill_idx
  on public.milo_learning_sessions(primary_skill_id)
  where primary_skill_id is not null;

create index if not exists milo_learning_events_learning_item_idx
  on public.milo_learning_events(learning_item_id)
  where learning_item_id is not null;

create index if not exists milo_learning_events_profile_idx
  on public.milo_learning_events(profile_id);

create index if not exists milo_safety_events_profile_idx
  on public.milo_safety_events(profile_id)
  where profile_id is not null;

create index if not exists milo_safety_events_session_idx
  on public.milo_safety_events(session_id)
  where session_id is not null;

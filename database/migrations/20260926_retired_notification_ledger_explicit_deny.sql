begin;

-- The third-party dispatch ledger is retained only as historical audit data.
-- Make the client-deny intent explicit instead of relying on "RLS with no policy".
revoke all on table public.notification_dispatches from public, anon, authenticated;

drop policy if exists notification_dispatches_no_client_access
  on public.notification_dispatches;

create policy notification_dispatches_no_client_access
  on public.notification_dispatches
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Provider dispatch RPCs are retired. Keep their definitions only for migration
-- history/audit, with no app/server API role allowed to invoke them.
revoke all on function public.set_parent_whatsapp_contact(text, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.reserve_whatsapp_dispatch(text, uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.complete_whatsapp_dispatch(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.fail_whatsapp_dispatch(uuid, text)
  from public, anon, authenticated, service_role;

commit;

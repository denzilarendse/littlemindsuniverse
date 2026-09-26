begin;

-- Keep the existing web client working while the visible UI migrates to Connect names.
create or replace function public.get_message_contacts()
returns table (
  classroom_id uuid,
  classroom_name text,
  learner_id uuid,
  learner_name text,
  guardian_profile_id uuid,
  guardian_name text,
  teacher_profile_id uuid,
  teacher_name text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from public.get_connect_contacts();
$$;

revoke all on function public.get_message_contacts() from public;
grant execute on function public.get_message_contacts() to authenticated;

-- Provider contact collection is retired. Preserve the table as historical data, but
-- remove client access and mark any prior opt-in inactive.
revoke all on table public.whatsapp_contacts from anon, authenticated;
update public.whatsapp_contacts
set opted_in = false,
    opted_out_at = coalesce(opted_out_at, now())
where opted_in = true;

update public.guardian_learner_links
set can_receive_whatsapp = false
where can_receive_whatsapp = true;

revoke all on function public.set_parent_whatsapp_contact(text,boolean) from anon, authenticated;
revoke all on function public.reserve_whatsapp_dispatch(text,uuid,uuid,uuid,text,uuid) from anon, authenticated, service_role;
revoke all on function public.complete_whatsapp_dispatch(uuid,text) from anon, authenticated, service_role;
revoke all on function public.fail_whatsapp_dispatch(uuid,text) from anon, authenticated, service_role;

commit;
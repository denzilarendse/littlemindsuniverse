-- Legacy messaging RPC names are compatibility wrappers over the canonical
-- LittleMinds Connect RPCs. They do not need their own SECURITY DEFINER
-- privileges: the canonical functions perform the authorization checks.
-- Keeping these wrappers as SECURITY INVOKER reduces the exposed definer surface
-- while preserving backwards compatibility during the UI migration.

alter function public.get_message_contacts() security invoker;
alter function public.get_my_message_threads() security invoker;
alter function public.get_or_create_message_thread(uuid, uuid, uuid) security invoker;
alter function public.get_thread_messages(uuid) security invoker;
alter function public.send_thread_message(uuid, text) security invoker;

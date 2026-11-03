-- Stage 8: LittleMinds Connect delivery reliability, offline idempotency and push-registration foundation.
-- Keeps all message mutations behind authorization-aware RPCs. Push dispatch credentials remain server-only.

begin;

alter table public.connect_messages
  add column if not exists client_message_id uuid;

create unique index if not exists connect_messages_client_idempotency_idx
  on public.connect_messages(conversation_id, sender_profile_id, client_message_id)
  where client_message_id is not null;

create table if not exists public.connect_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique
    check (char_length(endpoint) between 20 and 2048 and endpoint ~ '^https://'),
  p256dh text not null check (char_length(p256dh) between 16 and 512),
  auth_secret text not null check (char_length(auth_secret) between 8 and 512),
  platform text not null default 'web'
    check (platform in ('web','android','ios','windows')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists connect_push_subscriptions_profile_idx
  on public.connect_push_subscriptions(profile_id, last_seen_at desc);

alter table public.connect_push_subscriptions enable row level security;

-- Subscription endpoints are capability URLs. They are never exposed through direct
-- Data API reads/writes; authenticated clients can mutate only their own row via RPC.
revoke all on table public.connect_push_subscriptions from public, anon, authenticated;

create or replace function public.register_connect_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_secret text,
  p_platform text default 'web'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_endpoint text := btrim(coalesce(p_endpoint,''));
  v_p256dh text := btrim(coalesce(p_p256dh,''));
  v_auth text := btrim(coalesce(p_auth_secret,''));
  v_platform text := lower(btrim(coalesce(p_platform,'web')));
  v_owner uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;
  if char_length(v_endpoint) < 20 or char_length(v_endpoint) > 2048 or v_endpoint !~ '^https://' then
    raise exception 'A valid HTTPS push endpoint is required.';
  end if;
  if char_length(v_p256dh) < 16 or char_length(v_p256dh) > 512 then
    raise exception 'Push public key is invalid.';
  end if;
  if char_length(v_auth) < 8 or char_length(v_auth) > 512 then
    raise exception 'Push authentication value is invalid.';
  end if;
  if v_platform not in ('web','android','ios','windows') then
    raise exception 'Unsupported push platform.';
  end if;

  select s.profile_id into v_owner
  from public.connect_push_subscriptions s
  where s.endpoint = v_endpoint;

  if found and v_owner <> v_uid then
    raise exception 'This push endpoint is already registered to another account.';
  end if;

  insert into public.connect_push_subscriptions(
    profile_id, endpoint, p256dh, auth_secret, platform, updated_at, last_seen_at
  ) values (
    v_uid, v_endpoint, v_p256dh, v_auth, v_platform, now(), now()
  )
  on conflict (endpoint) do update
  set p256dh = excluded.p256dh,
      auth_secret = excluded.auth_secret,
      platform = excluded.platform,
      updated_at = now(),
      last_seen_at = now()
  where public.connect_push_subscriptions.profile_id = v_uid
  returning id into v_id;

  if v_id is null then
    raise exception 'Push subscription could not be registered.';
  end if;

  return v_id;
end;
$function$;

revoke all on function public.register_connect_push_subscription(text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.register_connect_push_subscription(text,text,text,text)
  to authenticated;

create or replace function public.unregister_connect_push_subscription(
  p_endpoint text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_endpoint text := btrim(coalesce(p_endpoint,''));
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  delete from public.connect_push_subscriptions s
  where s.profile_id = v_uid
    and s.endpoint = v_endpoint;

  return found;
end;
$function$;

revoke all on function public.unregister_connect_push_subscription(text)
  from public, anon, authenticated;
grant execute on function public.unregister_connect_push_subscription(text)
  to authenticated;

create or replace function public.mark_connect_thread_delivered(
  p_conversation_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_now timestamptz := now();
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;
  if not public.connect_is_member(p_conversation_id) then
    raise exception 'not authorized';
  end if;

  update public.connect_receipts r
  set delivered_at = coalesce(r.delivered_at, v_now)
  from public.connect_messages m
  where r.message_id = m.id
    and r.profile_id = v_uid
    and m.conversation_id = p_conversation_id
    and m.sender_profile_id <> v_uid
    and m.deleted_at is null
    and r.delivered_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke all on function public.mark_connect_thread_delivered(uuid)
  from public, anon, authenticated;
grant execute on function public.mark_connect_thread_delivered(uuid)
  to authenticated;

create or replace function public.send_connect_message_v2(
  p_conversation_id uuid,
  p_body text,
  p_reply_to_message_id uuid default null,
  p_client_message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_body text := btrim(coalesce(p_body,''));
  v_id uuid;
  v_existing_body text;
  v_existing_reply uuid;
  v_new boolean := false;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if p_client_message_id is null then
    raise exception 'client message id is required';
  end if;
  if not public.connect_can_send(p_conversation_id) then
    raise exception 'not authorized to send to this conversation';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'message length must be between 1 and 4000 characters';
  end if;
  if p_reply_to_message_id is not null and not exists (
    select 1
    from public.connect_messages m
    where m.id = p_reply_to_message_id
      and m.conversation_id = p_conversation_id
      and m.deleted_at is null
  ) then
    raise exception 'reply target is invalid';
  end if;

  insert into public.connect_messages(
    conversation_id,
    sender_profile_id,
    body,
    reply_to_message_id,
    client_message_id
  ) values (
    p_conversation_id,
    v_uid,
    v_body,
    p_reply_to_message_id,
    p_client_message_id
  )
  on conflict (conversation_id, sender_profile_id, client_message_id)
    where client_message_id is not null
  do nothing
  returning id into v_id;

  if v_id is null then
    select m.id, m.body, m.reply_to_message_id
    into v_id, v_existing_body, v_existing_reply
    from public.connect_messages m
    where m.conversation_id = p_conversation_id
      and m.sender_profile_id = v_uid
      and m.client_message_id = p_client_message_id;

    if v_id is null then
      raise exception 'message retry could not be resolved';
    end if;
    if v_existing_body <> v_body
       or v_existing_reply is distinct from p_reply_to_message_id then
      raise exception 'client message id was already used for different content';
    end if;
  else
    v_new := true;
  end if;

  insert into public.connect_receipts(message_id, profile_id)
  select v_id, cm.profile_id
  from public.connect_members cm
  where cm.conversation_id = p_conversation_id
    and cm.profile_id <> v_uid
    and cm.state in ('active','muted')
  on conflict (message_id, profile_id) do nothing;

  if v_new then
    update public.connect_conversations
    set updated_at = now()
    where id = p_conversation_id;
  end if;

  return v_id;
end;
$function$;

revoke all on function public.send_connect_message_v2(uuid,text,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.send_connect_message_v2(uuid,text,uuid,uuid)
  to authenticated;

commit;

begin;

create table if not exists public.connect_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct','classroom','support','business')),
  title text,
  classroom_id uuid,
  learner_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.connect_members (
  conversation_id uuid not null references public.connect_conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner','agent','member','observer')),
  state text not null default 'active' check (state in ('active','muted','suspended','left')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);

create table if not exists public.connect_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.connect_conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete restrict,
  message_type text not null default 'text' check (message_type in ('text','system')),
  body text not null check (char_length(body) between 1 and 4000),
  reply_to_message_id uuid references public.connect_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.connect_receipts (
  message_id uuid not null references public.connect_messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, profile_id)
);

create table if not exists public.connect_business_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  verification_state text not null default 'unverified' check (verification_state in ('unverified','pending','verified','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.connect_business_members (
  business_id uuid not null references public.connect_business_accounts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'agent' check (role in ('owner','admin','agent','viewer')),
  state text not null default 'active' check (state in ('active','suspended','left')),
  created_at timestamptz not null default now(),
  primary key (business_id, profile_id)
);

create index if not exists connect_messages_conversation_created_idx
  on public.connect_messages(conversation_id, created_at desc);
create index if not exists connect_members_profile_idx
  on public.connect_members(profile_id, conversation_id);

alter table public.connect_conversations enable row level security;
alter table public.connect_members enable row level security;
alter table public.connect_messages enable row level security;
alter table public.connect_receipts enable row level security;
alter table public.connect_business_accounts enable row level security;
alter table public.connect_business_members enable row level security;

create or replace function public.connect_is_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.connect_members cm
       where cm.conversation_id = p_conversation_id
         and cm.profile_id = auth.uid()
         and cm.state in ('active','muted')
     );
$$;

revoke all on function public.connect_is_member(uuid) from public;
grant execute on function public.connect_is_member(uuid) to authenticated;

create or replace function public.connect_can_send(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.connect_members cm
       join public.profiles p on p.id = cm.profile_id
       where cm.conversation_id = p_conversation_id
         and cm.profile_id = auth.uid()
         and cm.state = 'active'
         and p.role in ('teacher','parent','admin')
     );
$$;

revoke all on function public.connect_can_send(uuid) from public;
grant execute on function public.connect_can_send(uuid) to authenticated;

create policy connect_conversations_select_member
on public.connect_conversations
for select to authenticated
using (public.connect_is_member(id));

create policy connect_members_select_same_conversation
on public.connect_members
for select to authenticated
using (public.connect_is_member(conversation_id));

create policy connect_messages_select_member
on public.connect_messages
for select to authenticated
using (public.connect_is_member(conversation_id));

create policy connect_receipts_select_member
on public.connect_receipts
for select to authenticated
using (
  exists (
    select 1 from public.connect_messages m
    where m.id = message_id
      and public.connect_is_member(m.conversation_id)
  )
);

create policy connect_business_accounts_select_member
on public.connect_business_accounts
for select to authenticated
using (
  owner_profile_id = auth.uid()
  or exists (
    select 1 from public.connect_business_members bm
    where bm.business_id = id
      and bm.profile_id = auth.uid()
      and bm.state = 'active'
  )
);

create policy connect_business_members_select_same_business
on public.connect_business_members
for select to authenticated
using (
  exists (
    select 1 from public.connect_business_accounts b
    where b.id = business_id
      and (
        b.owner_profile_id = auth.uid()
        or exists (
          select 1 from public.connect_business_members mine
          where mine.business_id = b.id
            and mine.profile_id = auth.uid()
            and mine.state = 'active'
        )
      )
  )
);

create or replace function public.get_connect_threads()
returns table (
  conversation_id uuid,
  kind text,
  title text,
  learner_id uuid,
  updated_at timestamptz,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id,
         c.kind,
         c.title,
         c.learner_id,
         c.updated_at,
         lm.body,
         lm.created_at,
         coalesce((
           select count(*)
           from public.connect_messages um
           where um.conversation_id = c.id
             and um.sender_profile_id <> auth.uid()
             and um.created_at > coalesce(cm.last_read_at, '-infinity'::timestamptz)
             and um.deleted_at is null
         ), 0)::bigint
  from public.connect_members cm
  join public.connect_conversations c on c.id = cm.conversation_id
  left join lateral (
    select m.body, m.created_at
    from public.connect_messages m
    where m.conversation_id = c.id and m.deleted_at is null
    order by m.created_at desc
    limit 1
  ) lm on true
  where auth.uid() is not null
    and cm.profile_id = auth.uid()
    and cm.state in ('active','muted')
    and c.archived_at is null
  order by coalesce(lm.created_at, c.updated_at) desc;
$$;

revoke all on function public.get_connect_threads() from public;
grant execute on function public.get_connect_threads() to authenticated;

create or replace function public.get_connect_messages(p_conversation_id uuid)
returns table (
  id uuid,
  sender_profile_id uuid,
  sender_name text,
  body text,
  message_type text,
  reply_to_message_id uuid,
  created_at timestamptz,
  edited_at timestamptz,
  sent_by_me boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id,
         m.sender_profile_id,
         p.display_name,
         m.body,
         m.message_type,
         m.reply_to_message_id,
         m.created_at,
         m.edited_at,
         m.sender_profile_id = auth.uid()
  from public.connect_messages m
  join public.profiles p on p.id = m.sender_profile_id
  where public.connect_is_member(p_conversation_id)
    and m.conversation_id = p_conversation_id
    and m.deleted_at is null
  order by m.created_at asc
  limit 500;
$$;

revoke all on function public.get_connect_messages(uuid) from public;
grant execute on function public.get_connect_messages(uuid) to authenticated;

create or replace function public.send_connect_message(
  p_conversation_id uuid,
  p_body text,
  p_reply_to_message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_body text := btrim(coalesce(p_body,''));
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not public.connect_can_send(p_conversation_id) then
    raise exception 'not authorized to send to this conversation';
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'message length must be between 1 and 4000 characters';
  end if;

  if p_reply_to_message_id is not null and not exists (
    select 1 from public.connect_messages m
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
    reply_to_message_id
  ) values (
    p_conversation_id,
    auth.uid(),
    v_body,
    p_reply_to_message_id
  ) returning id into v_id;

  update public.connect_conversations
  set updated_at = now()
  where id = p_conversation_id;

  return v_id;
end;
$$;

revoke all on function public.send_connect_message(uuid,text,uuid) from public;
grant execute on function public.send_connect_message(uuid,text,uuid) to authenticated;

create or replace function public.mark_connect_thread_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.connect_is_member(p_conversation_id) then
    raise exception 'not authorized';
  end if;

  update public.connect_members
  set last_read_at = now()
  where conversation_id = p_conversation_id
    and profile_id = auth.uid();
end;
$$;

revoke all on function public.mark_connect_thread_read(uuid) from public;
grant execute on function public.mark_connect_thread_read(uuid) to authenticated;

commit;

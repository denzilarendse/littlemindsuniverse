begin;

create table if not exists public.connect_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct','classroom','support','business')),
  title text,
  classroom_id uuid references public.classrooms(id) on delete restrict,
  learner_id uuid references public.learners(id) on delete restrict,
  guardian_profile_id uuid references public.profiles(id) on delete restrict,
  teacher_profile_id uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint connect_classroom_scope_required check (
    kind <> 'classroom'
    or (
      classroom_id is not null
      and learner_id is not null
      and guardian_profile_id is not null
      and teacher_profile_id is not null
    )
  )
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
create unique index if not exists connect_classroom_conversation_unique_idx
  on public.connect_conversations(classroom_id, learner_id, guardian_profile_id)
  where kind='classroom' and archived_at is null;

alter table public.connect_conversations enable row level security;
alter table public.connect_members enable row level security;
alter table public.connect_messages enable row level security;
alter table public.connect_receipts enable row level security;
alter table public.connect_business_accounts enable row level security;
alter table public.connect_business_members enable row level security;

-- Data API access is read-only; all mutation paths remain RPC/server controlled.
revoke all on table public.connect_conversations from anon, authenticated;
revoke all on table public.connect_members from anon, authenticated;
revoke all on table public.connect_messages from anon, authenticated;
revoke all on table public.connect_receipts from anon, authenticated;
revoke all on table public.connect_business_accounts from anon, authenticated;
revoke all on table public.connect_business_members from anon, authenticated;
grant select on table public.connect_conversations to authenticated;
grant select on table public.connect_members to authenticated;
grant select on table public.connect_messages to authenticated;
grant select on table public.connect_receipts to authenticated;
grant select on table public.connect_business_accounts to authenticated;
grant select on table public.connect_business_members to authenticated;

create or replace function public.connect_classroom_relationship_active(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.connect_conversations c
    join public.classrooms cls
      on cls.id = c.classroom_id
     and cls.teacher_profile_id = c.teacher_profile_id
     and cls.active = true
    join public.classroom_members cm
      on cm.classroom_id = c.classroom_id
     and cm.learner_id = c.learner_id
     and cm.status = 'active'
    join public.guardian_learner_links gl
      on gl.learner_id = c.learner_id
     and gl.guardian_profile_id = c.guardian_profile_id
     and gl.verified = true
     and gl.can_receive_class_messages = true
    where c.id = p_conversation_id
      and c.kind = 'classroom'
      and c.archived_at is null
  );
$$;

revoke all on function public.connect_classroom_relationship_active(uuid) from public;
grant execute on function public.connect_classroom_relationship_active(uuid) to authenticated;

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
       join public.connect_conversations c on c.id = cm.conversation_id
       join public.profiles p on p.id = cm.profile_id
       where cm.conversation_id = p_conversation_id
         and cm.profile_id = auth.uid()
         and cm.state in ('active','muted')
         and c.archived_at is null
         and (
           c.kind <> 'classroom'
           or (
             public.connect_classroom_relationship_active(c.id)
             and (
               (c.guardian_profile_id = auth.uid() and p.role = 'parent')
               or (c.teacher_profile_id = auth.uid() and p.role = 'teacher')
             )
           )
         )
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
       join public.connect_conversations c on c.id = cm.conversation_id
       join public.profiles p on p.id = cm.profile_id
       where cm.conversation_id = p_conversation_id
         and cm.profile_id = auth.uid()
         and cm.state = 'active'
         and c.archived_at is null
         and p.role <> 'learner'
         and (
           c.kind <> 'classroom'
           or (
             public.connect_classroom_relationship_active(c.id)
             and (
               (c.guardian_profile_id = auth.uid() and p.role = 'parent')
               or (c.teacher_profile_id = auth.uid() and p.role = 'teacher')
             )
           )
         )
     );
$$;

revoke all on function public.connect_can_send(uuid) from public;
grant execute on function public.connect_can_send(uuid) to authenticated;

create or replace function public.connect_is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and (
       exists (
         select 1
         from public.connect_business_accounts b
         where b.id = p_business_id
           and b.owner_profile_id = auth.uid()
           and b.verification_state <> 'suspended'
       )
       or exists (
         select 1
         from public.connect_business_members bm
         join public.connect_business_accounts b on b.id = bm.business_id
         where bm.business_id = p_business_id
           and bm.profile_id = auth.uid()
           and bm.state = 'active'
           and b.verification_state <> 'suspended'
       )
     );
$$;

revoke all on function public.connect_is_business_member(uuid) from public;
grant execute on function public.connect_is_business_member(uuid) to authenticated;

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
using (public.connect_is_business_member(id));

create policy connect_business_members_select_same_business
on public.connect_business_members
for select to authenticated
using (public.connect_is_business_member(business_id));

-- Preserve existing secure classroom message history inside Connect.
insert into public.connect_conversations(
  id, kind, classroom_id, learner_id, guardian_profile_id, teacher_profile_id,
  created_by, created_at, updated_at
)
select
  t.id, 'classroom', t.classroom_id, t.learner_id, t.guardian_profile_id,
  t.teacher_profile_id, t.teacher_profile_id, t.created_at, t.updated_at
from public.classroom_message_threads t
on conflict (id) do nothing;

insert into public.connect_members(conversation_id, profile_id, member_role, state, joined_at, last_read_at)
select t.id, t.guardian_profile_id, 'member', 'active', t.created_at,
       max(m.read_at) filter (where m.sender_profile_id = t.teacher_profile_id)
from public.classroom_message_threads t
left join public.classroom_messages m on m.thread_id = t.id
where t.guardian_profile_id is not null
group by t.id, t.guardian_profile_id, t.created_at
on conflict (conversation_id, profile_id) do nothing;

insert into public.connect_members(conversation_id, profile_id, member_role, state, joined_at, last_read_at)
select t.id, t.teacher_profile_id, 'member', 'active', t.created_at,
       max(m.read_at) filter (where m.sender_profile_id = t.guardian_profile_id)
from public.classroom_message_threads t
left join public.classroom_messages m on m.thread_id = t.id
where t.teacher_profile_id is not null
group by t.id, t.teacher_profile_id, t.created_at
on conflict (conversation_id, profile_id) do nothing;

insert into public.connect_messages(
  id, conversation_id, sender_profile_id, message_type, body, created_at
)
select m.id, m.thread_id, m.sender_profile_id, 'text', m.body, m.created_at
from public.classroom_messages m
on conflict (id) do nothing;

create or replace function public.get_connect_contacts()
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
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role = 'parent' then
    return query
    select distinct
      c.id, c.name, l.id, l.display_name, gl.guardian_profile_id, gp.display_name,
      c.teacher_profile_id, tp.display_name
    from public.guardian_learner_links gl
    join public.learners l on l.id = gl.learner_id
    join public.classroom_members cm on cm.learner_id = l.id and cm.status = 'active'
    join public.classrooms c on c.id = cm.classroom_id and c.active = true
    join public.profiles gp on gp.id = gl.guardian_profile_id
    join public.profiles tp on tp.id = c.teacher_profile_id
    where gl.guardian_profile_id = auth.uid()
      and gl.verified = true
      and gl.can_receive_class_messages = true
    order by c.name, l.display_name;
  elsif v_role = 'teacher' then
    return query
    select distinct
      c.id, c.name, l.id, l.display_name, gl.guardian_profile_id, gp.display_name,
      c.teacher_profile_id, tp.display_name
    from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id and cm.status = 'active'
    join public.learners l on l.id = cm.learner_id
    join public.guardian_learner_links gl
      on gl.learner_id = l.id
     and gl.verified = true
     and gl.can_receive_class_messages = true
    join public.profiles gp on gp.id = gl.guardian_profile_id
    join public.profiles tp on tp.id = c.teacher_profile_id
    where c.teacher_profile_id = auth.uid()
      and c.active = true
    order by c.name, l.display_name, gl.primary_guardian desc, gp.display_name;
  else
    raise exception 'Connect classroom messaging is available to verified teachers and guardians.';
  end if;
end;
$$;

revoke all on function public.get_connect_contacts() from public;
grant execute on function public.get_connect_contacts() to authenticated;

create or replace function public.get_or_create_connect_classroom_conversation(
  p_classroom_id uuid,
  p_learner_id uuid,
  p_guardian_profile_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.app_role;
  v_teacher uuid;
  v_guardian uuid;
  v_conversation uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid();

  select c.teacher_profile_id into v_teacher
  from public.classrooms c
  join public.classroom_members cm
    on cm.classroom_id = c.id
   and cm.learner_id = p_learner_id
   and cm.status = 'active'
  where c.id = p_classroom_id
    and c.active = true;

  if v_teacher is null then
    raise exception 'Learner is not active in this classroom.';
  end if;

  if v_role = 'parent' then
    v_guardian := auth.uid();
    if not exists (
      select 1
      from public.guardian_learner_links gl
      where gl.guardian_profile_id = v_guardian
        and gl.learner_id = p_learner_id
        and gl.verified = true
        and gl.can_receive_class_messages = true
    ) then
      raise exception 'Class communication is not enabled for this learner.';
    end if;
  elsif v_role = 'teacher' then
    if v_teacher <> auth.uid() then
      raise exception 'You are not authorized to message this classroom.';
    end if;

    v_guardian := p_guardian_profile_id;
    if v_guardian is null then
      select gl.guardian_profile_id into v_guardian
      from public.guardian_learner_links gl
      where gl.learner_id = p_learner_id
        and gl.verified = true
        and gl.can_receive_class_messages = true
      order by gl.primary_guardian desc, gl.created_at
      limit 1;
    end if;

    if v_guardian is null or not exists (
      select 1
      from public.guardian_learner_links gl
      where gl.guardian_profile_id = v_guardian
        and gl.learner_id = p_learner_id
        and gl.verified = true
        and gl.can_receive_class_messages = true
    ) then
      raise exception 'No eligible guardian is available for class communication.';
    end if;
  else
    raise exception 'Connect classroom messaging is available to verified teachers and guardians.';
  end if;

  insert into public.connect_conversations(
    kind, classroom_id, learner_id, guardian_profile_id, teacher_profile_id,
    created_by, updated_at
  ) values (
    'classroom', p_classroom_id, p_learner_id, v_guardian, v_teacher,
    auth.uid(), now()
  )
  on conflict (classroom_id, learner_id, guardian_profile_id)
    where kind = 'classroom' and archived_at is null
  do update set
    teacher_profile_id = excluded.teacher_profile_id,
    updated_at = greatest(public.connect_conversations.updated_at, excluded.updated_at)
  returning id into v_conversation;

  update public.connect_members
  set state = 'left'
  where conversation_id = v_conversation
    and profile_id not in (v_guardian, v_teacher)
    and state <> 'suspended';

  insert into public.connect_members(conversation_id, profile_id, member_role, state)
  values (v_conversation, v_guardian, 'member', 'active')
  on conflict (conversation_id, profile_id) do update
  set member_role = excluded.member_role,
      state = case when public.connect_members.state = 'suspended' then 'suspended' else 'active' end;

  insert into public.connect_members(conversation_id, profile_id, member_role, state)
  values (v_conversation, v_teacher, 'member', 'active')
  on conflict (conversation_id, profile_id) do update
  set member_role = excluded.member_role,
      state = case when public.connect_members.state = 'suspended' then 'suspended' else 'active' end;

  if not public.connect_is_member(v_conversation) then
    raise exception 'This Connect membership is suspended or no longer eligible.';
  end if;

  return v_conversation;
end;
$$;

revoke all on function public.get_or_create_connect_classroom_conversation(uuid,uuid,uuid) from public;
grant execute on function public.get_or_create_connect_classroom_conversation(uuid,uuid,uuid) to authenticated;

create or replace function public.get_connect_threads()
returns table (
  conversation_id uuid,
  kind text,
  title text,
  classroom_id uuid,
  classroom_name text,
  learner_id uuid,
  learner_name text,
  guardian_name text,
  teacher_name text,
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
         c.classroom_id,
         cls.name,
         c.learner_id,
         l.display_name,
         gp.display_name,
         tp.display_name,
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
  left join public.classrooms cls on cls.id = c.classroom_id
  left join public.learners l on l.id = c.learner_id
  left join public.profiles gp on gp.id = c.guardian_profile_id
  left join public.profiles tp on tp.id = c.teacher_profile_id
  left join lateral (
    select m.body, m.created_at
    from public.connect_messages m
    where m.conversation_id = c.id
      and m.deleted_at is null
    order by m.created_at desc
    limit 1
  ) lm on true
  where auth.uid() is not null
    and cm.profile_id = auth.uid()
    and cm.state in ('active','muted')
    and public.connect_is_member(c.id)
  order by coalesce(lm.created_at, c.updated_at) desc;
$$;

revoke all on function public.get_connect_threads() from public;
grant execute on function public.get_connect_threads() to authenticated;

create or replace function public.get_connect_messages(p_conversation_id uuid)
returns table (
  message_id uuid,
  sender_profile_id uuid,
  sender_name text,
  body text,
  message_type text,
  reply_to_message_id uuid,
  created_at timestamptz,
  read_at timestamptz,
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
         (
           select max(r.read_at)
           from public.connect_receipts r
           where r.message_id = m.id
             and r.profile_id <> m.sender_profile_id
         ),
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
    reply_to_message_id
  ) values (
    p_conversation_id,
    auth.uid(),
    v_body,
    p_reply_to_message_id
  ) returning id into v_id;

  insert into public.connect_receipts(message_id, profile_id)
  select v_id, cm.profile_id
  from public.connect_members cm
  where cm.conversation_id = p_conversation_id
    and cm.profile_id <> auth.uid()
    and cm.state in ('active','muted')
  on conflict (message_id, profile_id) do nothing;

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
declare
  v_now timestamptz := now();
begin
  if not public.connect_is_member(p_conversation_id) then
    raise exception 'not authorized';
  end if;

  update public.connect_members
  set last_read_at = v_now
  where conversation_id = p_conversation_id
    and profile_id = auth.uid();

  insert into public.connect_receipts(message_id, profile_id, delivered_at, read_at)
  select m.id, auth.uid(), v_now, v_now
  from public.connect_messages m
  where m.conversation_id = p_conversation_id
    and m.sender_profile_id <> auth.uid()
    and m.deleted_at is null
  on conflict (message_id, profile_id) do update
  set delivered_at = coalesce(public.connect_receipts.delivered_at, excluded.delivered_at),
      read_at = greatest(coalesce(public.connect_receipts.read_at, excluded.read_at), excluded.read_at);
end;
$$;

revoke all on function public.mark_connect_thread_read(uuid) from public;
grant execute on function public.mark_connect_thread_read(uuid) to authenticated;

-- Temporary compatibility RPCs keep the current web client working while the UI names migrate to Connect.
create or replace function public.get_my_message_threads()
returns table (
  thread_id uuid,
  classroom_id uuid,
  classroom_name text,
  learner_id uuid,
  learner_name text,
  guardian_name text,
  teacher_name text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t.conversation_id,
         t.classroom_id,
         t.classroom_name,
         t.learner_id,
         t.learner_name,
         t.guardian_name,
         t.teacher_name,
         t.last_message,
         t.last_message_at,
         t.unread_count
  from public.get_connect_threads() t
  where t.kind = 'classroom';
$$;

revoke all on function public.get_my_message_threads() from public;
grant execute on function public.get_my_message_threads() to authenticated;

create or replace function public.get_or_create_message_thread(
  p_classroom_id uuid,
  p_learner_id uuid,
  p_guardian_profile_id uuid default null
)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.get_or_create_connect_classroom_conversation(
    p_classroom_id,
    p_learner_id,
    p_guardian_profile_id
  );
$$;

revoke all on function public.get_or_create_message_thread(uuid,uuid,uuid) from public;
grant execute on function public.get_or_create_message_thread(uuid,uuid,uuid) to authenticated;

create or replace function public.get_thread_messages(p_thread_id uuid)
returns table (
  message_id uuid,
  sender_profile_id uuid,
  sender_name text,
  body text,
  created_at timestamptz,
  read_at timestamptz,
  sent_by_me boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.mark_connect_thread_read(p_thread_id);

  return query
  select m.message_id,
         m.sender_profile_id,
         m.sender_name,
         m.body,
         m.created_at,
         m.read_at,
         m.sent_by_me
  from public.get_connect_messages(p_thread_id) m;
end;
$$;

revoke all on function public.get_thread_messages(uuid) from public;
grant execute on function public.get_thread_messages(uuid) to authenticated;

create or replace function public.send_thread_message(p_thread_id uuid, p_body text)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.send_connect_message(p_thread_id, p_body, null);
$$;

revoke all on function public.send_thread_message(uuid,text) from public;
grant execute on function public.send_thread_message(uuid,text) to authenticated;

-- Realtime Postgres Changes foundation. Supabase 2026 locks the realtime schema itself;
-- adding application tables to the publication remains the supported path.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'connect_messages'
     ) then
    alter publication supabase_realtime add table public.connect_messages;
  end if;
end;
$$;

commit;
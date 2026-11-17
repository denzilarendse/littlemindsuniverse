-- Isolated, disposable RLS fixture for the LMU room migration.
-- Run ONLY against a local PostgreSQL database:
--   createdb lmu_rooms_test
--   psql -X -v ON_ERROR_STOP=1 -d lmu_rooms_test -f tests/sql/rooms-rls-fixture.sql
-- This is NOT a canonical LMU bootstrap and must NEVER be pointed at production.
begin;

do $$
begin
  if current_database() <> 'lmu_rooms_test' then
    raise exception 'refusing to run: database must be named lmu_rooms_test';
  end if;
  if inet_server_addr() is not null and not (
      inet_server_addr() <<= '127.0.0.0/8'::inet
      or inet_server_addr() <<= '10.0.0.0/8'::inet
      or inet_server_addr() <<= '172.16.0.0/12'::inet
      or inet_server_addr() <<= '192.168.0.0/16'::inet
    ) then
    raise exception 'refusing to run: server address is not loopback';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

create schema if not exists auth;
create or replace function auth.uid()
returns uuid language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.profiles (
  id uuid primary key,
  role text not null default 'parent',
  preferred_language text default 'en'
);
create table public.learners (
  id uuid primary key,
  user_id uuid not null references public.profiles(id),
  active boolean not null default true,
  stage_code text not null default 'EE24',
  home_language text,
  learning_language text
);
create table public.guardian_learner_links (
  guardian_profile_id uuid not null references public.profiles(id),
  learner_id uuid not null references public.learners(id),
  verified boolean not null default false
);
create table public.classrooms (
  id uuid primary key,
  teacher_profile_id uuid not null references public.profiles(id),
  active boolean not null default true
);
create table public.classroom_members (
  classroom_id uuid not null references public.classrooms(id),
  learner_id uuid not null references public.learners(id),
  status text not null
);

-- Mirrors the current production helper from
-- database/migrations/20260920_teacher_learner_read_access.sql.
create or replace function public.can_access_learner(p_learner_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.learners l
      where l.id = p_learner_id
        and l.user_id = auth.uid()
    )
    or exists (
      select 1 from public.guardian_learner_links gl
      where gl.learner_id = p_learner_id
        and gl.guardian_profile_id = auth.uid()
        and gl.verified = true
    )
    or exists (
      select 1
      from public.classroom_members cm
      join public.classrooms c on c.id = cm.classroom_id
      where cm.learner_id = p_learner_id
        and cm.status = 'active'
        and c.teacher_profile_id = auth.uid()
        and c.active = true
    );
$$;

insert into public.profiles(id, role) values
 ('10000000-0000-4000-8000-000000000001','learner'),
 ('10000000-0000-4000-8000-000000000002','learner'),
 ('10000000-0000-4000-8000-000000000003','parent'),
 ('10000000-0000-4000-8000-000000000004','parent'),
 ('10000000-0000-4000-8000-000000000005','teacher'),
 ('10000000-0000-4000-8000-000000000006','teacher');

insert into public.learners(id,user_id) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002');

insert into public.guardian_learner_links(guardian_profile_id,learner_id,verified) values
 ('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001',true),
 ('10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001',false);

insert into public.classrooms(id,teacher_profile_id) values
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000005');
insert into public.classroom_members(classroom_id,learner_id,status) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','active');

\ir ../../database/migrations/20261117_lmu_rooms_read_boundary.sql
\ir ../../database/migrations/20261117_lmu_rooms_activity_write_rpc.sql

insert into public.room_content_items(
 id,room_key,content_key,version,locale,content_type,payload,status,created_by,approved_by,published_at
) values
 ('40000000-0000-4000-8000-000000000001','playworld','fixture-game',1,'en-ZA','game','{"title":"Fixture"}','published',
  '10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000005',now()),
 ('40000000-0000-4000-8000-000000000002','storyverse','draft-story',1,'en-ZA','story','{"title":"Draft"}','draft',
  '10000000-0000-4000-8000-000000000005',null,null);

insert into public.room_activity_events(
 id,learner_id,room_key,content_item_id,event_type,result,actor_profile_id
) values
 ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
  'playworld','40000000-0000-4000-8000-000000000001','activity_completed','{"score":3}',
  '10000000-0000-4000-8000-000000000001'),
 ('50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',
  'playworld','40000000-0000-4000-8000-000000000001','activity_completed','{"score":1}',
  '10000000-0000-4000-8000-000000000002');

-- Learner self: sees only their own event; published catalogue only.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
do $$
begin
  if (select count(*) from public.room_activity_events) <> 1 then
    raise exception 'learner self boundary failed';
  end if;
  if (select count(*) from public.room_content_items) <> 1 then
    raise exception 'published catalogue boundary failed';
  end if;
  perform public.record_room_activity(
    '20000000-0000-4000-8000-000000000001', 'playworld',
    '40000000-0000-4000-8000-000000000001', 'activity_completed',
    '{"score":4,"completed":true}', 120
  );
  if not exists (
    select 1 from public.room_activity_events
    where actor_profile_id = auth.uid()
      and learner_id = '20000000-0000-4000-8000-000000000001'
      and result = '{"score":4,"completed":true}'::jsonb
  ) then
    raise exception 'learner RPC did not derive actor or persist event';
  end if;
  if has_table_privilege(current_user,'public.room_activity_events','INSERT') then
    raise exception 'authenticated role unexpectedly has direct activity INSERT';
  end if;
end $$;
reset role;

-- Verified guardian: sees linked learner event.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
do $
begin
  if (select count(*) from public.room_activity_events) <> 2 then
    raise exception 'verified guardian boundary failed';
  end if;
  begin
    perform public.record_room_activity(
      '20000000-0000-4000-8000-000000000001', 'playworld',
      '40000000-0000-4000-8000-000000000001', 'activity_completed', '{}'::jsonb, null
    );
    raise exception 'guardian unexpectedly wrote as learner';
  exception when insufficient_privilege then
    null;
  end;
end $;
reset role;

-- Unverified guardian: sees no learner event.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',false);
do $$ begin
  if (select count(*) from public.room_activity_events) <> 0 then
    raise exception 'unverified guardian was allowed to read learner event';
  end if;
end $$;
reset role;

-- Active classroom teacher: sees learner in active classroom.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',false);
do $
begin
  if (select count(*) from public.room_activity_events) <> 2 then
    raise exception 'active classroom teacher boundary failed';
  end if;
  begin
    perform public.record_room_activity(
      '20000000-0000-4000-8000-000000000001', 'playworld',
      '40000000-0000-4000-8000-000000000001', 'activity_completed', '{}'::jsonb, null
    );
    raise exception 'teacher unexpectedly wrote as learner';
  exception when insufficient_privilege then
    null;
  end;
end $;
reset role;

-- Unrelated teacher: sees no learner event.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',false);
do $$ begin
  if (select count(*) from public.room_activity_events) <> 0 then
    raise exception 'unrelated teacher was allowed to read learner event';
  end if;
end $$;
reset role;

-- Invalid result metadata and unpublished content are rejected.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
do $
begin
  begin
    perform public.record_room_activity(
      '20000000-0000-4000-8000-000000000001', 'playworld',
      '40000000-0000-4000-8000-000000000001', 'activity_completed',
      '{"free_text":"not allowed"}'::jsonb, null
    );
    raise exception 'free-text result unexpectedly accepted';
  exception when invalid_parameter_value then
    null;
  end;
  begin
    perform public.record_room_activity(
      '20000000-0000-4000-8000-000000000001', 'storyverse',
      '40000000-0000-4000-8000-000000000002', 'activity_completed', '{}'::jsonb, null
    );
    raise exception 'draft content unexpectedly accepted';
  exception when invalid_parameter_value then
    null;
  end;
end $;
reset role;

-- Anonymous has no table SELECT grants.
do $$
begin
  if has_table_privilege('anon','public.room_content_items','SELECT')
     or has_table_privilege('anon','public.room_activity_events','SELECT') then
    raise exception 'anon unexpectedly has SELECT grant';
  end if;
end $$;

rollback;

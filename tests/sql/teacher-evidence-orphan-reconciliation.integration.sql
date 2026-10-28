-- Isolated PostgreSQL runtime contract test for the report-only orphan RPC.
-- This file is run only against the ephemeral PostgreSQL service in GitHub Actions.
\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;

create or replace function auth.role()
returns text language sql stable
as $$ select coalesce(current_setting('request.jwt.claim.role', true), current_user) $$;

create table storage.objects (
  id uuid primary key,
  bucket_id text not null,
  name text not null,
  created_at timestamptz not null,
  metadata jsonb
);

create table public.teacher_chat_evidence (
  id uuid primary key,
  storage_path text not null,
  storage_deleted_at timestamptz
);

-- Apply the exact PR migration against isolated Supabase-shaped fixture tables.
\ir ../../database/migrations/20261029_teacher_chat_evidence_orphan_audit.sql

insert into storage.objects (id, bucket_id, name, created_at, metadata) values
('10000000-0000-0000-0000-000000000001', 'teacher-chat-evidence-quarantine',
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddddd.jpg',
 now() - interval '10 days', '{"size":"1234"}'),
('10000000-0000-0000-0000-000000000002', 'teacher-chat-evidence-quarantine',
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cccccccc-cccc-cccc-cccc-cccccccccccc/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.PDF',
 now() - interval '10 days', '{"size":"bad"}'),
('10000000-0000-0000-0000-000000000003', 'teacher-chat-evidence-quarantine',
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cccccccc-cccc-cccc-cccc-cccccccccccc/ffffffff-ffff-ffff-ffff-ffffffffffff.png',
 now() - interval '1 hour', '{"size":"3"}'),
('10000000-0000-0000-0000-000000000004', 'other-bucket',
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cccccccc-cccc-cccc-cccc-cccccccccccc/11111111-1111-1111-1111-111111111111.png',
 now() - interval '10 days', '{"size":"3"}'),
('10000000-0000-0000-0000-000000000005', 'teacher-chat-evidence-quarantine',
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cccccccc-cccc-cccc-cccc-cccccccccccc/22222222-2222-2222-2222-222222222222.exe',
 now() - interval '10 days', '{"size":"3"}'),
('10000000-0000-0000-0000-000000000006', 'teacher-chat-evidence-quarantine',
 'not-a-uuid/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cccccccc-cccc-cccc-cccc-cccccccccccc/33333333-3333-3333-3333-333333333333.png',
 now() - interval '10 days', '{"size":"3"}'),
('10000000-0000-0000-0000-000000000007', 'teacher-chat-evidence-quarantine',
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cccccccc-cccc-cccc-cccc-cccccccccccc/44444444-4444-4444-4444-444444444444.webp',
 now() - interval '10 days', '{"size":"42"}');

-- Matching metadata protects a path even when the row is soft-deleted.
insert into public.teacher_chat_evidence (id, storage_path, storage_deleted_at)
values ('20000000-0000-0000-0000-000000000001',
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cccccccc-cccc-cccc-cccc-cccccccccccc/44444444-4444-4444-4444-444444444444.webp',
 now() - interval '1 day');

do $$
declare
  candidates text[];
  before_count bigint;
  after_count bigint;
  err text;
begin
  if has_function_privilege('anon', 'public.list_teacher_chat_evidence_orphan_candidates(interval,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.list_teacher_chat_evidence_orphan_candidates(interval,integer)', 'EXECUTE') then
    raise exception 'RPC must not be executable by anon or authenticated';
  end if;
  if not has_function_privilege('service_role', 'public.list_teacher_chat_evidence_orphan_candidates(interval,integer)', 'EXECUTE') then
    raise exception 'RPC must be executable by service_role';
  end if;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  select array_agg(storage_path order by storage_path) into candidates
  from public.list_teacher_chat_evidence_orphan_candidates(interval '7 days', 100);

  if coalesce(array_length(candidates, 1), 0) <> 2 then
    raise exception 'Expected exactly 2 eligible orphan candidates; got %', coalesce(array_length(candidates, 1), 0);
  end if;
  if not exists (select 1 from unnest(candidates) p where p like '%.jpg')
     or not exists (select 1 from unnest(candidates) p where p like '%.PDF') then
    raise exception 'Valid lowercase JPG and uppercase PDF paths should be included';
  end if;
  if exists (select 1 from unnest(candidates) p where p like '%44444444%') then
    raise exception 'Path with metadata row must be protected even when soft-deleted';
  end if;

  if (select count(*) from public.list_teacher_chat_evidence_orphan_candidates(interval '7 days', 1)) > 1 then
    raise exception 'Candidate result limit was not enforced';
  end if;

  begin
    perform * from public.list_teacher_chat_evidence_orphan_candidates(interval '1 hour', 100);
    raise exception 'Minimum age below 24 hours should be rejected';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Minimum age must be between%' then raise; end if;
  end;

  begin
    perform * from public.list_teacher_chat_evidence_orphan_candidates(interval '366 days', 100);
    raise exception 'Minimum age above 365 days should be rejected';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Minimum age must be between%' then raise; end if;
  end;

  begin
    perform * from public.list_teacher_chat_evidence_orphan_candidates(interval '7 days', 101);
    raise exception 'Limit above 100 should be rejected';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Limit must be between%' then raise; end if;
  end;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  begin
    perform * from public.list_teacher_chat_evidence_orphan_candidates(interval '7 days', 100);
    raise exception 'Non-service role should be rejected';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Service role required%' then raise; end if;
  end;

  select count(*) into before_count from storage.objects;
  -- Inventory is read-only; the table contents must remain unchanged after calls.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform * from public.list_teacher_chat_evidence_orphan_candidates(interval '7 days', 100);
  select count(*) into after_count from storage.objects;
  if before_count <> after_count then
    raise exception 'Inventory changed Storage object count';
  end if;
end $$;

select 'PASS: PostgreSQL orphan RPC runtime contract checks' as result;

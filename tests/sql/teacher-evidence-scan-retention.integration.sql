-- Disposable PostgreSQL integration test for scan/retention RPCs.
-- This runs only in GitHub Actions' ephemeral PostgreSQL service. Never point at Supabase production.
\set ON_ERROR_STOP on

create schema if not exists auth;
create schema if not exists storage;

create or replace function auth.role()
returns text language sql stable
as $$ select coalesce(current_setting('request.jwt.claim.role', true), current_user) $$;

create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.profiles (id uuid primary key, role text not null);
create table public.classrooms (id uuid primary key, teacher_profile_id uuid not null, active boolean not null default true);
create table public.classroom_members (classroom_id uuid not null, learner_id uuid not null, status text not null);

create table public.teacher_chat_evidence (
  id uuid primary key, storage_path text not null, mime_type text not null default 'image/png',
  file_size_bytes bigint not null default 8, status text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  scan_completed_at timestamptz, scan_result_code text, reviewed_at timestamptz,
  reviewed_by_profile_id uuid, teacher_profile_id uuid, learner_id uuid, classroom_id uuid, deleted_at timestamptz
);

create table storage.objects (id uuid primary key, bucket_id text not null, name text not null, created_at timestamptz not null default now(), metadata jsonb);

\ir ../../database/migrations/20261028_teacher_chat_evidence_scan_retention.sql

do $$
declare
  v_id uuid := '30000000-0000-0000-0000-000000000001';
  v_scan_token uuid := '40000000-0000-0000-0000-000000000001';
  v_scan_token_2 uuid := '40000000-0000-0000-0000-000000000002';
  v_retention_id uuid := '30000000-0000-0000-0000-000000000002';
  v_retention_token uuid := '50000000-0000-0000-0000-000000000001';
  v_retention_token_2 uuid := '50000000-0000-0000-0000-000000000002';
  v_claimed uuid; v_attempt integer; v_status text; v_ok boolean; v_deadline timestamptz; v_err text;
begin
  if has_function_privilege('anon', 'public.claim_teacher_chat_evidence_scan_candidates(integer,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.claim_teacher_chat_evidence_scan_candidates(integer,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.complete_teacher_chat_evidence_scan(uuid,uuid,text,text,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.complete_teacher_chat_evidence_scan(uuid,uuid,text,text,text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.claim_teacher_chat_evidence_retention_candidates(integer,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.claim_teacher_chat_evidence_retention_candidates(integer,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.finalize_teacher_chat_evidence_retention(uuid,text,uuid,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.finalize_teacher_chat_evidence_retention(uuid,text,uuid,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.release_teacher_chat_evidence_retention_claim(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.release_teacher_chat_evidence_retention_claim(uuid,uuid)', 'EXECUTE') then
    raise exception 'Untrusted role has worker RPC execute permission';
  end if;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  begin
    perform * from public.claim_teacher_chat_evidence_scan_candidates(1, v_scan_token);
    raise exception 'Authenticated role unexpectedly claimed scan work';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err not like 'Service role required%' then raise; end if;
  end;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into public.teacher_chat_evidence(id, storage_path, status, created_at, retention_delete_after)
  values (v_id, 'teacher/class/learner/scan.png', 'pending_scan', now() - interval '2 days', now() + interval '5 days');

  select evidence_id, attempt_number into v_claimed, v_attempt from public.claim_teacher_chat_evidence_scan_candidates(99, v_scan_token);
  if v_claimed <> v_id or v_attempt <> 1 then raise exception 'Scan claim failed to return eligible row with attempt 1'; end if;
  if (select scan_claim_token from public.teacher_chat_evidence where id = v_id) <> v_scan_token then raise exception 'Scan claim token not persisted'; end if;

  begin
    perform public.complete_teacher_chat_evidence_scan(v_id, v_scan_token_2, 'clean', 'test', '1', 'clean');
    raise exception 'Stale scan token unexpectedly finalized';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err not like 'Scan claim is stale%' then raise; end if;
  end;

  v_status := public.complete_teacher_chat_evidence_scan(v_id, v_scan_token, 'unknown', 'test', '1', 'scanner_timeout');
  if v_status <> 'pending_scan' then raise exception 'Unknown verdict should remain pending before attempt cap'; end if;
  if (select scan_claim_token from public.teacher_chat_evidence where id = v_id) is not null then raise exception 'Scan claim not cleared'; end if;
  if (select scan_completed_at from public.teacher_chat_evidence where id = v_id) is not null then raise exception 'Transient unknown scan prematurely completed'; end if;
  if (select scan_attempts from public.teacher_chat_evidence where id = v_id) <> 1 then raise exception 'Scan attempt count incorrect'; end if;

  select evidence_id, attempt_number into v_claimed, v_attempt from public.claim_teacher_chat_evidence_scan_candidates(1, v_scan_token_2);
  if v_claimed <> v_id or v_attempt <> 2 then raise exception 'Scan retry did not increment attempt'; end if;
  v_status := public.complete_teacher_chat_evidence_scan(v_id, v_scan_token_2, 'clean', 'test-engine', 'v1', 'clean');
  if v_status <> 'scan_passed' then raise exception 'Clean verdict should transition to scan_passed'; end if;
  if (select scan_claim_token from public.teacher_chat_evidence where id = v_id) is not null then raise exception 'Successful scan did not clear claim'; end if;
  if (select scan_completed_at from public.teacher_chat_evidence where id = v_id) is null then raise exception 'Successful scan did not set completion timestamp'; end if;
  if (select retention_delete_after from public.teacher_chat_evidence where id = v_id) > (select created_at + interval '30 days' from public.teacher_chat_evidence where id = v_id) then raise exception 'Successful scan exceeded 30-day retention deadline'; end if;

  insert into public.teacher_chat_evidence(id, storage_path, status, created_at, scan_attempts, scan_claimed_at, retention_delete_after)
  values ('30000000-0000-0000-0000-000000000003', 'teacher/class/learner/exhausted.png',
          'pending_scan', now() - interval '2 days', 5, now() - interval '11 minutes', now() + interval '3 days');
  perform * from public.claim_teacher_chat_evidence_scan_candidates(1, '40000000-0000-0000-0000-000000000003');
  if (select status from public.teacher_chat_evidence where id = '30000000-0000-0000-0000-000000000003') <> 'scan_failed' then raise exception 'Expired scan at attempt cap not failed closed'; end if;
  if (select scan_result_code from public.teacher_chat_evidence where id = '30000000-0000-0000-0000-000000000003') <> 'scan_attempts_exhausted' then raise exception 'Exhausted scan result code missing'; end if;
  if (select retention_delete_after from public.teacher_chat_evidence where id = '30000000-0000-0000-0000-000000000003') > now() + interval '1 day 1 minute' then raise exception 'Exhausted scan not given short retention deadline'; end if;

  insert into public.teacher_chat_evidence(id, storage_path, status, created_at, retention_delete_after)
  values (v_retention_id, 'teacher/class/learner/retention.png', 'deleted', now() - interval '40 days', now() - interval '1 day');
  select evidence_id, attempt_number into v_claimed, v_attempt from public.claim_teacher_chat_evidence_retention_candidates(100, v_retention_token);
  if v_claimed <> v_retention_id or v_attempt <> 1 then raise exception 'Retention claim failed with attempt 1'; end if;

  v_ok := public.release_teacher_chat_evidence_retention_claim(v_retention_id, v_retention_token_2);
  if v_ok then raise exception 'Wrong retention token released claim'; end if;
  v_ok := public.release_teacher_chat_evidence_retention_claim(v_retention_id, v_retention_token);
  if not v_ok then raise exception 'Correct retention claim did not release'; end if;
  select retention_next_attempt_at into v_deadline from public.teacher_chat_evidence where id = v_retention_id;
  if v_deadline < now() + interval '9 minutes' or v_deadline > now() + interval '11 minutes' then raise exception 'First retention backoff not ~10 minutes: %', v_deadline; end if;
  if exists (select 1 from public.claim_teacher_chat_evidence_retention_candidates(1, '50000000-0000-0000-0000-000000000003')) then raise exception 'Retention row reclaimed before backoff elapsed'; end if;

  update public.teacher_chat_evidence set retention_next_attempt_at = now() - interval '1 second' where id = v_retention_id;
  select evidence_id, attempt_number into v_claimed, v_attempt from public.claim_teacher_chat_evidence_retention_candidates(1, v_retention_token_2);
  if v_claimed <> v_retention_id or v_attempt <> 2 then raise exception 'Retention retry did not reclaim with attempt 2'; end if;

  v_ok := public.finalize_teacher_chat_evidence_retention(v_retention_id, 'teacher/class/learner/wrong.png', v_retention_token_2, 'retention_due');
  if v_ok then raise exception 'Wrong storage path finalized deletion'; end if;
  v_ok := public.finalize_teacher_chat_evidence_retention(v_retention_id, 'teacher/class/learner/retention.png', v_retention_token, 'retention_due');
  if v_ok then raise exception 'Stale token finalized deletion'; end if;
  v_ok := public.finalize_teacher_chat_evidence_retention(v_retention_id, 'teacher/class/learner/retention.png', v_retention_token_2, 'retention_due');
  if not v_ok then raise exception 'Matching token and path did not finalize'; end if;
  if (select storage_deleted_at from public.teacher_chat_evidence where id = v_retention_id) is null
     or (select retention_claim_token from public.teacher_chat_evidence where id = v_retention_id) is not null
     or (select retention_next_attempt_at from public.teacher_chat_evidence where id = v_retention_id) is not null then raise exception 'Finalization did not audit deletion and clear lease/backoff'; end if;
  v_ok := public.finalize_teacher_chat_evidence_retention(v_retention_id, 'teacher/class/learner/retention.png', v_retention_token_2, 'retention_due');
  if v_ok then raise exception 'Repeated finalization unexpectedly succeeded'; end if;
end $$;

select 'PASS: scan/retention PostgreSQL runtime contract checks' as result;

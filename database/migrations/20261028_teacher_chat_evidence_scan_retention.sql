-- Trusted scan/review gate and retention for teacher-origin quarantined schoolwork.
-- Stage and test only in an isolated Supabase project. Do not apply to production as part of this PR.

alter table public.teacher_chat_evidence
  add column if not exists scan_verdict text,
  add column if not exists scan_engine text,
  add column if not exists scan_engine_version text,
  add column if not exists scan_claim_token uuid,
  add column if not exists scan_claimed_at timestamptz,
  add column if not exists scan_attempts integer not null default 0,
  add column if not exists retention_delete_after timestamptz,
  add column if not exists retention_claim_token uuid,
  add column if not exists retention_claimed_at timestamptz,
  add column if not exists retention_delete_attempts integer not null default 0,
  add column if not exists retention_next_attempt_at timestamptz,
  add column if not exists storage_deleted_at timestamptz,
  add column if not exists deletion_reason text;

update public.teacher_chat_evidence
set retention_delete_after = case
  when status = 'pending_scan' then created_at + interval '7 days'
  when status = 'scan_failed' then coalesce(scan_completed_at, updated_at) + interval '1 day'
  else created_at + interval '30 days'
end
where retention_delete_after is null;

alter table public.teacher_chat_evidence
  alter column retention_delete_after set default (now() + interval '30 days'),
  alter column retention_delete_after set not null;

alter table public.teacher_chat_evidence
  drop constraint if exists teacher_chat_evidence_scan_verdict_check;
alter table public.teacher_chat_evidence
  add constraint teacher_chat_evidence_scan_verdict_check
  check (scan_verdict is null or scan_verdict in ('clean','malicious','invalid','unknown'));

create index if not exists teacher_chat_evidence_scan_queue_idx
  on public.teacher_chat_evidence (created_at)
  where status = 'pending_scan' and scan_claim_token is null;
create index if not exists teacher_chat_evidence_retention_queue_idx
  on public.teacher_chat_evidence (retention_delete_after)
  where storage_deleted_at is null;

-- A worker may claim rows only with the service role. Claim tokens protect against stale/duplicate results.
create or replace function public.claim_teacher_chat_evidence_scan_candidates(
  p_limit integer,
  p_claim_token uuid
) returns table (
  evidence_id uuid,
  storage_path text,
  mime_type text,
  file_size_bytes bigint,
  claim_token uuid,
  attempt_number integer
)
language plpgsql
security definer
set search_path = public
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.';
  end if;
  if p_claim_token is null then raise exception 'Claim token required.'; end if;
  -- A worker can crash after claiming its fifth attempt. Fail closed after the lease expires
  -- instead of leaving the row pending_scan until the seven-day retention deadline.
  update public.teacher_chat_evidence e
  set status = 'scan_failed',
      scan_verdict = 'unknown',
      scan_result_code = 'scan_attempts_exhausted',
      scan_completed_at = coalesce(e.scan_completed_at, now()),
      scan_claim_token = null,
      scan_claimed_at = null,
      retention_delete_after = now() + interval '1 day',
      updated_at = now()
  where e.status = 'pending_scan'
    and e.scan_attempts >= 5
    and (e.scan_claimed_at is null or e.scan_claimed_at < now() - interval '10 minutes')
    and (e.retention_claimed_at is null or e.retention_claimed_at < now() - interval '10 minutes');

  return query
  with candidates as (
    select e.id
    from public.teacher_chat_evidence e
    where e.status = 'pending_scan'
      and e.scan_attempts < 5
      and (e.scan_claimed_at is null or e.scan_claimed_at < now() - interval '10 minutes')
      -- Do not start scanning an item while retention has claimed it for deletion.
      and (e.retention_claimed_at is null or e.retention_claimed_at < now() - interval '10 minutes')
    order by e.created_at
    for update skip locked
    -- One item per invocation keeps the 10-minute lease valid for the 60-second scanner timeout.
    limit 1
  ), claimed as (
    update public.teacher_chat_evidence e
    set scan_claim_token = p_claim_token,
        scan_claimed_at = now(),
        scan_attempts = e.scan_attempts + 1,
        updated_at = now()
    from candidates c
    where e.id = c.id
    returning e.id, e.storage_path, e.mime_type, e.file_size_bytes,
              e.scan_claim_token, e.scan_attempts
  )
  select c.id, c.storage_path, c.mime_type, c.file_size_bytes,
         c.scan_claim_token, c.scan_attempts
  from claimed c;
end;
$function$;

create or replace function public.complete_teacher_chat_evidence_scan(
  p_evidence_id uuid,
  p_claim_token uuid,
  p_verdict text,
  p_engine text,
  p_engine_version text,
  p_result_code text
) returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_attempts integer;
  v_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.';
  end if;
  if p_verdict not in ('clean','malicious','invalid','unknown') then
    raise exception 'Invalid scan verdict.';
  end if;
  select e.scan_attempts into v_attempts
  from public.teacher_chat_evidence e
  where e.id = p_evidence_id
    and e.status = 'pending_scan'
    and e.scan_claim_token = p_claim_token
  for update;
  if not found then raise exception 'Scan claim is stale or no longer available.'; end if;

  v_status := case
    when p_verdict = 'clean' then 'scan_passed'
    when p_verdict in ('malicious','invalid') then 'scan_failed'
    when v_attempts >= 5 then 'scan_failed'
    else 'pending_scan'
  end;

  update public.teacher_chat_evidence
  set status = v_status,
      scan_verdict = p_verdict,
      scan_engine = left(coalesce(p_engine, 'unknown'), 100),
      scan_engine_version = left(coalesce(p_engine_version, 'unknown'), 100),
      scan_result_code = left(coalesce(p_result_code, 'unspecified'), 120),
      scan_completed_at = case when p_verdict = 'unknown' and v_attempts < 5 then scan_completed_at else now() end,
      scan_claim_token = null,
      scan_claimed_at = null,
      retention_delete_after = case
        when v_status = 'scan_failed' then now() + interval '1 day'
        when v_status = 'scan_passed' then created_at + interval '30 days'
        else retention_delete_after
      end,
      updated_at = now()
  where id = p_evidence_id;
  return v_status;
end;
$function$;

-- Teacher approval is distinct from a clean scanner verdict. This RPC does not send data to Milo.
create or replace function public.review_teacher_chat_evidence(p_evidence_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or not exists (
    select 1 from public.profiles p where p.id = v_uid and p.role::text = 'teacher'
  ) then raise exception 'Only a signed-in teacher may review evidence.'; end if;

  update public.teacher_chat_evidence e
  set status = 'teacher_reviewed',
      reviewed_at = now(),
      reviewed_by_profile_id = v_uid,
      retention_delete_after = least(e.retention_delete_after, e.created_at + interval '30 days'),
      updated_at = now()
  where e.id = p_evidence_id
    and e.teacher_profile_id = v_uid
    and e.status = 'scan_passed'
    and exists (
      select 1 from public.classrooms c
      join public.classroom_members cm on cm.classroom_id = c.id and cm.learner_id = e.learner_id
      where c.id = e.classroom_id
        and c.teacher_profile_id = v_uid
        and c.active = true
        and cm.status::text = 'active'
    )
  returning e.id into v_id;
  if v_id is null then raise exception 'Evidence is not scan-passed or available to this teacher.'; end if;
  return v_id;
end;
$function$;

create or replace function public.claim_teacher_chat_evidence_retention_candidates(
  p_limit integer,
  p_claim_token uuid
) returns table (
  evidence_id uuid,
  storage_path text,
  delete_reason text,
  claim_token uuid,
  attempt_number integer
)
language plpgsql
security definer
set search_path = public
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.';
  end if;
  if p_claim_token is null then raise exception 'Claim token required.'; end if;
  return query
  with candidates as (
    select e.id
    from public.teacher_chat_evidence e
    where e.storage_deleted_at is null
      and (e.retention_claimed_at is null or e.retention_claimed_at < now() - interval '10 minutes')
      and coalesce(e.retention_next_attempt_at, '-infinity'::timestamptz) <= now()
      and (
        e.status = 'deleted'
        or e.retention_delete_after <= now()
      )
      and (
        e.status <> 'pending_scan'
        or e.scan_claimed_at is null
        or e.scan_claimed_at < now() - interval '10 minutes'
      )
    order by e.retention_delete_after nulls first, e.created_at
    for update skip locked
    -- One item per invocation avoids lease expiry while storage deletion/finalization is sequential.
    limit 1
  ), claimed as (
    update public.teacher_chat_evidence e
    set retention_claim_token = p_claim_token,
        retention_claimed_at = now(),
        retention_delete_attempts = e.retention_delete_attempts + 1,
        updated_at = now()
    from candidates c
    where e.id = c.id
    returning e.id, e.storage_path, e.status, e.retention_claim_token,
              e.retention_delete_attempts
  )
  select c.id, c.storage_path,
         case when c.status = 'deleted' then 'teacher_requested_delete' else 'retention_due' end,
         c.retention_claim_token, c.retention_delete_attempts
  from claimed c;
end;
$function$;

create or replace function public.finalize_teacher_chat_evidence_retention(
  p_evidence_id uuid,
  p_storage_path text,
  p_claim_token uuid,
  p_reason text
) returns boolean
language plpgsql
security definer
set search_path = public
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.';
  end if;
  update public.teacher_chat_evidence
  set status = 'deleted',
      deleted_at = coalesce(deleted_at, now()),
      deletion_reason = left(coalesce(p_reason, 'retention_due'), 80),
      storage_deleted_at = now(),
      retention_claim_token = null,
      retention_claimed_at = null,
      retention_next_attempt_at = null,
      updated_at = now()
  where id = p_evidence_id
    and storage_path = p_storage_path
    and retention_claim_token = p_claim_token
    and storage_deleted_at is null;
  return found;
end;
$function$;

create or replace function public.release_teacher_chat_evidence_retention_claim(
  p_evidence_id uuid,
  p_claim_token uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_attempts integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.';
  end if;
  update public.teacher_chat_evidence
  set retention_claim_token = null,
      retention_claimed_at = null,
      retention_next_attempt_at = now() + make_interval(
        mins => least(1440, greatest(5, 5 * power(2, least(retention_delete_attempts, 8))::integer))
      ),
      updated_at = now()
  where id = p_evidence_id
    and retention_claim_token = p_claim_token
    and storage_deleted_at is null;
  return found;
end;
$function$;

revoke all on function public.claim_teacher_chat_evidence_scan_candidates(integer,uuid) from public, anon, authenticated;
revoke all on function public.complete_teacher_chat_evidence_scan(uuid,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.claim_teacher_chat_evidence_retention_candidates(integer,uuid) from public, anon, authenticated;
revoke all on function public.finalize_teacher_chat_evidence_retention(uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.release_teacher_chat_evidence_retention_claim(uuid,uuid) from public, anon, authenticated;
revoke all on function public.review_teacher_chat_evidence(uuid) from public, anon;
grant execute on function public.claim_teacher_chat_evidence_scan_candidates(integer,uuid) to service_role;
grant execute on function public.complete_teacher_chat_evidence_scan(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.claim_teacher_chat_evidence_retention_candidates(integer,uuid) to service_role;
grant execute on function public.finalize_teacher_chat_evidence_retention(uuid,text,uuid,text) to service_role;
grant execute on function public.release_teacher_chat_evidence_retention_claim(uuid,uuid) to service_role;
grant execute on function public.review_teacher_chat_evidence(uuid) to authenticated;


-- Keep deadlines consistent for new rows and status transitions, including rows created after this migration.
create or replace function public.set_teacher_chat_evidence_retention_deadline()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending_scan' then
      new.retention_delete_after := new.created_at + interval '7 days';
    elsif new.status = 'scan_failed' then
      new.retention_delete_after := now() + interval '1 day';
    elsif new.status in ('scan_passed','teacher_reviewed') then
      new.retention_delete_after := new.created_at + interval '30 days';
    end if;
  elsif new.status is distinct from old.status then
    if new.status = 'pending_scan' then
      new.retention_delete_after := new.created_at + interval '7 days';
    elsif new.status = 'scan_failed' then
      new.retention_delete_after := now() + interval '1 day';
    elsif new.status in ('scan_passed','teacher_reviewed') then
      new.retention_delete_after := new.created_at + interval '30 days';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists teacher_chat_evidence_retention_deadline on public.teacher_chat_evidence;
create trigger teacher_chat_evidence_retention_deadline
before insert or update of status on public.teacher_chat_evidence
for each row execute function public.set_teacher_chat_evidence_retention_deadline();

create or replace function public.count_due_teacher_chat_evidence_retention_candidates()
returns bigint
language sql
security definer
set search_path = public
as $function$
  select count(*)::bigint
  from public.teacher_chat_evidence e
  where e.storage_deleted_at is null
    and (e.retention_claimed_at is null or e.retention_claimed_at < now() - interval '10 minutes')
    and coalesce(e.retention_next_attempt_at, '-infinity'::timestamptz) <= now()
    and (
      e.status = 'deleted'
      or e.retention_delete_after <= now()
    )
    and (
      e.status <> 'pending_scan'
      or e.scan_claimed_at is null
      or e.scan_claimed_at < now() - interval '10 minutes'
    );
$function$;

revoke all on function public.count_due_teacher_chat_evidence_retention_candidates() from public, anon, authenticated;
grant execute on function public.count_due_teacher_chat_evidence_retention_candidates() to service_role;

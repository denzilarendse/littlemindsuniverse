#!/usr/bin/env bash
set -euo pipefail

# Requires the disposable PostgreSQL fixture/migration from the preceding workflow step.
# Uses two independent psql sessions to exercise actual row-lock contention. No Storage API
# is called and this script must only run against the ephemeral CI database.
scan_id='31000000-0000-0000-0000-000000000001'
scan_a='41000000-0000-0000-0000-000000000001'
scan_b='41000000-0000-0000-0000-000000000002'
retention_id='32000000-0000-0000-0000-000000000001'
retention_a='51000000-0000-0000-0000-000000000001'
retention_b='51000000-0000-0000-0000-000000000002'
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

psqlq() { psql -X -q -A -t -v ON_ERROR_STOP=1 "$@"; }
role_sql="SET request.jwt.claim.role = 'service_role';"

psqlq -c "INSERT INTO public.teacher_chat_evidence
(id, storage_path, status, created_at, retention_delete_after)
VALUES ('$scan_id', 'teacher/class/learner/concurrent-scan.png', 'pending_scan',
        now() - interval '2 days', now() + interval '5 days');"

# Session A claims the row and deliberately holds its transaction/row lock while session B races.
psqlq -c "BEGIN; $role_sql SELECT evidence_id FROM public.claim_teacher_chat_evidence_scan_candidates(1, '$scan_a'); SELECT pg_sleep(4); COMMIT;" >"$tmpdir/scan-a.out" &
pid_a=$!
sleep 1
scan_b_out="$(psqlq -c "$role_sql SELECT evidence_id FROM public.claim_teacher_chat_evidence_scan_candidates(1, '$scan_b');")"
wait "$pid_a"
grep -q "$scan_id" "$tmpdir/scan-a.out" || { echo 'FAIL: scan worker A did not claim fixture'; exit 1; }
[[ -z "$scan_b_out" ]] || { echo "FAIL: concurrent scan worker B also claimed a row: $scan_b_out"; exit 1; }
[[ "$(psqlq -c "SELECT scan_claim_token FROM public.teacher_chat_evidence WHERE id='$scan_id';")" == "$scan_a" ]] || { echo 'FAIL: scan claim token not retained for worker A'; exit 1; }

# Simulate worker A crashing: after the 10-minute lease expires, worker B must recover the row.
psqlq -c "UPDATE public.teacher_chat_evidence SET scan_claimed_at=now()-interval '11 minutes' WHERE id='$scan_id';"
scan_recovery="$(psqlq -c "$role_sql SELECT evidence_id::text || '|' || attempt_number::text FROM public.claim_teacher_chat_evidence_scan_candidates(1, '$scan_b');")"
[[ "$scan_recovery" == "$scan_id|2" ]] || { echo "FAIL: expired scan lease not recovered as attempt 2: $scan_recovery"; exit 1; }
if stale_scan="$(psqlq -c "$role_sql SELECT public.complete_teacher_chat_evidence_scan('$scan_id', '$scan_a', 'clean', 'test', '1', 'stale_worker');" 2>&1)"; then
  echo 'FAIL: stale scan worker unexpectedly completed after lease recovery'; exit 1
else
  grep -q 'Scan claim is stale' <<<"$stale_scan" || { echo "FAIL: unexpected stale scan rejection: $stale_scan"; exit 1; }
fi
psqlq -c "$role_sql SELECT public.complete_teacher_chat_evidence_scan('$scan_id', '$scan_b', 'clean', 'test', '1', 'recovered_worker');" >/dev/null

psqlq -c "INSERT INTO public.teacher_chat_evidence
(id, storage_path, status, created_at, retention_delete_after)
VALUES ('$retention_id', 'teacher/class/learner/concurrent-retention.png', 'deleted',
        now() - interval '40 days', now() - interval '1 day');"

# Repeat the real lock-contention check for retention claims.
psqlq -c "BEGIN; $role_sql SELECT evidence_id FROM public.claim_teacher_chat_evidence_retention_candidates(1, '$retention_a'); SELECT pg_sleep(4); COMMIT;" >"$tmpdir/retention-a.out" &
pid_a=$!
sleep 1
retention_b_out="$(psqlq -c "$role_sql SELECT evidence_id FROM public.claim_teacher_chat_evidence_retention_candidates(1, '$retention_b');")"
wait "$pid_a"
grep -q "$retention_id" "$tmpdir/retention-a.out" || { echo 'FAIL: retention worker A did not claim fixture'; exit 1; }
[[ -z "$retention_b_out" ]] || { echo "FAIL: concurrent retention worker B also claimed a row: $retention_b_out"; exit 1; }
[[ "$(psqlq -c "SELECT retention_claim_token FROM public.teacher_chat_evidence WHERE id='$retention_id';")" == "$retention_a" ]] || { echo 'FAIL: retention claim token not retained for worker A'; exit 1; }

# Simulate a crash after external deletion but before metadata finalization. This is a state-machine
# test only: no real Storage delete occurs. The stale lease must not finalize; recovery may retry.
stale_finalize="$(psqlq -c "$role_sql SELECT public.finalize_teacher_chat_evidence_retention('$retention_id', 'teacher/class/learner/concurrent-retention.png', '$retention_b', 'retention_due');")"
[[ "$stale_finalize" == "f" ]] || { echo 'FAIL: non-owner finalized retention'; exit 1; }
psqlq -c "UPDATE public.teacher_chat_evidence SET retention_claimed_at=now()-interval '11 minutes' WHERE id='$retention_id';"
retention_recovery="$(psqlq -c "$role_sql SELECT evidence_id || '|' || attempt_number FROM public.claim_teacher_chat_evidence_retention_candidates(1, '$retention_b');")"
[[ "$retention_recovery" == "$retention_id|2" ]] || { echo "FAIL: expired retention lease not recovered as attempt 2: $retention_recovery"; exit 1; }
stale_release="$(psqlq -c "$role_sql SELECT public.release_teacher_chat_evidence_retention_claim('$retention_id', '$retention_a');")"
[[ "$stale_release" == "f" ]] || { echo 'FAIL: stale retention worker released recovered lease'; exit 1; }
finalized="$(psqlq -c "$role_sql SELECT public.finalize_teacher_chat_evidence_retention('$retention_id', 'teacher/class/learner/concurrent-retention.png', '$retention_b', 'retention_due');")"
[[ "$finalized" == "t" ]] || { echo 'FAIL: recovered retention worker could not finalize matching path/token'; exit 1; }

echo 'PASS: concurrent scan/retention claims are exclusive; expired leases recover; stale worker tokens are rejected.'

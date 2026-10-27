# Teacher–Milo schoolwork quarantine: scanner and retention design

**Status:** Design only; not an implementation or release approval.  
**Applies to:** PR #98 and its `teacher-chat-evidence-quarantine` bucket / `teacher_chat_evidence` table.  
**Production changes:** None authorized or performed.

## Current verified state

- PR #98 adds private storage and metadata with new uploads defaulting to `pending_scan`.
- The current registration RPC checks teacher role, classroom ownership and active membership, storage path/object ownership, declared MIME/extension and size. These checks do not inspect file bytes and are not a malware scan.
- No scanner/review worker is implemented for this new table. The current browser does not send quarantined files to Milo or treat them as mastery evidence.
- The production Supabase project has an active `lmu-retention-cleanup` Edge Function scheduled every 15 minutes. Its current implementation only removes due objects from `learner-evidence-private` using `learner_evidence_items`, `claim_due_evidence_retention_candidates`, and `mark_evidence_raw_deleted`. It does **not** process `teacher_chat_evidence` or `teacher-chat-evidence-quarantine`.
- No Supabase development branches are currently listed for the production project. The separately named LMU staging project is inactive. The new migration has not been applied or runtime-tested in staging.
- A passing GitHub workflow is not equivalent to a deployed scanner, scheduled retention for this bucket, or a production release.

## 1. Fail-closed scanning architecture

### Trust boundary

Use a server-side scanner adapter and a trusted scanning engine, preferably a self-hosted/private ClamAV-compatible service in an approved environment. A managed scanner is acceptable only after privacy/data-processing, region, retention and subprocessors are explicitly approved. Do not use public malware-upload services or send student schoolwork to third-party AI providers as a shortcut.

The browser must never decide a file is safe. Declared MIME, filename extension, file size, browser preview, and client-side checks are only preliminary validation.

### Processing flow

1. Teacher uploads to the private quarantine bucket. Registration records provenance and creates `pending_scan`.
2. A server-only worker claims a pending row with a short lease/claim token, reads the object using service credentials, and sends only the file bytes plus a random job ID to the configured private scanner.
3. Scanner checks actual file signatures (magic bytes), type/parser consistency, malware signatures, malformed documents, embedded active content where supported, and resource/expansion limits. Reject archives and unsupported types unless a separately reviewed parser/scan policy exists.
4. Store a minimal result: verdict, stable result code, scanner engine/version/signature timestamp, completion timestamp, and a non-sensitive job correlation ID. Never log file bytes, document text, student names, tokens, or signed URLs.
5. If the scanner times out, is unavailable, returns an unknown verdict, or fails validation, leave the file unavailable for analysis and retry with a bounded retry policy. Unknown is **not** clean.
6. Only a server-side RPC callable by the service role may transition a row from `pending_scan` to `scan_passed` or `scan_failed`. Reject stale claim tokens and duplicate/late results. Authenticated users must not update status or scan metadata directly.
7. `scan_passed` means only that the scanner returned an acceptable verdict; it does not authorize sending the file to Milo. A separate authorized teacher-review/action gate must check classroom/learner access, source provenance, privacy/consent requirements and approved AI data-processing policy. Only that gate may issue a short-lived private object URL or stream bytes to an approved analysis worker.
8. Scanner failure, quarantine, teacher review, deletion, and any later analysis should be auditable without storing sensitive document contents in logs.

### Required status/transition contract

- `pending_scan -> scan_passed` only after a trusted, current, explicit clean verdict.
- `pending_scan -> scan_failed` on a confirmed malicious/invalid verdict.
- `pending_scan -> deleted` through authorized teacher deletion or retention cleanup.
- `scan_passed -> teacher_reviewed` only through a separately authorized server-side teacher action.
- `scan_failed` must never be made analysis-eligible by a client action.
- A scanner timeout/unknown result stays unavailable; it must not silently transition to `scan_passed`.
- Teacher review must not overwrite the scanner result, and scan results must not create mastery evidence by themselves.

## 2. Retention and cleanup

Reuse the existing retention security pattern (service-only scheduled worker, Vault-backed scheduler secret, bounded batches, claim tokens, idempotent deletes, and release/retry on failure), but do not assume the existing worker covers the new bucket. The existing scheduled function is scoped to the learner evidence bucket and table.

Before coding the retention migration, confirm and document the approved retention policy for teacher-origin schoolwork. A conservative proposed baseline for review—not yet approved—is:
- pending/unscanned items: expire after 7 days;
- confirmed scan failures: purge promptly after recording the minimal audit result, with a short operational window for retries/investigation;
- scanned but unused items: expire no later than 30 days after upload;
- teacher-reviewed files: expire within the same 30-day maximum unless a separately approved, explicitly linked educational record policy requires another period.

The final policy must specify what happens when deletion is partially successful, how long minimal audit metadata remains, and whether any file can be retained as an explicitly submitted educational record. Do not silently extend retention because a cleanup run failed.

### Cleanup implementation contract

- Add explicit `retention_delete_after`, claim token/time, deletion timestamp/reason and bounded retry metadata for teacher-chat evidence (or an equivalent safe, idempotent claim model).
- Use a server-side `FOR UPDATE SKIP LOCKED` claim RPC with a bounded limit and lease expiry. The scheduled worker must authenticate independently of user sessions and use service credentials only server-side.
- Delete only from `teacher-chat-evidence-quarantine`; never accept a client-supplied bucket name or arbitrary storage path.
- Delete object first, then finalize metadata with the matching claim token. If object deletion succeeds but metadata finalization fails, the next run must safely recognize the missing object and finish metadata cleanup. If deletion fails, release/retry the claim and alert without exposing the object.
- Provide a dry-run that claims and releases candidates without deleting, plus a report containing counts and non-sensitive failure stages.
- Schedule through the existing trusted scheduler only after the worker and migration are deployed and tested in staging. Do not modify the current production cron or worker as part of this design-only change.

## 3. Staging verification gate

The production project is `zcokxljcsfkrlouzragv`; do not apply the migration there for testing. The existing `LittleMindsUniverse-a03b6b7e` project is currently inactive, and the production project reports no development branches. Reactivating a project or creating a paid branch requires an explicit cost/availability check and owner approval.

Use an isolated active staging project with no production learner data. Before applying the migration, confirm its current migration history and schema compatibility. Then test:

- valid supported file with a clean scanner result;
- extension/MIME mismatch, fake signature, malformed PDF/image, oversized input and malware test fixture;
- scanner timeout, unknown verdict, duplicate callback and stale claim token (all remain unavailable);
- authenticated user cannot set scan status, view another teacher's file, read storage directly, or bypass teacher review;
- owner teacher can register/delete only for an active learner in their own active classroom;
- unrelated teacher, learner, guardian and cross-class/org access are denied;
- retention dry-run, expired pending item, scan failure, object-missing case, storage deletion error, metadata-finalization error, retry and idempotent second run;
- logs contain no document content, tokens, signed URLs or unnecessary child identifiers;
- a scanned file is not sent to Milo and creates no mastery evidence before the separate approved analysis gate.

Record staging project/ref, migration checksum, test identities/roles, exact queries and results, and any failures. Do not use real schoolwork during this test.

## 4. Release gates

Keep PR #98 draft and unmerged until all are true:

- scanner engine/provider and privacy/data-processing terms approved;
- fail-closed server-side scan worker and server-only verdict transition are implemented;
- teacher-review/analysis gate is enforced server-side;
- retention policy approved, cleanup worker implemented and scheduled safely;
- migration applied and tested only in isolated staging;
- authorized/unauthorized integration and retention failure tests pass;
- Android Chrome camera, upload, dictation, microphone cleanup and export behavior is tested on a real device;
- CI passes for the exact final head and the PR is reviewed.

This document deliberately does not enable analysis, alter production, apply a migration, create/restore a cloud project, or choose an external scanner vendor.

# Teacher evidence scanner and retention worker implementation notes

**State:** isolated implementation branch; not deployed. The scanner and cleanup workers are intentionally not active in any Supabase project.

## Worker files

- `supabase/functions/teacher-chat-evidence-scan/index.ts`
- `supabase/functions/teacher-chat-evidence-retention/index.ts`
- `database/migrations/20261028_teacher_chat_evidence_scan_retention.sql`

Both workers require POST and the existing scheduler header `x-lmu-cron-secret`; they validate it with `verify_lmu_retention_secret`. They use server-only Supabase credentials, claim tokens, short leases, and avoid logging file contents, filenames, scanner response bodies or secrets. The scan worker claims one item per invocation: its lease is 10 minutes and scanner requests have a 60-second timeout, so larger sequential batches could let later items' leases expire before processing.

## Scanner adapter contract

The scanner is an explicit dependency and is **not included or configured by this change**. Before the scan function can run, configure these server-side Edge Function secrets through the provider's secure secret mechanism:

- `LMU_CONTENT_SCANNER_URL`: HTTPS base URL, no credentials, query or fragment. Worker posts to `<base>/scan`.
- `LMU_CONTENT_SCANNER_TOKEN`: scanner bearer token. Never expose this to the browser or commit it.
- Existing `SUPABASE_URL`, service-role/secret key, and scheduler secret verification must already work.

Request:
- Method: POST
- Content-Type: `application/octet-stream`
- Body: exact file bytes, maximum 20 MiB
- Headers: `Authorization: Bearer <server token>`, `x-lmu-content-type`, `x-lmu-content-sha256`, and random `x-lmu-job-id`

Response JSON, maximum 4 KiB:
```json
{
  "verdict": "clean",
  "sha256": "<lowercase SHA-256 of the exact request bytes>",
  "engine": "scanner-name",
  "version": "signature-database-version",
  "resultCode": "clean"
}
```

Only exact `verdict: clean` plus a matching SHA-256 permits the worker to mark `scan_passed`. `malicious` and `invalid` fail the file. Missing/mismatched hash, unknown verdict, timeout, HTTP error, malformed response or network error is unknown/unavailable and cannot mark the file safe. A maximum of five attempts leads to `scan_failed` and a short cleanup deadline. This worker also checks file signatures, stored size and the allowlist before sending bytes to the scanner.

The chosen scanner must be a trusted private service with documented file-size limits, parser/archive-bomb protection, malware signatures, no content retention beyond processing, and approved privacy/data-processing terms for children's work. Do not use public upload-to-scan sites or third-party AI analysis as a substitute. This repository change does not establish those assurances by itself.

## Status and analysis boundary

- Upload registration starts at `pending_scan`.
- Only the service-role scanner worker may set `scan_passed` / `scan_failed`.
- `review_teacher_chat_evidence` lets the authorized teacher move their own clean item to `teacher_reviewed`.
- Neither scan completion nor teacher review sends the file to Milo or creates mastery evidence. A separately reviewed analysis endpoint is still required before any AI analysis can be enabled.
- Authenticated clients have no direct UPDATE grant on the evidence table.

## Retention behavior

- Pending items expire after 7 days.
- Scan failures expire after 1 day.
- Scan-passed or teacher-reviewed items expire no later than 30 days after creation.
- Teacher-deleted items whose storage removal failed are retried because the metadata row remains with `status = deleted` and no `storage_deleted_at`.
- Cleanup claims are lease-based and idempotent. The worker claims one item per invocation because storage deletion and metadata finalization are sequential and the lease is 10 minutes; batching is deferred until runtime evidence supports safe lease renewal or concurrency. Storage deletion is attempted before metadata finalization; failures release the claim with exponential backoff, while finalization failures can be retried after the lease expires.
- The cleanup worker supports a read-only dry run through the service-only count RPC.

These are proposed technical defaults pending product/privacy-policy approval. They must be reviewed against legal retention obligations before real student work is used.

## Required staging test sequence

1. Use an isolated active Supabase development branch/project with no production learner data. Confirm its project ref and migration history first.
2. Apply the existing quarantine migration followed by the new scan/retention migration in staging only.
3. Verify SQL functions, triggers, constraints and grants compile and run; test direct authenticated UPDATE and direct RPC misuse are denied.
4. Configure a private scanner test endpoint with clean, malicious, invalid, unknown, timeout, malformed-response and hash-mismatch fixtures. Never use real child data for these tests.
5. Test JPEG/PNG/WebP/PDF signatures, MIME/extension mismatch, oversized object, missing object and scanner outages. Unknown must never become scan-passed.
6. Test active teacher versus unrelated teacher/learner/guardian and cross-class access. Review must require the original teacher and active class membership.
7. Test retention dry run, expired pending, scan failure, teacher deletion, already-missing object, storage failure, metadata finalization failure, claim expiry, retry backoff and second-run idempotency.
8. Verify no file bytes, filenames, student content, credentials or signed URLs appear in logs.
9. Only after all tests pass, review scanner privacy terms, migration diff and CI evidence. Do not deploy functions, set cron schedules or merge to production from this branch.

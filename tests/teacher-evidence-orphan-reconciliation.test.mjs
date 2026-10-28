import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../database/migrations/20261029_teacher_chat_evidence_orphan_audit.sql", import.meta.url), "utf8");
const upload = await readFile(new URL("../assets/teacher-milo-evidence.js", import.meta.url), "utf8");
const quarantine = await readFile(new URL("../database/migrations/20261027_teacher_chat_evidence_quarantine.sql", import.meta.url), "utf8");
const retention = await readFile(new URL("../database/migrations/20261028_teacher_chat_evidence_scan_retention.sql", import.meta.url), "utf8");

test("orphan reconciliation is inventory-only and has no destructive Storage operation", () => {
  assert.match(migration, /Non-destructive reconciliation inventory/);
  assert.match(migration, /list_teacher_chat_evidence_orphan_candidates/);
  assert.doesNotMatch(migration, /delete from storage\.objects/i);
  assert.doesNotMatch(migration, /update storage\.objects/i);
  assert.doesNotMatch(migration, /pg_cron|cron\.schedule|delete_teacher_chat_evidence|claim_teacher_chat_evidence_retention_candidates/i);
});

test("candidate enumeration is restricted to service_role", () => {
  assert.match(migration, /coalesce\(auth\.role\(\), ''\) <> 'service_role'/);
  assert.match(migration, /revoke all on function public\.list_teacher_chat_evidence_orphan_candidates\(interval, integer\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.list_teacher_chat_evidence_orphan_candidates\(interval, integer\) to service_role/);
});

test("only the quarantine bucket and the upload UI generated path shape are eligible", () => {
  assert.match(migration, /o\.bucket_id = 'teacher-chat-evidence-quarantine'/);
  assert.ok(migration.includes("o.name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/"));
  assert.ok(migration.includes("(jpg|jpeg|png|webp|pdf)$'"));
  assert.ok(upload.includes("ctx.userId + '/' + classroomId + '/' + learnerId + '/' + evidenceId"));
  assert.ok(quarantine.includes("teacher-chat-evidence-quarantine"));
});

test("minimum age and candidate count are bounded", () => {
  assert.match(migration, /p_min_age < interval '24 hours'/);
  assert.match(migration, /p_min_age > interval '365 days'/);
  assert.match(migration, /p_limit < 1 or p_limit > 100/);
  assert.match(migration, /o\.created_at < now\(\) - p_min_age/);
  assert.match(migration, /limit p_limit/);
});

test("any metadata row protects an object, including soft-deleted evidence", () => {
  assert.match(migration, /not exists \([\s\S]*?from public\.teacher_chat_evidence e[\s\S]*?where e\.storage_path = o\.name[\s\S]*?\)/);
  assert.match(retention, /storage_deleted_at is null/);
  assert.doesNotMatch(migration, /alter table public\.teacher_chat_evidence disable row level security/i);
  assert.doesNotMatch(migration, /drop policy|create policy|grant select on storage\.objects to authenticated/i);
});

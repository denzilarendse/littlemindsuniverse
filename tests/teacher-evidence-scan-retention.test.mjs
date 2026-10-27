import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const scan = await readFile(new URL("../supabase/functions/teacher-chat-evidence-scan/index.ts", import.meta.url), "utf8");
const retention = await readFile(new URL("../supabase/functions/teacher-chat-evidence-retention/index.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../database/migrations/20261028_teacher_chat_evidence_scan_retention.sql", import.meta.url), "utf8");
const supabaseConfig = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");

test("scheduler-only workers disable gateway JWT only while retaining handler-level secret verification", () => {
  assert.match(supabaseConfig, /\[functions\.teacher-chat-evidence-scan\][\s\S]*?verify_jwt = false/);
  assert.match(supabaseConfig, /\[functions\.teacher-chat-evidence-retention\][\s\S]*?verify_jwt = false/);
  assert.match(scan, /x-lmu-cron-secret/);
  assert.match(retention, /x-lmu-cron-secret/);
  assert.match(scan, /verify_lmu_retention_secret/);
  assert.match(retention, /verify_lmu_retention_secret/);
});

test("scanner fails closed when private scanner configuration is absent", () => {
  assert.match(scan, /!scannerUrl \|\| !scannerToken/);
  assert.match(scan, /server_not_configured/);
  assert.match(scan, /scanner\.protocol !== "https:"/);
});

test("scanner verifies file signature, size, SHA-256 and exact clean verdict", () => {
  assert.match(scan, /matchesSignature\(bytes, mime\)/);
  assert.match(scan, /file\.size !== expectedSize/);
  assert.match(scan, /x-lmu-content-sha256/);
  assert.match(scan, /result\.sha256\?\.toLowerCase\(\) !== hash/);
  assert.match(scan, /result\.verdict === "clean"/);
  assert.match(scan, /result\.verdict === "malicious"/);
  assert.match(scan, /result\.verdict === "invalid"/);
  assert.match(scan, /"unknown"/);
});

test("scanner uses scheduler authorization, bounded batches and claim-token finalization", () => {
  assert.match(scan, /verify_lmu_retention_secret/);
  assert.match(scan, /claim_teacher_chat_evidence_scan_candidates/);
  assert.match(scan, /complete_teacher_chat_evidence_scan/);
  assert.match(scan, /Math\.min\([^\n]*25\)/);
  assert.match(scan, /redirect: "error"/);
  assert.match(scan, /60_000/);
  assert.match(scan, /readBoundedResponseText/);
  assert.match(scan, /total > maxBytes/);
  assert.doesNotMatch(scan, /await\s+response\.text\s*\(/);
});

test("retention worker has read-only dry run and idempotent storage cleanup", () => {
  assert.match(retention, /count_due_teacher_chat_evidence_retention_candidates/);
  assert.match(retention, /claim_teacher_chat_evidence_retention_candidates/);
  assert.match(retention, /finalize_teacher_chat_evidence_retention/);
  assert.match(retention, /release_teacher_chat_evidence_retention_claim/);
  assert.match(retention, /supabase\.storage\.from\(BUCKET\)\.remove\(\[storagePath\]\)/);
  assert.match(retention, /teacher-chat-evidence-quarantine/);
});

test("database keeps scan and retention mutation service-only and teacher review explicit", () => {
  assert.match(migration, /from public, anon, authenticated/);
  assert.match(migration, /to service_role/);
  assert.match(migration, /review_teacher_chat_evidence/);
  assert.match(migration, /p\.role::text = 'teacher'/);
  assert.match(migration, /for update skip locked/i);
  assert.ok(migration.includes("and (e.retention_claimed_at is null or e.retention_claimed_at < now() - interval '10 minutes')"));
});

test("retention defaults are bounded and cover abandoned quarantine items", () => {
  assert.match(migration, /interval '7 days'/);
  assert.match(migration, /interval '1 day'/);
  assert.match(migration, /interval '30 days'/);
  assert.match(migration, /storage_deleted_at is null/);
});

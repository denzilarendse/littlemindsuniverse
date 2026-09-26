import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(
  new URL('../database/migrations/20260926_harden_verified_guardian_read_boundaries.sql', import.meta.url),
  'utf8'
);

const block = (start, end) => {
  const from = sql.indexOf(start);
  assert.ok(from >= 0, `missing policy block: ${start}`);
  const to = end ? sql.indexOf(end, from + start.length) : sql.length;
  return sql.slice(from, to < 0 ? sql.length : to);
};

test('classroom visibility requires an active learner/class membership and verified guardian link', () => {
  const policy = block('alter policy teacher_reads_own_classrooms', 'alter policy guardian_reads_approved_weekly_reports');
  assert.match(policy, /cm\.status\s*=\s*'active'/);
  assert.match(policy, /l\.active\s*=\s*true/);
  assert.match(policy, /gl\.guardian_profile_id\s*=\s*\(select auth\.uid\(\)\)/);
  assert.match(policy, /gl\.verified\s*=\s*true/);
});

test('weekly reports require both verified relationship and explicit report permission', () => {
  const policy = block('alter policy guardian_reads_approved_weekly_reports', 'alter policy guardian_read_linked_private_evidence');
  assert.match(policy, /status\s*=\s*'approved'/);
  assert.match(policy, /gl\.learner_id\s*=\s*weekly_reports\.learner_id/);
  assert.match(policy, /gl\.verified\s*=\s*true/);
  assert.match(policy, /gl\.can_receive_reports\s*=\s*true/);
});

test('private evidence storage requires verified guardian and evidence-approval permission', () => {
  const policy = block('alter policy guardian_read_linked_private_evidence');
  assert.match(policy, /bucket_id\s*=\s*'learner-evidence-private'/);
  assert.match(policy, /gl\.verified\s*=\s*true/);
  assert.match(policy, /gl\.can_approve_evidence\s*=\s*true/);
  assert.match(policy, /gl\.learner_id::text\s*=\s*\(storage\.foldername\(objects\.name\)\)\[1\]/);
});

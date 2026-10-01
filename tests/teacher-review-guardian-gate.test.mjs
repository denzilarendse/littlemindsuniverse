import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../database/migrations/20261001_block_review_while_guardian_evidence_pending.sql',import.meta.url),'utf8');

test('teacher review is blocked while guardian evidence approval is pending',()=>{
  assert.match(migration,/status='pending_parent_approval'/);
  assert.match(migration,/Guardian evidence approval is still pending/);
  assert.ok(migration.indexOf("status='pending_parent_approval'") < migration.indexOf('insert into public.submission_reviews'));
});

test('review RPC remains authenticated-only and uses a fixed search path',()=>{
  assert.match(migration,/set search_path = 'public', 'pg_temp'/);
  assert.match(migration,/revoke all on function public\.review_learner_submission[\s\S]*from public, anon/);
  assert.match(migration,/grant execute on function public\.review_learner_submission[\s\S]*to authenticated/);
});

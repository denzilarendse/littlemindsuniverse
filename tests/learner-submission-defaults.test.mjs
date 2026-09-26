import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../database/migrations/20260927_fix_learner_submission_null_defaults.sql', import.meta.url),
  'utf8'
);

const executableSql = migration
  .split('\n')
  .map(line => line.replace(/--.*$/, ''))
  .join('\n');

test('first learner submission restores non-null defaults after an empty SELECT INTO', () => {
  assert.match(executableSql, /v_help\s*:=\s*coalesce\(v_help,\s*0\)/i);
  assert.match(executableSql, /v_evidence_json\s*:=\s*coalesce\(v_evidence_json,\s*'\{\}'::jsonb\)/i);
  assert.match(executableSql, /insert\s+into\s+public\.learner_submissions[\s\S]*v_evidence_json[\s\S]*v_help/i);
});

test('learner submission repair preserves authorization and entitlement guards', () => {
  assert.match(executableSql, /l\.user_id\s*=\s*v_uid/i);
  assert.match(executableSql, /gl\.guardian_profile_id\s*=\s*v_uid/i);
  assert.match(executableSql, /gl\.verified\s*=\s*true/i);
  assert.match(executableSql, /public\.has_commercial_learning_access\(p_learner_id,\s*p_learning_item_id\)/i);
  assert.match(executableSql, /li\.status\s*=\s*'published'/i);
  assert.match(executableSql, /lir\.status\s+in\s*\('assigned',\s*'started'\)/i);
});

test('learner submission repair still blocks empty evidence-free submission', () => {
  assert.match(executableSql, /p_submit[\s\S]*trim\(coalesce\(p_response_text,\s*''\)\)\s*=\s*''[\s\S]*not\s+v_has_evidence/i);
  assert.match(executableSql, /Write, draw or attach learning evidence before submitting\./i);
});

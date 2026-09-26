import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../database/migrations/20260926_fix_guardian_policy_correlation.sql', import.meta.url),
  'utf8'
);

// Security assertions must inspect executable SQL, not explanatory comments that
// intentionally describe the historical defect being fixed.
const executableSql = migration
  .split('\n')
  .map(line => line.replace(/--.*$/, ''))
  .join('\n');

test('guardian submission policies correlate the guardian link to the row learner', () => {
  assert.doesNotMatch(executableSql, /gl\.learner_id\s*=\s*gl\.learner_id/i);
  assert.match(executableSql, /gl\.learner_id\s*=\s*learner_submissions\.learner_id/);
  assert.match(executableSql, /gl\.guardian_profile_id\s*=\s*\(select auth\.uid\(\)\)/);
  assert.match(executableSql, /gl\.verified\s*=\s*true/);
});

test('recipient visibility correlates the guardian link to the recipient learner', () => {
  assert.match(executableSql, /gl\.learner_id\s*=\s*learning_item_recipients\.learner_id/);
  assert.match(executableSql, /public\.has_commercial_learning_access\(learner_id, learning_item_id\)/);
});

test('submission writes still require real assignment and commercial access', () => {
  assert.match(executableSql, /public\.is_learning_item_recipient\(learning_item_id, learner_id\)/);
  assert.match(executableSql, /public\.has_commercial_learning_access\(learner_id, learning_item_id\)/);
});

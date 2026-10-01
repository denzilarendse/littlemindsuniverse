import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../database/migrations/20261001_fix_account_removal_status_ambiguity.sql', import.meta.url),
  'utf8'
);

const sql = migration
  .split('\n')
  .map(line => line.replace(/--.*$/, ''))
  .join('\n');

test('account removal conflict predicate qualifies status through target alias', () => {
  assert.match(sql, /insert\s+into\s+public\.privacy_requests\s+as\s+pr/i);
  assert.match(sql, /on\s+conflict\s*\(profile_id\)[\s\S]*pr\.status\s+in\s*\('pending','processing'\)/i);
  assert.doesNotMatch(sql, /and\s+status\s+in\s*\('pending','processing'\)/i);
});

test('account removal remains authenticated and profile-bound', () => {
  assert.match(sql, /v_uid\s+uuid\s*:=\s*auth\.uid\(\)/i);
  assert.match(sql, /if\s+v_uid\s+is\s+null[\s\S]*Authentication required/i);
  assert.match(sql, /from\s+public\.profiles\s+p\s+where\s+p\.id\s*=\s*v_uid/i);
});

test('account removal remains idempotent for active requests', () => {
  assert.match(sql, /on\s+conflict\s*\(profile_id\)/i);
  assert.match(sql, /request_type\s*=\s*'account_removal'/i);
  assert.match(sql, /do\s+update[\s\S]*updated_at\s*=\s*now\(\)[\s\S]*source\s*=\s*excluded\.source/i);
  assert.match(sql, /returning\s+pr\.id,\s*pr\.created_at,\s*pr\.status/i);
});

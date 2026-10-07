import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(
  new URL('../database/migrations/20261007051347_public_testing_free_learning_access_20261007.sql',import.meta.url),
  'utf8'
);

test('public testing uses a private reversible database flag instead of a commercial entitlement',()=>{
  assert.match(migration,/create table if not exists private\.runtime_flags/i);
  assert.match(migration,/values\s*\(\s*'public_testing_mode'\s*,\s*true\s*,\s*now\(\)\s*\)/i);
  assert.match(migration,/create or replace function private\.public_testing_mode_enabled\(\)/i);
  assert.match(migration,/where rf\.flag_key\s*=\s*'public_testing_mode'/i);
  assert.match(migration,/revoke all on table private\.runtime_flags from public, anon, authenticated/i);
  assert.match(migration,/revoke all on function private\.public_testing_mode_enabled\(\)\s*from public, anon, authenticated/i);
});

test('assigned published work remains relationship-gated while public testing bypasses only the payment gate',()=>{
  for(const fn of ['private.has_commercial_learning_access','public.has_commercial_learning_access']){
    assert.match(migration,new RegExp('create or replace function '+fn.replaceAll('.','\\.')+'\\s*\\(','i'));
  }
  assert.match(migration,/join public\.learning_item_recipients lir[\s\S]*lir\.learner_id\s*=\s*p_learner_id/i);
  assert.match(migration,/li\.status in \('published', 'closed'\)/i);
  assert.match(migration,/private\.public_testing_mode_enabled\(\)[\s\S]*or li\.week_number\s*=\s*1[\s\S]*or public\.has_premium_access\(p_learner_id\)/i);
  assert.doesNotMatch(migration,/grant\s+(?:select|insert|update|delete|all)[\s\S]*\b(?:anon|authenticated)\b/i);
});

test('week two through forty can start during public testing without mutating the production entitlement model',()=>{
  assert.match(migration,/create or replace function public\.begin_learner_week/i);
  assert.match(migration,/if private\.public_testing_mode_enabled\(\) then/i);
  assert.match(migration,/return query select\s+true,\s+false,\s+'public_testing'::text/is);
  assert.match(migration,/if p_week_number\s*>=\s*2 and not v_premium then/is);
  assert.match(migration,/'payment_required'::text/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(
  new URL('../database/migrations/20261006164625_restore_milo_service_role_read_grants_20261006.sql',import.meta.url),
  'utf8'
);

test('Brilliant Milo hosted service-role grant migration is preserved in source',()=>{
  assert.match(migration,/grant\s+select\s+on\s+table/i);
  for(const table of [
    'profiles',
    'learners',
    'learning_items',
    'milo_assistance_events',
    'milo_learning_sessions',
    'milo_learning_events',
    'learner_skill_mastery',
    'skills'
  ]){
    assert.match(migration,new RegExp('public\\.'+table+'(?:,|\\n)','i'));
  }
  assert.match(migration,/to\s+service_role/i);
  assert.doesNotMatch(migration,/\bto\s+(?:anon|authenticated)\b/i);
  assert.doesNotMatch(migration,/grant\s+(?:insert|update|delete|all)\b/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const app=fs.readFileSync(new URL('assets/app.js',root),'utf8');
const migration=fs.readFileSync(new URL('database/migrations/20261006_restore_milo_service_role_read_grants.sql',root),'utf8');

test('live stage cards are read-only while demo stage cards remain interactive',()=>{
  assert.match(app,/const interactive=state\.mode==='demo'/);
  assert.match(app,/interactive\?`<button class="stage/);
  assert.match(app,/:`<div class="stage/);
  assert.match(app,/if\(state\.mode==='demo'\)state\.learner\.stage_code/);
});

test('Milo UI never displays raw server-side 5xx details',()=>{
  assert.match(app,/res\.status>=500\?'Milo unavailable'/);
  assert.match(app,/Milo could not connect just now/);
});

test('RC2 migration restores only Milo server read grants',()=>{
  assert.match(migration,/grant select on table/i);
  for(const table of ['profiles','learners','learning_items','milo_assistance_events','milo_learning_sessions','milo_learning_events','learner_skill_mastery','skills']){
    assert.match(migration,new RegExp('public\\.'+table+'(?:,|\\n)','i'));
  }
  assert.match(migration,/to service_role/i);
  assert.doesNotMatch(migration,/\bto\s+(?:anon|authenticated)\b/i);
  assert.doesNotMatch(migration,/grant\s+(?:insert|update|delete|all)/i);
});

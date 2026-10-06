import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { selectMiloEngine } from '../api/_lib/milo-orchestrator.js';

const root=new URL('../',import.meta.url);
const app=fs.readFileSync(new URL('assets/app.js',root),'utf8');
const studiosCode=fs.readFileSync(new URL('assets/milo-studios.js',root),'utf8');
const migration=fs.readFileSync(new URL('database/migrations/20261006_restore_milo_service_role_read_grants.sql',root),'utf8');

test('Milo specialist cards map to distinct engines and coding opens its own studio',()=>{
  const sandbox={window:{}};
  vm.runInNewContext(studiosCode,sandbox);
  const studios=sandbox.window.LMU_STUDIOS.studios;
  const byId=new Map(studios.map(row=>[row.id,row.engine]));
  assert.equal(byId.get('ai-literacy'),'ai_literacy');
  assert.equal(byId.get('coding-ai'),'coding_ai');
  assert.equal(byId.get('brilliant-milo'),'brilliant_tutor');
  assert.equal(new Set(studios.map(row=>row.id)).size,studios.length);
  assert.match(app,/if\(id==='coding-ai'\)return openCodingStudio\(\)/);
  assert.match(app,/engine:studio\?\.engine\|\|null/);
});

test('server honors a valid selected specialist engine over message keyword classification',()=>{
  assert.equal(selectMiloEngine({
    stageCode:'DB810',
    message:'Teach me about AI bias',
    preferredEngine:'coding_ai'
  }),'coding_ai');
  assert.equal(selectMiloEngine({
    stageCode:'CA1113',
    message:'Help debug this JavaScript loop',
    preferredEngine:'ai_literacy'
  }),'ai_literacy');
  assert.equal(selectMiloEngine({
    stageCode:'PA1415',
    message:'Explain machine learning',
    preferredEngine:'brilliant_tutor'
  }),'brilliant_tutor');
});

test('canonical migration keeps Milo repair least privilege',()=>{
  assert.match(migration,/grant select on table/i);
  for(const table of ['profiles','learners','learning_items','milo_assistance_events','milo_learning_sessions','milo_learning_events','learner_skill_mastery','skills']){
    assert.match(migration,new RegExp('public\\.'+table+'(?:,|\\n)','i'));
  }
  assert.match(migration,/to service_role/i);
  assert.doesNotMatch(migration,/\bto\s+(?:anon|authenticated)\b/i);
  assert.doesNotMatch(migration,/grant\s+(?:insert|update|delete|all)/i);
});

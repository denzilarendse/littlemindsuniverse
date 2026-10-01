import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Brilliant Milo tutor uses server-authorized curriculum catalogue',()=>{
  const app=read('assets/app.js');
  const migration=read('database/migrations/20261001_stage5_stage7_milo_engine_guards_and_tutor_catalog.sql');
  assert.match(app,/get_learner_tutor_catalog/);
  assert.match(app,/Continue my curriculum/);
  assert.match(app,/Find a subject or skill/);
  assert.match(migration,/can_access_learner\(p_learner_id\)/);
  assert.match(migration,/s\.curriculum_code = v_curriculum/);
  assert.match(migration,/s\.stage_code = v_stage/);
});

test('Stage-aware engine guard is enforced in database as defense in depth',()=>{
  const migration=read('database/migrations/20261001_stage5_stage7_milo_engine_guards_and_tutor_catalog.sql');
  assert.match(migration,/v_stage_code = 'EE24'/);
  assert.match(migration,/v_stage_code = 'F57'/);
  assert.match(migration,/DB810','CA1113','PA1415','EDGE1618/);
  assert.match(migration,/This Milo learning mode is not available for the learner stage/);
});

test('Milo engines do not directly write teacher-approved mastery',()=>{
  const app=read('assets/app.js');
  const api=read('api/milo.js');
  assert.doesNotMatch(api,/learner_skill_mastery/);
  assert.doesNotMatch(api,/mastery_evidence/);
  assert.doesNotMatch(app,/from\('learner_skill_mastery'\)\.insert/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const migration=fs.readFileSync(path.join(root,'database/migrations/20261008_grouped_teacher_intelligence_signals.sql'),'utf8');

test('Phase 1B creates explainable teacher-owned signal generation',()=>{
  assert.match(migration,/create or replace function public\.refresh_teacher_intelligence_signals\(/i);
  assert.match(migration,/teacher_owns_classroom\(p_classroom_id\)/i);
  assert.match(migration,/phase1b_rules_v1/i);
  assert.match(migration,/evidence_sufficiency in \('insufficient','sufficient'\)/i);
  assert.match(migration,/contradictory_evidence/i);
  assert.match(migration,/does not activate interventions/i);
});

test('Phase 1B covers individual group class change and enrichment signals',()=>{
  for(const type of ['individual','group','class','change','enrichment']){
    assert.ok(migration.includes("'"+type+"'"),'missing signal type '+type);
  }
  assert.match(migration,/exact_normalized_teacher_misconception/i);
  assert.match(migration,/shared_skill_need/i);
  assert.match(migration,/at_least_half_and_minimum_three/i);
  assert.match(migration,/trend::text = 'declining'/i);
  assert.match(migration,/current_judgement::text in \('secure','strong'\)/i);
});

test('misconception clustering is conservative and evidence based',()=>{
  assert.match(migration,/lower\(regexp_replace\(trim\(me\.misconception\)/i);
  assert.match(migration,/mastery_evidence me/i);
  assert.match(migration,/count\(distinct n\.learner_id\).*>= 2/is);
  assert.match(migration,/teacher-reviewed misconception/i);
  assert.doesNotMatch(migration,/embedding|vector|semantic similarity|diagnos/i);
});

test('insufficient evidence is surfaced rather than converted into intervention confidence',()=>{
  assert.match(migration,/when lsm\.evidence_count < 2 then 'insufficient'/i);
  assert.match(migration,/Collect another teacher-reviewed or independent observation before starting an intervention/i);
  assert.match(migration,/Review the learners before creating a temporary group/i);
});

test('teacher UI can explicitly refresh and inspect signals without activating intervention',()=>{
  assert.match(app,/rpc\('refresh_teacher_intelligence_signals'/);
  assert.match(app,/rpc\('get_teacher_intelligence_signals'/);
  assert.match(app,/Teacher intelligence preview/);
  assert.match(app,/evidence_sufficiency/);
  assert.match(app,/learner_names/);
  assert.match(app,/A signal is not an intervention and does not change learner placement without teacher approval/);
  assert.doesNotMatch(app,/refresh_teacher_intelligence_signals[\s\S]{0,500}approve_milo_recommendation/);
});

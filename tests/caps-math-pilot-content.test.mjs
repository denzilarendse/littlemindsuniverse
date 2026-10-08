import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/20261008_caps_math_pilot_content.sql',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('Phase 1I is a focused CAPS Grades 4-6 common-fractions pilot map',()=>{
  assert.match(sql,/caps_math_pilot_skill_map/);
  assert.match(sql,/caps_grade_min between 4 and 6/);
  assert.match(sql,/1\.2 Common Fractions/);
  const expected=[
    'CAPS-M4-CF-MAGNITUDE-DB810',
    'CAPS-M4-CF-EQUIV-DB810',
    'CAPS-M45-CF-DIVSHARE-DB810',
    'CAPS-M45-CF-DIVSHARE-CA1113',
    'CAPS-M5-CF-SAMEDEN-DB810',
    'CAPS-M5-CF-SAMEDEN-CA1113',
    'CAPS-M56-CF-OFWHOLE-DB810',
    'CAPS-M56-CF-OFWHOLE-CA1113',
    'CAPS-M6-CF-DENMULT-CA1113',
    'CAPS-M6-CF-FDP-EQUIV-CA1113'
  ];
  for(const code of expected)assert.ok(sql.includes(code),code);
});

test('taxonomy contains observable response patterns, not learner diagnoses',()=>{
  assert.match(sql,/caps_math_pilot_misconceptions/);
  for(const code of [
    'F-WHOLE-NUMBER-MAGNITUDE','F-EQUIV-ONE-SIDED','F-PARTITION-UNEQUAL',
    'F-DIVISION-DISCONNECT','F-SAME-DENOM-UNIT-CHANGE',
    'F-FRACTION-OF-WHOLE-REVERSAL','F-COMMON-DENOM-INCOMPLETE',
    'F-FDP-SCALE-CONVERSION'
  ])assert.ok(sql.includes(code),code);
  assert.match(sql,/Observable response patterns for teacher review/);
  assert.doesNotMatch(sql,/\bADHD\b|\blazy\b|\baggressive\b/i);
});

test('structured misconception selection is validated against mapped skill',()=>{
  assert.match(sql,/get_pilot_misconceptions_for_submission/);
  assert.match(sql,/review_learner_submission_v2/);
  assert.match(sql,/Selected misconception is not valid for the mapped pilot skill/);
  assert.match(sql,/v_canonical_misconception/);
});

test('structured code is preserved in mastery evidence while canonical text remains groupable',()=>{
  assert.match(sql,/submission_reviews[\s\S]*misconception_code/);
  assert.match(sql,/mastery_evidence[\s\S]*misconception_code/);
  assert.match(sql,/sync_review_to_mastery/);
  assert.match(sql,/misconception_code=excluded\.misconception_code/);
});

test('legacy review remains compatible and clears stale structured codes',()=>{
  assert.match(sql,/create or replace function public\.review_learner_submission\(/);
  assert.match(sql,/misconception_code=null/);
  assert.match(sql,/misconception_note=null/);
});

test('teacher review UI loads mapped taxonomy and uses governed v2 review RPC',()=>{
  assert.match(app,/get_pilot_misconceptions_for_submission/);
  assert.match(app,/review_learner_submission_v2/);
  assert.match(app,/Observable learning evidence only/);
  assert.match(app,/Do not use medical, psychological or moral labels/);
});

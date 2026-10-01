import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {
  normalizeStage,
  engineAllowedForStage,
  selectMiloEngine
} from '../api/_lib/milo-orchestrator.js';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const expectedByAge=new Map([
  [2,'EE24'],[3,'EE24'],[4,'EE24'],
  [5,'F57'],[6,'F57'],[7,'F57'],
  [8,'DB810'],[9,'DB810'],[10,'DB810'],
  [11,'CA1113'],[12,'CA1113'],[13,'CA1113'],
  [14,'PA1415'],[15,'PA1415'],
  [16,'EDGE1618'],[17,'EDGE1618'],[18,'EDGE1618']
]);

test('every supported learner age 2 through 18 maps to exactly one LMU stage',()=>{
  for(const [age,stage] of expectedByAge){
    assert.equal(normalizeStage('',age).code,stage,'age '+age);
  }
});

test('engine guard keeps specialist capabilities inside stage boundaries',()=>{
  for(const age of [2,3,4]){
    const stage=normalizeStage('',age).code;
    assert.equal(engineAllowedForStage('coding_ai',stage),false);
    assert.equal(engineAllowedForStage('brilliant_tutor',stage),false);
    assert.equal(engineAllowedForStage('early_learning',stage),true);
  }
  for(const age of [5,6,7]){
    const stage=normalizeStage('',age).code;
    assert.equal(engineAllowedForStage('coding_ai',stage),false);
    assert.equal(engineAllowedForStage('adaptive_practice',stage),true);
    assert.equal(engineAllowedForStage('ai_literacy',stage),true);
  }
  for(const age of [8,10,12,15,18]){
    const stage=normalizeStage('',age).code;
    assert.equal(engineAllowedForStage('coding_ai',stage),true);
    assert.equal(engineAllowedForStage('brilliant_tutor',stage),true);
  }
});

test('all-age intent routing stays age safe',()=>{
  assert.equal(selectMiloEngine({age:3,message:'count three shells'}),'early_learning');
  assert.equal(selectMiloEngine({age:4,message:'tell a story and draw it'}),'play_story');
  assert.equal(selectMiloEngine({age:6,message:'practise this again'}),'adaptive_practice');
  assert.equal(selectMiloEngine({age:9,message:'debug my JavaScript loop'}),'coding_ai');
  assert.equal(selectMiloEngine({age:12,message:'practise English pronunciation'}),'voice_language');
  assert.equal(selectMiloEngine({age:15,message:'explain machine learning bias'}),'ai_literacy');
  assert.equal(selectMiloEngine({age:17,message:'teach me this curriculum topic'}),'brilliant_tutor');
});

test('Milo studio cards expose only age-compatible specialist studios',()=>{
  const sandbox={window:{}};
  vm.runInNewContext(read('assets/milo-studios.js'),sandbox);
  const studios=sandbox.window.LMU_STUDIOS;
  assert.ok(studios.forAge(3).every(s=>s.engine!=='coding_ai'&&s.engine!=='brilliant_tutor'));
  assert.ok(studios.forAge(6).some(s=>s.engine==='ai_literacy'));
  assert.ok(!studios.forAge(6).some(s=>s.engine==='coding_ai'));
  assert.ok(studios.forAge(9).some(s=>s.engine==='coding_ai'));
  assert.ok(studios.forAge(17).some(s=>s.engine==='brilliant_tutor'));
});

test('year content scaffold covers all six stages with forty ordered weeks',()=>{
  const curriculum=JSON.parse(read('data/curriculum-year.json'));
  const stages=['EE24','F57','DB810','CA1113','PA1415','EDGE1618'];
  assert.equal(curriculum.weeks.length,240);
  for(const stage of stages){
    const rows=curriculum.weeks.filter(r=>r.stage_code===stage);
    assert.equal(rows.length,40,stage);
    assert.deepEqual(rows.map(r=>r.week),Array.from({length:40},(_,i)=>i+1),stage);
    for(const row of rows){
      assert.ok(row.theme&&row.primary_subject,stage+' week '+row.week);
      assert.match(row.saturday,/Rest/i);
      assert.match(row.sunday,/independent authentic assessment/i);
      assert.match(row.sunday,/level 0 or 1/i);
      assert.ok(Array.isArray(row.evidence_types)&&row.evidence_types.length>=3);
    }
  }
});

test('early-stage themes avoid older-learner technical framing',()=>{
  const curriculum=JSON.parse(read('data/curriculum-year.json'));
  const early=curriculum.weeks.filter(r=>r.stage_code==='EE24').map(r=>r.theme).join(' | ');
  const foundation=curriculum.weeks.filter(r=>r.stage_code==='F57').map(r=>r.theme).join(' | ');
  for(const phrase of ['APIs & connections','Databases & information','Cybersecurity','Enterprise records','Portfolio building']){
    assert.equal(early.includes(phrase),false,phrase);
  }
  for(const phrase of ['APIs & connections','Databases & information','Cybersecurity']){
    assert.equal(foundation.includes(phrase),false,phrase);
  }
});

test('canonical communication surface is LittleMinds Connect only',()=>{
  const sources=[
    read('assets/app.js'),
    read('assets/parent-controls.js'),
    read('assets/connect-app.js'),
    read('assets/connect-bridge.js'),
    read('docs/PRODUCT-SCOPE.md'),
    read('docs/SECURITY.md')
  ].join('\n');
  const retiredProviderName=['what','sapp'].join('');
  assert.equal(sources.toLowerCase().includes(retiredProviderName),false);
  assert.match(sources,/LittleMinds Connect/);
});

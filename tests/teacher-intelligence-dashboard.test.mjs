import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../database/migrations/20261008_teacher_intelligence_dashboard.sql',import.meta.url),'utf8');

test('Phase 1F dashboard uses one teacher-owned consolidated RPC',()=>{
  assert.match(sql,/create or replace function public\.get_teacher_intelligence_dashboard/);
  assert.match(sql,/teacher_owns_classroom\(p_classroom_id\)/);
  assert.match(app,/rpc\('get_teacher_intelligence_dashboard'/);
});

test('dashboard presents the required teacher reasoning hierarchy in order',()=>{
  const labels=['Need','Why','Evidence','Strength','Next learning goal','Recommended action','Teacher decision','Outcome'];
  let last=-1;
  for(const label of labels){
    const pos=app.indexOf('<b>'+label+'</b>');
    assert.ok(pos>last,'missing or out-of-order '+label);
    last=pos;
  }
});

test('dashboard decisions use governed Phase 1C RPCs',()=>{
  assert.match(app,/rpc\('propose_signal_intervention'/);
  assert.match(app,/rpc\('decide_signal_recommendation'/);
  assert.match(app,/get_teacher_classroom_roster/);
  assert.match(app,/data-teacher-rec-members/);
  assert.match(app,/data-decision="approve"/);
  assert.match(app,/data-decision="defer"/);
  assert.match(app,/data-decision="reject"/);
});

test('dashboard synchronizes signal decisions and completed intervention outcomes',()=>{
  assert.match(sql,/sync_teacher_intelligence_recommendation_status/);
  assert.match(sql,/sync_teacher_intelligence_support_outcome/);
  assert.match(sql,/when 'completed' then 'resolved'/);
});

test('dashboard outcome includes verification-cycle counts',()=>{
  assert.match(sql,/verified_cycles/);
  assert.match(sql,/needs_support_cycles/);
  assert.match(sql,/retention_pending_cycles/);
  assert.match(app,/retention pending/);
});

test('demo mode does not fabricate Teacher Intelligence classroom decisions',()=>{
  assert.match(app,/Demo data is not used for classroom decisions/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../database/migrations/20261007_learner_live_dashboard_surfaces.sql',import.meta.url),'utf8');

test('learner live dashboard loads classrooms reports and safe notifications from self-only RPCs',()=>{
  assert.match(app,/rpc\('get_my_learner_classrooms'\)/);
  assert.match(app,/rpc\('get_my_learner_weekly_reports'\)/);
  assert.match(app,/rpc\('get_my_learner_notifications'\)/);
  assert.match(app,/state\.classrooms=learnerClassroomsError\?\[\]/);
  assert.match(app,/state\.learnerNotifications=learnerNotificationsError\?\[\]/);
  assert.match(app,/Learner accounts receive assignment, teacher-review and approved-report updates here/);
});

test('learner dashboard RPCs are security-definer but self-scope through auth uid',()=>{
  for(const name of ['get_my_learner_classrooms','get_my_learner_weekly_reports','get_my_learner_notifications']){
    assert.ok(migration.includes('create or replace function public.'+name+'()'), 'missing '+name);
  }
  assert.match(migration,/security definer/g);
  assert.match(migration,/where l\.user_id = auth\.uid\(\)/g);
  assert.match(migration,/grant execute on function public\.get_my_learner_classrooms\(\) to authenticated/);
  assert.match(migration,/grant execute on function public\.get_my_learner_weekly_reports\(\) to authenticated/);
  assert.match(migration,/grant execute on function public\.get_my_learner_notifications\(\) to authenticated/);
});

test('mastery uses categorical teacher judgement instead of nonexistent percentage fields',()=>{
  assert.match(app,/judgement:String\(m\.current_judgement\|\|'not_yet'\)/);
  assert.match(app,/confidence:String\(m\.confidence\|\|'unknown'\)/);
  assert.match(app,/function masteryJudgementLabel/);
  assert.match(app,/skills secure or strong/);
  assert.doesNotMatch(app,/m\.mastery_estimate/);
  assert.doesNotMatch(app,/Math\.round\(m\.estimate\|\|0\).*%/);
});

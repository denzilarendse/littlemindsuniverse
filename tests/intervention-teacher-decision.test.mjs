import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync(new URL('../database/migrations/20261008_signal_intervention_teacher_decisions.sql',import.meta.url),'utf8');

test('Phase 1C proposals are signal-backed and teacher-owned',()=>{
 assert.match(sql,/signal_id uuid references public\.teacher_intelligence_signals/);
 assert.match(sql,/teacher_owns_classroom\(v_signal\.classroom_id\)/);
 assert.match(sql,/status::text in \('proposed','deferred'\)/);
});
test('teacher decisions support approve reject defer and member edits with audit',()=>{
 assert.match(sql,/p_decision not in \('approve','reject','defer','edit_members'\)/);
 assert.match(sql,/create table if not exists public\.milo_recommendation_decisions/);
 assert.match(sql,/previous_learner_ids uuid\[\]/);
 assert.match(sql,/new_learner_ids uuid\[\]/);
});
test('selected learners must belong to the parent classroom',()=>{
 assert.match(sql,/All selected learners must be active members of the parent classroom/);
 assert.match(sql,/cm\.classroom_id=v_rec\.classroom_id/);
});
test('only approval creates support groups',()=>{
 const approve=sql.indexOf("if p_decision='reject'");
 const create=sql.indexOf("insert into public.classrooms");
 assert.ok(create>approve);
 assert.match(sql,/status='approved'/);
});
test('direct audit-table client access is denied',()=>{
 assert.match(sql,/revoke all on public\.milo_recommendation_decisions from anon, authenticated/);
});

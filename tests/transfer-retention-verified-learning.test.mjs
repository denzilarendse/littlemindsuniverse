import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/20261008_transfer_retention_verified_learning.sql',import.meta.url),'utf8');

test('Phase 1E snapshots baseline mastery without changing mastery automatically',()=>{
  assert.match(sql,/baseline_judgement public\.mastery_judgement/);
  assert.match(sql,/baseline_independent_evidence_count/);
  assert.match(sql,/baseline_misconception_count/);
  assert.doesNotMatch(sql,/update public\.learner_skill_mastery/i);
  assert.doesNotMatch(sql,/insert into public\.learner_skill_mastery/i);
});

test('verified learning requires independent transfer and delayed retention',()=>{
  assert.match(sql,/Transfer and retention must be independent and unassisted/);
  assert.match(sql,/Transfer verification requires a novel context/);
  assert.match(sql,/Retention check is too early/);
  assert.match(sql,/status='verified' and vc\.transfer_demonstrated_at is not null and vc\.retention_demonstrated_at is not null/);
});

test('a successful retry only moves to transfer pending',()=>{
  assert.match(sql,/p_stage='retry'/);
  assert.match(sql,/then 'transfer_pending' else 'needs_support'/);
  assert.doesNotMatch(sql,/p_stage='retry'[\s\S]{0,800}then 'verified'/);
});

test('retention delay is explicit and bounded',()=>{
  assert.match(sql,/retention_delay_days smallint not null default 7/);
  assert.match(sql,/retention_delay_days between 1 and 30/);
  assert.match(sql,/make_interval\(days=>retention_delay_days\)/);
});

test('verification observations have explicit provenance',()=>{
  assert.match(sql,/source_event_id uuid references public\.milo_learning_events/);
  assert.match(sql,/source_mastery_evidence_id uuid references public\.mastery_evidence/);
  assert.match(sql,/Provide exactly one verification evidence source/);
});

test('teacher verification reads remain classroom-owned and direct tables are denied',()=>{
  assert.match(sql,/teacher_owns_classroom\(p_parent_classroom_id\)/);
  assert.match(sql,/revoke all on public\.learning_verification_cycles from anon,authenticated/);
  assert.match(sql,/revoke all on public\.learning_verification_observations from anon,authenticated/);
});

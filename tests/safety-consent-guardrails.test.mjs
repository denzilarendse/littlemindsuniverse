import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/20261008_safety_consent_behavior_guardrails.sql',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../api/milo.js',import.meta.url),'utf8');

test('Phase 1H keeps machine signals learning-focused',()=>{
  assert.match(sql,/signal_domain text not null default 'learning'/);
  assert.match(sql,/Machine-generated Teacher Intelligence signals are restricted to observable learning evidence/);
  assert.match(sql,/teacher_intelligence_text_is_allowed/);
});

test('Milo prompt preserves teacher authority and avoids diagnosis',()=>{
  assert.match(api,/Never diagnose or infer a learner's medical, psychological, neurodevelopmental or moral character/);
  assert.match(api,/observable learning evidence and uncertainty/);
  assert.match(api,/high-stakes decisions to the teacher/);
});

test('safety event writer is service-role only',()=>{
  assert.match(sql,/create or replace function public\.log_milo_safety_event/);
  assert.match(sql,/revoke all on function public\.log_milo_safety_event[\s\S]*from public,anon,authenticated/i);
  assert.match(sql,/grant execute on function public\.log_milo_safety_event[\s\S]*to service_role/i);
});

test('teacher consent and safety views are classroom-owned and aggregate',()=>{
  assert.match(sql,/create or replace function public\.get_teacher_safety_consent_summary/);
  assert.match(sql,/create or replace function public\.get_teacher_safety_events/);
  assert.match(sql,/teacher_owns_classroom\(p_classroom_id\)/);
  assert.match(sql,/pending_evidence_items/);
  assert.match(sql,/attention_required_safety_events_30d/);
});

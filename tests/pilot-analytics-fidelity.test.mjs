import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/20261008_pilot_analytics_fidelity.sql',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../api/milo.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('Phase 1G records teacher judgement of signal usefulness and false alerts',()=>{
  assert.match(sql,/create table if not exists public\.pilot_signal_reviews/);
  assert.match(sql,/usefulness in \('meaningful','not_meaningful','uncertain'\)/);
  assert.match(sql,/false_positive boolean/);
  assert.match(app,/record_pilot_signal_review/);
  assert.match(app,/Not useful \/ false alert/);
});

test('teacher workload is measurable with bounded durations',()=>{
  assert.match(sql,/create table if not exists public\.pilot_teacher_workload_events/);
  assert.match(sql,/duration_seconds between 0 and 7200/);
  assert.match(app,/log_pilot_teacher_workload/);
  assert.match(app,/proposal_decision/);
  assert.match(app,/membership_edit/);
});

test('Milo records provider token usage latency and optional estimated cost server-side',()=>{
  assert.match(sql,/create table if not exists public\.milo_provider_usage/);
  assert.match(sql,/input_tokens integer/);
  assert.match(sql,/output_tokens integer/);
  assert.match(sql,/estimated_cost_usd/);
  assert.match(api,/recordProviderUsage/);
  assert.match(api,/MILO_INPUT_USD_PER_MILLION/);
  assert.match(api,/MILO_OUTPUT_USD_PER_MILLION/);
  assert.doesNotMatch(app,/log_milo_provider_usage/);
});

test('provider usage write RPC is service-role only',()=>{
  assert.match(sql,/revoke all on function public\.log_milo_provider_usage[\s\S]*from public,anon,authenticated/i);
  assert.match(sql,/grant execute on function public\.log_milo_provider_usage[\s\S]*to service_role/i);
});

test('pilot analytics reconstruct detection decisions fidelity learning workload and AI cost',()=>{
  assert.match(sql,/create or replace function public\.get_teacher_pilot_analytics/);
  for(const metric of ['meaningful_signals','false_positive_rate','alerts_per_week','proposals_approved','fidelity_rate','verified_cycles','teacher_workload_seconds','ai_total_tokens','cost_per_verified_cycle_usd']){
    assert.ok(sql.includes(metric),'missing metric '+metric);
  }
  assert.match(sql,/teacher_owns_classroom\(p_classroom_id\)/);
  assert.match(app,/Validation metrics/);
});

test('analytics copy does not claim causality',()=>{
  assert.match(app,/These are pilot measurements, not causal claims/);
});

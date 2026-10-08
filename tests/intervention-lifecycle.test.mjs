import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/20261008_intervention_lifecycle.sql',import.meta.url),'utf8');

test('Phase 1D stores explicit temporary support lifecycle fields',()=>{
  assert.match(sql,/create table if not exists public\.support_group_lifecycles/i);
  assert.match(sql,/objective text not null/i);
  assert.match(sql,/entry_reason text not null/i);
  assert.match(sql,/review_at timestamptz not null/i);
  assert.match(sql,/exit_criteria text not null/i);
  assert.match(sql,/status in \('active','continued','modified','completed','dissolved'\)/i);
});

test('approved recommendations initialize lifecycle without changing parent classroom',()=>{
  assert.match(sql,/initialize_support_group_lifecycle_from_recommendation/i);
  assert.match(sql,/new\.group_classroom_id/i);
  assert.match(sql,/parent_classroom_id/i);
  assert.doesNotMatch(sql,/update public\.classrooms set active=false where id=v_group\.parent_classroom_id/i);
});

test('teacher reviews support groups through controlled lifecycle actions',()=>{
  assert.match(sql,/p_action not in \('continue','modify','complete','dissolve'\)/i);
  assert.match(sql,/A future review date is required to continue or modify support/i);
  assert.match(sql,/This support group is already closed/i);
});

test('learner exits are auditable and the final exit dissolves only the support group',()=>{
  assert.match(sql,/create table if not exists public\.support_group_membership_events/i);
  assert.match(sql,/event_type in \('entered','removed','reentered'\)/i);
  assert.match(sql,/Group dissolved automatically after the final learner exited/i);
  assert.match(sql,/update public\.classrooms set active=false where id=p_group_classroom_id/i);
});

test('overlapping groups remain possible because membership is scoped by group classroom',()=>{
  assert.match(sql,/group_classroom_id uuid not null/);
  assert.doesNotMatch(sql,/unique\s*\(learner_id\)/i);
});

test('direct lifecycle tables are not client-readable',()=>{
  assert.match(sql,/revoke all on public\.support_group_lifecycles from anon,authenticated/i);
  assert.match(sql,/revoke all on public\.support_group_lifecycle_events from anon,authenticated/i);
  assert.match(sql,/revoke all on public\.support_group_membership_events from anon,authenticated/i);
});

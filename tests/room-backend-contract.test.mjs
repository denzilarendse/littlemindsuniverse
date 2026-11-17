import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../database/migrations/20261117_lmu_rooms_read_boundary.sql', import.meta.url),
  'utf8'
);

test('first room backend migration is additive and limited to PlayWorld and StoryVerse', () => {
  assert.match(migration, /create table if not exists public\.room_content_items/i);
  assert.match(migration, /create table if not exists public\.room_activity_events/i);
  assert.match(migration, /'playworld',\s*'storyverse'/i);
  assert.doesNotMatch(migration, /drop table|truncate table|delete from public\./i);
  assert.doesNotMatch(migration, /insert into public\.|update public\./i);
});

test('catalogue payloads are objects with a bounded size and publication audit', () => {
  assert.match(migration, /jsonb_typeof\(payload\)\s*=\s*'object'/i);
  assert.match(migration, /pg_column_size\(payload\)\s*<=\s*32768/i);
  assert.match(migration, /status\s*=\s*'published'.*approved_by is not null and published_at is not null/is);
  assert.match(migration, /where status = 'published'/i);
});

test('learner activity reads delegate to the existing learner relationship helper', () => {
  assert.match(migration, /public\.can_access_learner\(learner_id\)/i);
  assert.match(migration, /learner_id uuid not null references public\.learners\(id\)/i);
  assert.match(migration, /actor_profile_id uuid not null references public\.profiles\(id\)/i);
});

test('client roles cannot write catalogue or activity rows directly', () => {
  assert.match(migration, /revoke all on table public\.room_content_items from public, anon, authenticated/i);
  assert.match(migration, /revoke all on table public\.room_activity_events from public, anon, authenticated/i);
  assert.match(migration, /grant select on table public\.room_content_items to authenticated/i);
  assert.match(migration, /grant select on table public\.room_activity_events to authenticated/i);
  assert.doesNotMatch(migration, /grant\s+(insert|update|delete|all)\s+on\s+table\s+public\.room_(content_items|activity_events)/i);
  assert.doesNotMatch(migration, /for (insert|update|delete|all)/i);
});

test('activity payloads and duration are bounded and event types are allow-listed', () => {
  assert.match(migration, /pg_column_size\(result\)\s*<=\s*2048/i);
  assert.match(migration, /duration_seconds between 0 and 7200/i);
  assert.match(migration, /'activity_started',\s*'activity_completed'/i);
});

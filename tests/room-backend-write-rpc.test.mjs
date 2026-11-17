import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../database/migrations/20261117_lmu_rooms_activity_write_rpc.sql', import.meta.url),
  'utf8'
);

test('RPC is SECURITY DEFINER with pinned empty search_path and narrow execute grant', () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /revoke all on function public\.record_room_activity/i);
  assert.match(migration, /to authenticated/i);
  assert.match(migration, /from public, anon, authenticated/i);
});

test('actor and timestamp are server-derived; no actor or occurred_at input exists', () => {
  assert.match(migration, /v_actor_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /actor_profile_id\s*\)\s*values/i);
  assert.doesNotMatch(migration, /p_actor_profile_id|p_occurred_at/i);
});

test('writes require an active learner self profile and matching published content', () => {
  assert.match(migration, /l\.user_id = v_actor_id/i);
  assert.match(migration, /l\.active = true/i);
  assert.match(migration, /p\.role::text/i);
  assert.match(migration, /ci\.status = 'published'/i);
  assert.match(migration, /ci\.stage_code is null or ci\.stage_code = v_stage_code/i);
  assert.match(migration, /split_part\(v_content_locale, '-', 1\)/i);
});

test('result metadata is allowlisted, bounded, and free text is rejected', () => {
  assert.match(migration, /jsonb_each\(p_result\)/i);
  assert.match(migration, /when 'score'/i);
  assert.match(migration, /when 'outcome'/i);
  assert.match(migration, /else true/i);
  assert.match(migration, /pg_column_size\(p_result\) > 2048/i);
});

test('activity is append-only through the RPC and has a serialized per-actor rate cap', () => {
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /v_recent_count >= 30/i);
  assert.match(migration, /insert into public\.room_activity_events/i);
  assert.doesNotMatch(migration, /update public\.room_activity_events|delete from public\.room_activity_events/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const fixture = fs.readFileSync(
  new URL('./sql/rooms-rls-fixture.sql', import.meta.url),
  'utf8'
);

test('local SQL fixture is isolated and rolls back all seeded data', () => {
  assert.ok(fixture.includes('begin;'));
  assert.ok(fixture.includes('do $$'));
  assert.ok(fixture.includes("current_database() <> 'lmu_rooms_test'"));
  assert.ok(fixture.includes("'172.16.0.0/12'::inet"));
  assert.equal(fixture.includes('\\n      inet_server_addr'), false);
  assert.ok(fixture.trimEnd().endsWith('rollback;'));
  assert.ok(fixture.includes('NEVER be pointed at production'));
  assert.ok(fixture.includes(String.raw\`\\ir ../../database/migrations/20261117_lmu_rooms_read_boundary.sql\`));
});

test('fixture exercises learner self, verified and unverified guardian, and teacher boundaries', () => {
  assert.ok(fixture.includes('learner self boundary failed'));
  assert.ok(fixture.includes('verified guardian boundary failed'));
  assert.ok(fixture.includes('unverified guardian was allowed'));
  assert.ok(fixture.includes('active classroom teacher boundary failed'));
  assert.ok(fixture.includes('unrelated teacher was allowed'));
  assert.ok(fixture.includes('l.user_id = auth.uid()'));
  assert.ok(fixture.includes('gl.verified = true'));
  assert.ok(fixture.includes('c.teacher_profile_id = auth.uid()'));
});

test('fixture checks anon and direct-write denial', () => {
  assert.ok(fixture.includes("has_table_privilege('anon'"));
  assert.ok(fixture.includes('direct activity INSERT'));
  assert.ok(fixture.includes('set role authenticated'));
});

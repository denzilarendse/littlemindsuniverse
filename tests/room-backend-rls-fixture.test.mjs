import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const fixture = fs.readFileSync(
  new URL('./sql/rooms-rls-fixture.sql', import.meta.url),
  'utf8'
);

test('local SQL fixture is isolated and rolls back all seeded data', () => {
  assert.match(fixture, /\bbegin;/i);
  assert.ok(fixture.includes('do $'));
  assert.match(fixture, /current_database\(\) <> 'lmu_rooms_test'/i);
  assert.match(fixture, /inet_server_addr\(\).*127\.0\.0\.0\/8/is);
  assert.equal(fixture.includes('\\n      inet_server_addr'), false);
  assert.match(fixture, /rollback;\s*$/i);
  assert.match(fixture, /NEVER (be pointed at|run against) production/i);
  assert.match(fixture, /\\ir \.\.\/\.\.\/database\/migrations\/20261117_lmu_rooms_read_boundary\.sql/i);
});

test('fixture exercises learner self, verified and unverified guardian, and teacher boundaries', () => {
  assert.match(fixture, /learner self boundary failed/i);
  assert.match(fixture, /verified guardian boundary failed/i);
  assert.match(fixture, /unverified guardian was allowed/i);
  assert.match(fixture, /active classroom teacher boundary failed/i);
  assert.match(fixture, /unrelated teacher was allowed/i);\n  assert.match(fixture, /l\\.user_id = auth\\.uid\\(\\)/i);\n  assert.match(fixture, /gl\\.verified = true/i);\n  assert.match(fixture, /c\\.teacher_profile_id = auth\\.uid\\(\\)/i);
});

test('fixture checks anon and direct-write denial', () => {
  assert.match(fixture, /has_table_privilege\('anon'.*'SELECT'/is);
  assert.match(fixture, /direct activity INSERT/i);
  assert.match(fixture, /set role authenticated/i);
});

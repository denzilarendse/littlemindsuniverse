import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const foundation = read('database/migrations/20260926_littleminds_connect_foundation.sql');
const hardening = read('database/migrations/20260926_connect_internal_helper_execute_hardening.sql');
const connectClient = read('assets/connect-app.js');
const mainClient = read('assets/app.js');

test('internal Connect relationship predicate is not directly executable by app roles', () => {
  for (const role of ['public', 'anon', 'authenticated']) {
    assert.match(
      hardening,
      new RegExp(`revoke execute on function public\\.connect_classroom_relationship_active\\(uuid\\) from ${role};`, 'i')
    );
  }
});

test('relationship predicate remains a bounded SECURITY DEFINER helper with pinned search_path', () => {
  const start = foundation.indexOf('create or replace function public.connect_classroom_relationship_active');
  assert.ok(start >= 0, 'Connect relationship helper missing');
  const section = foundation.slice(start, foundation.indexOf('create or replace function', start + 20));
  assert.match(section, /security definer/i);
  assert.match(section, /set search_path\s*=\s*public, pg_temp/i);
  assert.match(section, /cls\.active\s*=\s*true/i);
  assert.match(section, /cm\.status\s*=\s*'active'/i);
  assert.match(section, /gl\.verified\s*=\s*true/i);
  assert.match(section, /gl\.can_receive_class_messages\s*=\s*true/i);
});

test('public web clients use top-level authorization RPCs, never the internal predicate', () => {
  assert.doesNotMatch(connectClient, /rpc\(['"]connect_classroom_relationship_active['"]/);
  assert.doesNotMatch(mainClient, /rpc\(['"]connect_classroom_relationship_active['"]/);
  assert.match(connectClient, /rpc\(['"]get_connect_threads['"]\)/);
  assert.match(connectClient, /rpc\(['"]send_connect_message['"]/);
});

test('top-level membership and send guards continue to call the internal predicate', () => {
  for (const fn of ['connect_is_member', 'connect_can_send']) {
    const start = foundation.indexOf(`create or replace function public.${fn}`);
    assert.ok(start >= 0, `${fn} missing`);
    const section = foundation.slice(start, foundation.indexOf('create or replace function', start + 20));
    assert.match(section, /public\.connect_classroom_relationship_active\(c\.id\)/);
    assert.match(section, /security definer/i);
  }
});

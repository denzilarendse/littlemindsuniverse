import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const hardening = read('database/migrations/20260927_revoke_internal_helper_rpc_execute.sql');
const mainClient = read('assets/app.js');
const connectClient = read('assets/connect-app.js');

for (const helper of ['connect_can_send', 'has_premium_access']) {
  test(`${helper} is not directly executable by browser app roles`, () => {
    for (const role of ['public', 'anon', 'authenticated']) {
      assert.match(
        hardening,
        new RegExp(`revoke execute on function public\\.${helper}\\(uuid\\) from ${role};`, 'i')
      );
    }
  });
}

test('web clients never call internal helper RPCs directly', () => {
  for (const client of [mainClient, connectClient]) {
    assert.doesNotMatch(client, /rpc\(['"]connect_can_send['"]/);
    assert.doesNotMatch(client, /rpc\(['"]has_premium_access['"]/);
  }
  assert.match(connectClient, /rpc\(['"]send_connect_message['"]/);
});

test('hardening does not revoke the supported top-level app RPC surface', () => {
  for (const topLevel of ['send_connect_message', 'get_my_access_status', 'begin_learner_week']) {
    assert.doesNotMatch(
      hardening,
      new RegExp(`revoke execute on function public\\.${topLevel}\\(`, 'i')
    );
  }
});

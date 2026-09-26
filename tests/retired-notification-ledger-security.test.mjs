import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(
  new URL('../database/migrations/20260926_retired_notification_ledger_explicit_deny.sql', import.meta.url),
  'utf8'
);

const executableSql = sql.replace(/--.*$/gm, '');

test('retired notification dispatch ledger explicitly denies app-client access', () => {
  assert.match(executableSql, /create\s+policy\s+notification_dispatches_no_client_access/i);
  assert.match(executableSql, /for\s+all\s+to\s+anon\s*,\s*authenticated/i);
  assert.match(executableSql, /using\s*\(\s*false\s*\)/i);
  assert.match(executableSql, /with\s+check\s*\(\s*false\s*\)/i);
});

test('retired provider dispatch RPCs remain non-executable by app and server API roles', () => {
  for (const name of [
    'set_parent_whatsapp_contact',
    'reserve_whatsapp_dispatch',
    'complete_whatsapp_dispatch',
    'fail_whatsapp_dispatch'
  ]) {
    assert.match(executableSql, new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${name}`, 'i'));
  }
  assert.match(executableSql, /from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i);
});

test('ledger hardening is access-control only and does not rewrite historical rows', () => {
  assert.doesNotMatch(executableSql, /\b(?:insert|update|delete|truncate)\b/i);
});

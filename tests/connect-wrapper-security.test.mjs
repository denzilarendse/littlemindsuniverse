import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(
  new URL('../database/migrations/20260926_connect_legacy_wrappers_security_invoker.sql', import.meta.url),
  'utf8'
);

// Assertions below inspect executable SQL only. Strip line comments so words in
// explanatory comments cannot create false positives in privilege checks.
const executableSql = sql.replace(/--.*$/gm, '');

const wrappers = [
  'get_message_contacts\\(\\)',
  'get_my_message_threads\\(\\)',
  'get_or_create_message_thread\\(uuid, uuid, uuid\\)',
  'get_thread_messages\\(uuid\\)',
  'send_thread_message\\(uuid, text\\)'
];

test('legacy message compatibility wrappers are SECURITY INVOKER', () => {
  for (const signature of wrappers) {
    assert.match(executableSql, new RegExp(`alter function public\\.${signature} security invoker`, 'i'));
  }
});

test('hardening changes privilege mode only and does not replace authorization logic', () => {
  assert.doesNotMatch(executableSql, /create\s+or\s+replace|grant\s+execute|security\s+definer/i);
});

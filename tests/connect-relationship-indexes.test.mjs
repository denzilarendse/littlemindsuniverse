import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(
  new URL('../database/migrations/20260926_connect_relationship_indexes.sql', import.meta.url),
  'utf8'
);

const expected = [
  ['connect_business_accounts_owner_profile_idx','connect_business_accounts','owner_profile_id'],
  ['connect_business_members_profile_idx','connect_business_members','profile_id'],
  ['connect_conversations_created_by_idx','connect_conversations','created_by'],
  ['connect_conversations_guardian_profile_idx','connect_conversations','guardian_profile_id'],
  ['connect_conversations_learner_idx','connect_conversations','learner_id'],
  ['connect_conversations_teacher_profile_idx','connect_conversations','teacher_profile_id'],
  ['connect_messages_reply_to_idx','connect_messages','reply_to_message_id'],
  ['connect_messages_sender_profile_idx','connect_messages','sender_profile_id'],
  ['connect_receipts_profile_idx','connect_receipts','profile_id'],
  ['guardian_learner_links_learner_idx','guardian_learner_links','learner_id']
];

test('high-frequency Connect and guardian relationship foreign keys are indexed', () => {
  for (const [index, table, column] of expected) {
    assert.match(sql, new RegExp(`create index if not exists ${index}\\s+on public\\.${table}\\(${column}\\)`, 'i'));
  }
});

test('index migration is additive and does not rewrite relationship data', () => {
  assert.doesNotMatch(sql, /\b(drop|delete|truncate|update|alter\s+table)\b/i);
});

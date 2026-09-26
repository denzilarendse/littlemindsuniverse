import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../database/migrations/20260926_littleminds_connect_foundation.sql',import.meta.url),'utf8');
const env=fs.readFileSync(new URL('../.env.example',import.meta.url),'utf8');
const health=fs.readFileSync(new URL('../api/health.js',import.meta.url),'utf8');

const tables=[
  'connect_conversations',
  'connect_members',
  'connect_messages',
  'connect_receipts',
  'connect_business_accounts',
  'connect_business_members'
];

test('Connect foundation creates the canonical messaging tables',()=>{
  for(const table of tables){
    assert.match(migration,new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration,/guardian_profile_id uuid references public\.profiles/);
  assert.match(migration,/teacher_profile_id uuid references public\.profiles/);
  assert.match(migration,/connect_classroom_scope_required/);
  assert.match(migration,/connect_classroom_conversation_unique_idx/);
});

test('Connect Data API surface is read-only and mutation stays RPC controlled',()=>{
  for(const table of tables){
    assert.match(migration,new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
    assert.match(migration,new RegExp(`grant select on table public\\.${table} to authenticated`));
  }
  assert.doesNotMatch(migration,/grant (?:insert|update|delete|all) on table public\.connect_/i);
});

test('Connect authorization revalidates classroom relationships instead of trusting stale membership',()=>{
  assert.match(migration,/create or replace function public\.connect_classroom_relationship_active/);
  assert.match(migration,/gl\.verified = true/);
  assert.match(migration,/gl\.can_receive_class_messages = true/);
  assert.match(migration,/cm\.status = 'active'/);
  assert.match(migration,/cls\.active = true/);
  assert.match(migration,/connect_classroom_relationship_active\(c\.id\)/);
  assert.match(migration,/c\.guardian_profile_id = auth\.uid\(\) and p\.role = 'parent'/);
  assert.match(migration,/c\.teacher_profile_id = auth\.uid\(\) and p\.role = 'teacher'/);
});

test('learner accounts cannot send Connect messages and classroom admin impersonation is not accepted',()=>{
  assert.match(migration,/p\.role <> 'learner'/);
  assert.doesNotMatch(migration,/p\.role in \([^\n]*'learner'/);
  assert.doesNotMatch(migration,/c\.teacher_profile_id = auth\.uid\(\) and p\.role = 'admin'/);
  assert.doesNotMatch(migration,/c\.guardian_profile_id = auth\.uid\(\) and p\.role = 'admin'/);
});

test('business RLS avoids recursive self-policy lookup through a bounded helper',()=>{
  assert.match(migration,/create or replace function public\.connect_is_business_member/);
  assert.match(migration,/using \(public\.connect_is_business_member\(id\)\)/);
  assert.match(migration,/using \(public\.connect_is_business_member\(business_id\)\)/);
  const businessPolicy=migration.slice(migration.indexOf('create policy connect_business_members_select_same_business'),migration.indexOf('-- Preserve existing secure classroom message history'));
  assert.doesNotMatch(businessPolicy,/select 1 from public\.connect_business_members mine/);
});

test('security-definer Connect functions are not left executable by PUBLIC',()=>{
  for(const fn of [
    'connect_classroom_relationship_active',
    'connect_is_member',
    'connect_can_send',
    'connect_is_business_member',
    'get_connect_contacts',
    'get_or_create_connect_classroom_conversation',
    'get_connect_threads',
    'get_connect_messages',
    'send_connect_message',
    'mark_connect_thread_read'
  ]){
    assert.match(migration,new RegExp(`revoke all on function public\\.${fn}`));
  }
  assert.match(migration,/set search_path = public, pg_temp/g);
  assert.match(migration,/auth\.uid\(\) is not null/);
});

test('existing secure classroom message history is migrated without deleting legacy evidence',()=>{
  assert.match(migration,/from public\.classroom_message_threads t/);
  assert.match(migration,/from public\.classroom_messages m/);
  assert.match(migration,/insert into public\.connect_conversations/);
  assert.match(migration,/insert into public\.connect_members/);
  assert.match(migration,/insert into public\.connect_messages/);
  assert.doesNotMatch(migration,/drop table public\.classroom_message/i);
  assert.doesNotMatch(migration,/delete from public\.classroom_message/i);
});

test('Connect exposes contacts, bounded thread/message RPCs, replies and read receipts',()=>{
  for(const fn of [
    'get_connect_contacts',
    'get_or_create_connect_classroom_conversation',
    'get_connect_threads',
    'get_connect_messages',
    'send_connect_message',
    'mark_connect_thread_read'
  ]) assert.match(migration,new RegExp(`create or replace function public\\.${fn}`));
  assert.match(migration,/char_length\(v_body\) < 1 or char_length\(v_body\) > 4000/);
  assert.match(migration,/reply target is invalid/);
  assert.match(migration,/insert into public\.connect_receipts/);
  assert.match(migration,/last_read_at = v_now/);
});

test('legacy web messaging RPCs become compatibility wrappers over Connect during UI migration',()=>{
  for(const fn of ['get_my_message_threads','get_or_create_message_thread','get_thread_messages','send_thread_message']){
    assert.match(migration,new RegExp(`create or replace function public\\.${fn}`));
  }
  assert.match(migration,/from public\.get_connect_threads\(\)/);
  assert.match(migration,/get_or_create_connect_classroom_conversation/);
  assert.match(migration,/perform public\.mark_connect_thread_read/);
  assert.match(migration,/select public\.send_connect_message/);
});

test('Connect message table is prepared for Supabase Realtime without modifying the realtime schema',()=>{
  assert.match(migration,/alter publication supabase_realtime add table public\.connect_messages/);
  assert.doesNotMatch(migration,/(?:create|alter|drop)\s+(?:table|function|schema)\s+realtime\./i);
});

test('third-party WhatsApp provider configuration is no longer a release dependency',()=>{
  assert.doesNotMatch(env,/WHATSAPP_/);
  assert.doesNotMatch(health,/whatsappConfigured/);
  assert.match(health,/connectConfigured/);
  assert.equal(fs.existsSync(new URL('../api/whatsapp.js',import.meta.url)),false);
  assert.equal(fs.existsSync(new URL('../netlify/functions/whatsapp.mjs',import.meta.url)),false);
});
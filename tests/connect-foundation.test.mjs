import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../database/migrations/20260926_littleminds_connect_foundation.sql',import.meta.url),'utf8');
const env=fs.readFileSync(new URL('../.env.example',import.meta.url),'utf8');
const health=fs.readFileSync(new URL('../api/health.js',import.meta.url),'utf8');

test('Connect foundation creates the canonical messaging tables',()=>{
  for(const table of [
    'connect_conversations',
    'connect_members',
    'connect_messages',
    'connect_receipts',
    'connect_business_accounts',
    'connect_business_members'
  ]) assert.match(migration,new RegExp(`create table if not exists public\\.${table}`));
});

test('Connect messaging is protected by RLS and explicit authorization helpers',()=>{
  for(const table of ['connect_conversations','connect_members','connect_messages','connect_receipts','connect_business_accounts','connect_business_members']){
    assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration,/create or replace function public\.connect_is_member/);
  assert.match(migration,/create or replace function public\.connect_can_send/);
  assert.match(migration,/set search_path = public, pg_temp/g);
  assert.match(migration,/auth\.uid\(\) is not null/);
});

test('learner accounts are not permitted to send in the foundation policy',()=>{
  assert.match(migration,/p\.role in \('teacher','parent','admin'\)/);
  assert.doesNotMatch(migration,/p\.role in \([^\n]*'learner'/);
});

test('Connect exposes bounded thread, message, send and read-state RPCs',()=>{
  for(const fn of ['get_connect_threads','get_connect_messages','send_connect_message','mark_connect_thread_read']){
    assert.match(migration,new RegExp(`create or replace function public\\.${fn}`));
  }
  assert.match(migration,/char_length\(v_body\) < 1 or char_length\(v_body\) > 4000/);
  assert.match(migration,/reply target is invalid/);
});

test('third-party WhatsApp provider configuration is no longer a release dependency',()=>{
  assert.doesNotMatch(env,/WHATSAPP_/);
  assert.doesNotMatch(health,/whatsappConfigured/);
  assert.match(health,/connectConfigured/);
  assert.equal(fs.existsSync(new URL('../api/whatsapp.js',import.meta.url)),false);
  assert.equal(fs.existsSync(new URL('../netlify/functions/whatsapp.mjs',import.meta.url)),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../database/migrations/20260926_littleminds_connect_retire_whatsapp.sql',import.meta.url),'utf8');
const vercel=fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8');

test('legacy contact RPC is a narrow compatibility bridge to LittleMinds Connect',()=>{
  assert.match(migration,/create or replace function public\.get_message_contacts\(\)/);
  assert.match(migration,/select \* from public\.get_connect_contacts\(\)/);
  assert.match(migration,/grant execute on function public\.get_message_contacts\(\) to authenticated/);
});

test('provider contact collection is disabled without deleting historical rows',()=>{
  assert.match(migration,/revoke all on table public\.whatsapp_contacts from anon, authenticated/);
  assert.match(migration,/set opted_in = false/);
  assert.match(migration,/set can_receive_whatsapp = false/);
  assert.doesNotMatch(migration,/drop table public\.whatsapp_contacts/i);
  assert.doesNotMatch(migration,/delete from public\.whatsapp_contacts/i);
});

test('retired WhatsApp RPCs are no longer executable by app or server API roles',()=>{
  assert.match(migration,/revoke all on function public\.set_parent_whatsapp_contact\(text,boolean\) from anon, authenticated/);
  for(const fn of ['reserve_whatsapp_dispatch','complete_whatsapp_dispatch','fail_whatsapp_dispatch']){
    assert.match(migration,new RegExp(`revoke all on function public\\.${fn}`));
  }
  assert.match(migration,/from anon, authenticated, service_role/);
});

test('Vercel no longer references the removed WhatsApp function',()=>{
  assert.doesNotMatch(vercel,/api\/whatsapp\.js/);
  assert.match(vercel,/api\/milo\.js/);
  assert.match(vercel,/api\/payfast\.js/);
  assert.match(vercel,/api\/payfast-itn\.js/);
});
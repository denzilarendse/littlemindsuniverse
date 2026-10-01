import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const migration=read('database/migrations/20261001_connect_stage8_realtime_offline_push.sql');
const app=read('assets/connect-app.js');
const sw=read('sw.js');
const runtime=read('assets/runtime-config.js');
const data=read('assets/data.js');

test('all six LittleMinds stages remain in the live-test scope',()=>{
  for(const code of ['EE24','F57','DB810','CA1113','PA1415','EDGE1618']){
    assert.match(data,new RegExp("code:['\\\"]"+code+"['\\\"]"));
  }
});

test('pilot runtime explicitly bypasses payment settlement without removing pricing',()=>{
  assert.match(runtime,/pilotMode:\\s*true/);
  assert.match(runtime,/pilotPaymentsRequired:\\s*false/);
  assert.match(runtime,/weekOneAlwaysFree:\\s*true/);
});

test('Connect stage 8 adds idempotent sends and delivered state behind RPC authorization',()=>{
  assert.match(migration,/client_message_id uuid/);
  assert.match(migration,/connect_messages_client_idempotency_idx/);
  assert.match(migration,/create or replace function public\\.send_connect_message_v2/);
  assert.match(migration,/public\\.connect_can_send\\(p_conversation_id\\)/);
  assert.match(migration,/create or replace function public\\.mark_connect_thread_delivered/);
  assert.match(migration,/public\\.connect_is_member\\(p_conversation_id\\)/);
  assert.match(migration,/revoke all on function public\\.send_connect_message_v2/);
});

test('push registration foundation keeps endpoint capability data off direct Data API access',()=>{
  assert.match(migration,/create table if not exists public\\.connect_push_subscriptions/);
  assert.match(migration,/alter table public\\.connect_push_subscriptions enable row level security/);
  assert.match(migration,/revoke all on table public\\.connect_push_subscriptions from public, anon, authenticated/);
  assert.match(migration,/register_connect_push_subscription/);
  assert.match(migration,/unregister_connect_push_subscription/);
  assert.ok(migration.includes("endpoint ~ '^https://'"));
});

test('Connect client has a session-scoped offline outbox with idempotent RPC retry',()=>{
  assert.match(app,/sessionStorage/);
  assert.match(app,/send_connect_message_v2/);
  assert.match(app,/p_client_message_id/);
  assert.match(app,/addEventListener\\('online'/);
  assert.match(app,/Queued offline/);
  assert.match(app,/discardConnectQueued/);
});

test('Connect service worker supports same-origin notification routing without weakening cache privacy',()=>{
  assert.match(sw,/addEventListener\\('push'/);
  assert.match(sw,/addEventListener\\('notificationclick'/);
  assert.match(sw,/url\\.origin!==self\\.location\\.origin/);
  assert.match(sw,/if\\(url\\.pathname\\.startsWith\\('\/api\/'\\)\\) return/);
  assert.doesNotMatch(sw,/openWindow\\([^)]*event\\.notification\\.data\\.url/);
});

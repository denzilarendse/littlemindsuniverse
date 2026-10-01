import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const migration=read('database/migrations/20261001_connect_stage8_realtime_offline_push.sql');
const denyMigration=read('database/migrations/20261001_connect_push_subscriptions_explicit_deny.sql');
const app=read('assets/connect-app.js');
const sw=read('sw.js');
const runtime=read('assets/runtime-config.js');
const data=read('assets/data.js');
const managedLearner=read('database/migrations/20261001_connect_only_communication_cleanup.sql');
const feedbackMigration=read('database/migrations/20261001_stage8_pilot_feedback.sql');
const androidManifest=read('android/connectapp/src/main/AndroidManifest.xml');
const env=read('.env.example');
const health=read('api/health.js');

test('all six LittleMinds stages remain in the live-test scope and managed-learner backend',()=>{
  for(const code of ['EE24','F57','DB810','CA1113','PA1415','EDGE1618']){
    assert.ok(data.includes("code:'"+code+"'"),'data missing '+code);
    assert.ok(managedLearner.includes("'"+code+"'"),'managed learner RPC missing '+code);
  }
});

test('pilot runtime explicitly bypasses payment settlement without removing pricing',()=>{
  assert.ok(runtime.includes('pilotMode: true'));
  assert.ok(runtime.includes('pilotPaymentsRequired: false'));
  assert.ok(runtime.includes('weekOneAlwaysFree: true'));
  assert.ok(runtime.includes('monthlyUSD: 3'));
});

test('Connect stage 8 adds idempotent sends and delivered state behind RPC authorization',()=>{
  for(const fragment of [
    'client_message_id uuid',
    'connect_messages_client_idempotency_idx',
    'create or replace function public.send_connect_message_v2',
    'public.connect_can_send(p_conversation_id)',
    'create or replace function public.mark_connect_thread_delivered',
    'public.connect_is_member(p_conversation_id)',
    'revoke all on function public.send_connect_message_v2'
  ]) assert.ok(migration.includes(fragment),'missing '+fragment);
});

test('push registration foundation keeps endpoint capability data off direct Data API access',()=>{
  for(const fragment of [
    'create table if not exists public.connect_push_subscriptions',
    'alter table public.connect_push_subscriptions enable row level security',
    'revoke all on table public.connect_push_subscriptions from public, anon, authenticated',
    'register_connect_push_subscription',
    'unregister_connect_push_subscription',
    "endpoint ~ '^https://'"
  ]) assert.ok(migration.includes(fragment),'missing '+fragment);
  assert.ok(denyMigration.includes('using (false)'));
  assert.ok(denyMigration.includes('with check (false)'));
});

test('Connect client has a session-scoped offline outbox with idempotent RPC retry',()=>{
  for(const fragment of [
    'sessionStorage',
    "rpc('send_connect_message_v2'",
    'p_client_message_id:entry.clientMessageId',
    "addEventListener('online'",
    'Queued offline',
    'discardConnectQueued'
  ]) assert.ok(app.includes(fragment),'missing '+fragment);
});

test('Connect service worker supports same-origin notification routing without weakening cache privacy',()=>{
  for(const fragment of [
    "addEventListener('push'",
    "addEventListener('notificationclick'",
    'url.origin!==self.location.origin',
    "if(url.pathname.startsWith('/api/')) return"
  ]) assert.ok(sw.includes(fragment),'missing '+fragment);
  assert.equal(sw.includes('event.notification.data.url'),false);
});

test('Connect Android pilot keeps a narrow child-privacy permission footprint',()=>{
  assert.ok(androidManifest.includes('android.permission.INTERNET'));
  for(const permission of [
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.READ_CONTACTS',
    'android.permission.AD_ID',
    'android.permission.POST_NOTIFICATIONS'
  ]) assert.equal(androidManifest.includes(permission),false,'unexpected permission '+permission);
});


test('pilot feedback is authenticated, bounded and avoids direct table access',()=>{
  for(const fragment of [
    'create table if not exists public.pilot_feedback',
    'revoke all on table public.pilot_feedback from public, anon, authenticated',
    'create or replace function public.submit_pilot_feedback',
    'char_length(v_body) < 3 or char_length(v_body) > 2000'
  ]) assert.ok(feedbackMigration.includes(fragment),'missing '+fragment);
  assert.ok(app.includes("rpc('submit_pilot_feedback'"));
  assert.ok(app.includes('Do not include passwords, phone numbers, private learner conversations'));
});

test('runtime configuration has no external phone messaging provider dependency',()=>{
  const runtimeSurface=[env,health,app,runtime].join('\n');
  assert.equal(/EXTERNAL_PHONE_PROVIDER_|phone_e164|whatsapp_contacts|notification_dispatches/i.test(runtimeSurface),false);
});

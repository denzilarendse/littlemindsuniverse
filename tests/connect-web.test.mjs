import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('connect.html');
const app=read('assets/connect-app.js');
const css=read('assets/connect.css');
const build=read('scripts/build.mjs');
const sw=read('sw.js');

test('standalone Connect page loads only publishable client configuration and dedicated assets',()=>{
  assert.match(html,/LittleMinds Connect/);
  assert.match(html,/\/assets\/runtime-config\.js/);
  assert.match(html,/\/assets\/connect-app\.js/);
  assert.match(html,/\/assets\/connect\.css/);
  assert.doesNotMatch(html,/SUPABASE_SECRET|SERVICE_ROLE|WHATSAPP_/i);
});

test('Connect web client uses authorization-aware Connect RPCs for messaging mutations',()=>{
  for(const name of [
    'get_connect_threads',
    'get_connect_contacts',
    'get_or_create_connect_classroom_conversation',
    'get_connect_messages',
    'mark_connect_thread_read',
    'send_connect_message'
  ]) assert.match(app,new RegExp(`rpc\\('${name}'`));
  assert.doesNotMatch(app,/from\('connect_messages'\)\.(?:insert|update|delete)/);
  assert.doesNotMatch(app,/from\('connect_members'\)\.(?:insert|update|delete)/);
});

test('Connect composer is bounded, reply-aware and duplicate-send guarded',()=>{
  assert.match(app,/maxlength=\"4000\"/);
  assert.match(app,/body\.length>4000/);
  assert.match(app,/state\.sending/);
  assert.match(app,/p_reply_to_message_id:state\.replyTo\?\.message_id\|\|null/);
  assert.match(app,/Message was not sent\. Access is checked again for every send/);
});

test('Connect web client does not gate verified classroom messaging on premium entitlement',()=>{
  assert.match(app,/Messaging access is independent from premium lesson entitlement/);
  assert.doesNotMatch(app,/from\(['"](?:entitlements|subscriptions)['"]\)/i);
  assert.doesNotMatch(app,/rpc\(['"][^'"]*(?:entitlement|subscription|premium|trial)[^'"]*['"]/i);
  assert.doesNotMatch(app,/premium_required|trial_expired_locked/i);
});

test('learner accounts do not receive an unrestricted Connect composer',()=>{
  assert.match(app,/Learner accounts do not currently have an unrestricted message composer/);
  assert.match(app,/authorizedMessagingRole\(\)/);
  assert.match(app,/\['parent','teacher'\]/);
});

test('Connect realtime subscription is scoped to the active conversation',()=>{
  assert.match(app,/table:'connect_messages'/);
  assert.match(app,/filter:`conversation_id=eq\.\$\{conversationId\}`/);
  assert.match(app,/removeChannel\(state\.channel\)/);
  assert.match(app,/mark_connect_thread_read/);
});

test('Connect standalone UI contains no WhatsApp or phone-number discovery dependency',()=>{
  const combined=html+'\n'+app+'\n'+css;
  assert.doesNotMatch(combined,/WhatsApp|WHATSAPP_|phone_e164|parentWhatsapp/i);
  assert.match(app,/Connect does not use phone-number discovery/);
});

test('production build and offline shell include Connect and its LMU bridge',()=>{
  assert.match(build,/['\"]connect\.html['\"]/);
  assert.match(build,/LittleMinds Connect shell is missing from production build/);
  assert.match(sw,/const CACHE=['"]lmu-production-v\d+['"]/);
  for(const asset of ['/connect.html','/assets/connect.css','/assets/connect-app.js','/assets/connect-bridge.js'])assert.ok(sw.includes(`'${asset}'`),`service worker missing ${asset}`);
  assert.match(sw,/url\.pathname==='\/connect\.html'\|\|url\.pathname==='\/connect'/);
});
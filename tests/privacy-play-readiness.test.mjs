import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('public privacy policy identifies LittleMindsUniverse and exposes request mechanism',()=>{
  const page=read('privacy.html');
  assert.match(page,/<title>Privacy Policy · LittleMindsUniverse<\/title>/);
  assert.match(page,/LittleMinds Connect/);
  assert.match(page,/LittleMinds Universe \(Pty\) Ltd/);
  assert.match(page,/Information we handle/);
  assert.match(page,/Retention and deletion/);
  assert.match(page,/account-data-request\.html/);
  assert.match(page,/privacy-contact mechanism/i);
});

test('public account/privacy request resource works without Android installation',()=>{
  const page=read('account-data-request.html');
  assert.match(page,/without installing the Android app/i);
  assert.match(page,/privacyAuthForm/);
  assert.match(page,/confirmAccountRemoval/);
  assert.match(page,/submitPrivacyInquiry/);
  assert.match(page,/privacy\.html/);
  assert.match(page,/assets\/privacy-request\.js/);
});

test('privacy request browser code uses publishable config and authenticated RPCs only',()=>{
  const script=read('assets/privacy-request.js');
  assert.match(script,/supabasePublishableKey/);
  assert.match(script,/request_account_removal/);
  assert.match(script,/submit_privacy_inquiry/);
  assert.match(script,/signInWithPassword/);
  assert.doesNotMatch(script,/SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY)/);
  assert.doesNotMatch(script,/auth\.admin/);
});

test('in-app account and settings surfaces link to privacy controls',()=>{
  const index=read('index.html');
  const controls=read('assets/privacy-controls.js');
  const connect=read('connect.html');
  assert.match(index,/assets\/privacy-controls\.js/);
  assert.match(controls,/Privacy & account/);
  assert.match(controls,/account-data-request\.html/);
  assert.match(controls,/privacy\.html/);
  assert.match(connect,/Privacy Policy/);
  assert.match(connect,/account-data-request\.html/);
});

test('canonical build and service worker include privacy resources without caching data APIs',()=>{
  const build=read('scripts/build.mjs');
  const worker=read('sw.js');
  assert.match(build,/privacy\.html/);
  assert.match(build,/account-data-request\.html/);
  assert.match(build,/privacy-request\.js/);
  assert.match(build,/privacy-controls\.js/);
  assert.match(worker,/privacy\.html/);
  assert.match(worker,/account-data-request\.html/);
  assert.match(worker,/url\.origin!==self\.location\.origin/);
  assert.match(worker,/url\.pathname\.startsWith\('\/api\/'\)/);
});

test('database migration keeps request table private and exposes narrow authenticated RPCs',()=>{
  const sql=read('database/migrations/20260928203851_privacy_account_request_queue.sql');
  assert.match(sql,/alter table public\.privacy_requests enable row level security/i);
  assert.match(sql,/revoke all on table public\.privacy_requests from anon, authenticated/i);
  assert.match(sql,/security definer/i);
  assert.match(sql,/set search_path = public, pg_temp/i);
  assert.match(sql,/auth\.uid\(\)/i);
  assert.match(sql,/revoke all on function public\.request_account_removal\(text\) from public, anon/i);
  assert.match(sql,/grant execute on function public\.request_account_removal\(text\) to authenticated/i);
  assert.match(sql,/revoke all on function public\.submit_privacy_inquiry\(text,text\) from public, anon/i);
  assert.match(sql,/grant execute on function public\.submit_privacy_inquiry\(text,text\) to authenticated/i);
});

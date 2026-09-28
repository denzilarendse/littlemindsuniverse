import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CONNECT_APK_FILENAME,
  CONNECT_APK_PATH,
  CONNECT_EXPECTED_SHA256,
  CONNECT_EXPECTED_SIZE,
  CONNECT_SHA_PATH,
  assertAndroidDownloadHeaders,
  parsePublishedChecksum
} from '../scripts/verify-connect-play-production.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('Play production verifier freezes the exact signed Connect website artifact',()=>{
  assert.equal(CONNECT_APK_FILENAME,'LittleMinds-Connect-1.0.0.apk');
  assert.equal(CONNECT_APK_PATH,'/downloads/LittleMinds-Connect-1.0.0.apk');
  assert.equal(CONNECT_SHA_PATH,'/downloads/LittleMinds-Connect-1.0.0.sha256');
  assert.equal(CONNECT_EXPECTED_SIZE,3024688);
  assert.equal(CONNECT_EXPECTED_SHA256,'65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb');
});

test('published checksum parser accepts only the frozen Connect artifact metadata',()=>{
  const expected='65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb';
  assert.equal(parsePublishedChecksum(`${expected}  LittleMinds-Connect-1.0.0.apk\n`),expected);
  assert.throws(()=>parsePublishedChecksum(`${'0'.repeat(64)}  LittleMinds-Connect-1.0.0.apk`),/frozen signed Connect APK checksum/i);
  assert.throws(()=>parsePublishedChecksum(`${expected}  Wrong.apk`),/wrong Connect APK filename/i);
});

test('APK response must keep Android package and attachment headers',()=>{
  assert.doesNotThrow(()=>assertAndroidDownloadHeaders(new Headers({
    'content-type':'application/vnd.android.package-archive',
    'content-disposition':'attachment; filename="LittleMinds-Connect-1.0.0.apk"'
  })));
  assert.throws(()=>assertAndroidDownloadHeaders(new Headers({
    'content-type':'text/html',
    'content-disposition':'attachment'
  })),/wrong Content-Type/i);
  assert.throws(()=>assertAndroidDownloadHeaders(new Headers({
    'content-type':'application/vnd.android.package-archive'
  })),/not served as an attachment/i);
});

test('verifier requires privacy, deletion, browser-boundary and frozen-APK checks',()=>{
  const verifier=read('scripts/verify-connect-play-production.mjs');
  assert.match(verifier,/\/privacy\.html/);
  assert.match(verifier,/\/account-data-request\.html/);
  assert.match(verifier,/Delete your LittleMindsUniverse account/);
  assert.match(verifier,/without installing the Android app/);
  assert.match(verifier,/request_account_removal/);
  assert.match(verifier,/submit_privacy_inquiry/);
  assert.match(verifier,/auth\\\.admin|auth\.admin/);
  assert.match(verifier,/createHash\('sha256'\)/);
  assert.match(verifier,/3024688/);
  assert.match(verifier,/65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb/);
});

test('guarded release preparation refuses artifact drift and requires Play policy files',()=>{
  const helper=read('scripts/prepare-connect-play-release.mjs');
  assert.match(helper,/CONNECT_EXPECTED_SIZE/);
  assert.match(helper,/CONNECT_EXPECTED_SHA256/);
  assert.match(helper,/Signed Connect APK size mismatch/);
  assert.match(helper,/Signed Connect APK SHA-256 mismatch/);
  assert.match(helper,/privacy\.html/);
  assert.match(helper,/account-data-request\.html/);
  assert.match(helper,/privacy-request\.js/);
  assert.match(helper,/privacy-controls\.js/);
  assert.match(helper,/fs\.copyFileSync/);
});

test('package scripts expose the guarded release and dedicated post-deploy gates',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['prepare:connect-play-release'],'node scripts/prepare-connect-play-release.mjs');
  assert.equal(pkg.scripts['verify:play-production'],'node scripts/verify-connect-play-production.mjs');
});

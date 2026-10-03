import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const lmuManifest=read('android/app/src/main/AndroidManifest.xml');
const connectManifest=read('android/connectapp/src/main/AndroidManifest.xml');
const vars=read('android/variables.gradle');
const app=read('assets/app.js');
const parentControls=read('assets/parent-controls.js');
const connect=read('assets/connect-app.js');
const privacy=read('privacy.html');
const deletion=read('account-data-request.html');

const permissions=xml=>[...xml.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)].map(([,name])=>name);

test('Google Play 2026 target API and child-minimal Android permissions remain frozen',()=>{
  assert.match(vars,/compileSdkVersion\s*=\s*36/);
  assert.match(vars,/targetSdkVersion\s*=\s*36/);
  assert.deepEqual(permissions(lmuManifest),[
    'android.permission.INTERNET',
    'android.permission.RECORD_AUDIO'
  ]);
  assert.deepEqual(permissions(connectManifest),['android.permission.INTERNET']);
  const manifests=lmuManifest+'\n'+connectManifest;
  for(const forbidden of [
    'AD_ID','ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION',
    'READ_CONTACTS','WRITE_CONTACTS','READ_PHONE_STATE',
    'READ_PHONE_NUMBERS','READ_SMS','READ_CALL_LOG'
  ]) assert.doesNotMatch(manifests,new RegExp(forbidden));
});

test('microphone use is both product-consent gated and device-permission gated',()=>{
  assert.match(app,/audio_evidence_enabled/);
  assert.match(app,/getUserMedia\(\{audio:true,video:false\}\)/);
  assert.match(parentControls,/Camera, video, audio & transcription consent/);
  assert.match(parentControls,/phone or browser must still separately grant camera or microphone hardware access/);
  assert.match(privacy,/microphone\/audio evidence/i);
});

test('Connect remains relationship-authorized rather than random or anonymous chat',()=>{
  assert.match(connect,/authorizedMessagingRole/);
  assert.match(connect,/get_connect_contacts/);
  assert.doesNotMatch(connect,/random chat|anonymous chat|public room|discover nearby/i);
});

test('public privacy and account deletion resources meet release-source contract',()=>{
  assert.match(privacy,/Privacy Policy/);
  assert.match(privacy,/third-party AI integrations/i);
  assert.match(privacy,/account-data-request\.html/);
  assert.match(deletion,/Delete your LittleMindsUniverse account/i);
  assert.match(deletion,/without installing the Android app/i);
  assert.match(deletion,/assets\/privacy-request\.js/);
});

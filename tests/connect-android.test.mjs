import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const connectConfig = JSON.parse(read('capacitor.connect.config.json'));
const lmuConfig = JSON.parse(read('capacitor.config.json'));
const gradle = read('android/connectapp/build.gradle');
const manifest = read('android/connectapp/src/main/AndroidManifest.xml');
const strings = read('android/connectapp/src/main/res/values/strings.xml');
const settings = read('android/settings.gradle');
const builder = read('scripts/build-connect-android.mjs');
const workflow = read('.github/workflows/android-verification.yml');

const dangerousPermissions = [
  'CAMERA',
  'RECORD_AUDIO',
  'ACCESS_FINE_LOCATION',
  'ACCESS_COARSE_LOCATION',
  'READ_CONTACTS',
  'WRITE_CONTACTS'
];

test('standalone Connect Android identity is frozen and distinct from LMU', () => {
  assert.equal(connectConfig.appId, 'za.co.littlemindsuniverse.connect');
  assert.equal(connectConfig.appName, 'LittleMinds Connect');
  assert.equal(lmuConfig.appId, 'za.co.littlemindsuniverse');
  assert.notEqual(connectConfig.appId, lmuConfig.appId);
  assert.match(gradle, /applicationId\s+"za\.co\.littlemindsuniverse\.connect"/);
  assert.match(gradle, /namespace\s*=\s*"za\.co\.littlemindsuniverse\.connect"/);
  assert.match(strings, /LittleMinds Connect/);
  assert.match(settings, /include ':connectapp'/);
});

test('Connect Android inherits API 36 and keeps child-safe native defaults', () => {
  const variables = read('android/variables.gradle');
  assert.match(variables, /compileSdkVersion\s*=\s*36/);
  assert.match(variables, /targetSdkVersion\s*=\s*36/);
  assert.match(variables, /minSdkVersion\s*=\s*24/);
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /android\.permission\.INTERNET/);
  for (const permission of dangerousPermissions) {
    assert.doesNotMatch(manifest, new RegExp(`android\\.permission\\.${permission}`));
  }
  assert.match(manifest, /android:host="www\.littlemindsuniverse\.co\.za"/);
  assert.match(manifest, /android:pathPrefix="\/connect"/);
});

test('Connect native payload is deterministic and Connect-only', () => {
  assert.match(builder, /dist[\s\S]*connect\.html/);
  assert.match(builder, /index\.html/);
  assert.match(builder, /Potential server secret found in Connect Android payload/);
  assert.match(builder, /Connect Android entry unexpectedly contains the main LMU application root/);
});

test('Android CI builds and verifies both LMU and standalone Connect bundles', () => {
  assert.match(workflow, /npm run android:connect:sync/);
  assert.match(workflow, /:app:bundleRelease/);
  assert.match(workflow, /:connectapp:bundleRelease/);
  assert.match(workflow, /littleminds-connect-android-api36-unsigned/);
  assert.match(workflow, /connectapp\/build\/outputs\/bundle\/release\/connectapp-release\.aab/);
});

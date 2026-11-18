import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inspectAndroidPlayBaseline } from '../scripts/verify-android-play-readiness.mjs';

const variables = fs.readFileSync(new URL('../android/variables.gradle', import.meta.url), 'utf8');
const manifest = fs.readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
const appGradle = fs.readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');

test('current Android configuration satisfies static API, backup, transport and permission gates', () => {
  const checks = inspectAndroidPlayBaseline({ variables, manifest, appGradle });
  assert.ok(checks.every(check => check.status === 'PASS'), JSON.stringify(checks, null, 2));
});

test('Android policy verifier detects a newly introduced unapproved permission', () => {
  const checks = inspectAndroidPlayBaseline({
    variables,
    manifest: manifest.replace('</manifest>', '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /></manifest>'),
    appGradle
  });
  assert.equal(checks.find(check => check.id === 'permission-minimisation').status, 'FAIL');
});

test('Android policy verifier rejects a target SDK below the current baseline', () => {
  const checks = inspectAndroidPlayBaseline({
    variables: variables.replace('targetSdkVersion = 36', 'targetSdkVersion = 35'),
    manifest,
    appGradle
  });
  assert.equal(checks.find(check => check.id === 'target-sdk').status, 'FAIL');
});

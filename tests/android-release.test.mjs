import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const capacitor = JSON.parse(read('capacitor.config.json'));
const pkg = JSON.parse(read('package.json'));
const variables = read('android/variables.gradle');
const gradle = read('android/app/build.gradle');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const gitignore = read('.gitignore');
const androidWorkflow = read('.github/workflows/android-verification.yml');
const instrumentation = read('android/app/src/androidTest/java/za/co/littlemindsuniverse/PackageIdentityInstrumentedTest.java');
const unitTest = read('android/app/src/test/java/za/co/littlemindsuniverse/PackageIdentityUnitTest.java');

test('Android application identity is frozen and consistent', () => {
  assert.equal(capacitor.appId, 'za.co.littlemindsuniverse');
  assert.equal(capacitor.appName, 'LittleMindsUniverse');
  assert.equal(capacitor.webDir, 'dist');
  assert.match(gradle, /namespace\s*=\s*"za\.co\.littlemindsuniverse"/);
  assert.match(gradle, /applicationId\s+"za\.co\.littlemindsuniverse"/);
});

test('Capacitor 8 Android release targets API 36 with the supported minimum', () => {
  assert.equal(pkg.dependencies?.['@capacitor/core'], '8.5.2');
  assert.equal(pkg.devDependencies?.['@capacitor/android'], '8.5.2');
  assert.equal(pkg.devDependencies?.['@capacitor/cli'], '8.5.2');
  assert.equal(pkg.engines?.node, '>=22');
  assert.match(variables, /minSdkVersion\s*=\s*24/);
  assert.match(variables, /compileSdkVersion\s*=\s*36/);
  assert.match(variables, /targetSdkVersion\s*=\s*36/);
});

test('native shell disables backup and cleartext traffic and requests only internet', () => {
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:fullBackupContent="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  const permissions = [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)].map(([, name]) => name);
  assert.deepEqual(permissions, ['android.permission.INTERNET']);
});

test('owner-controlled Android signing material is excluded from source control', () => {
  for (const entry of ['*.jks', '*.keystore', 'keystore.properties', 'android/key.properties', 'android/local.properties', 'android/app/google-services.json']) {
    assert.ok(gitignore.includes(entry), `Missing signing/local ignore: ${entry}`);
  }
  assert.equal(fs.existsSync(path.join(root, 'android/app/google-services.json')), false);
});

test('native tests compile under the frozen application identity with no Capacitor template package left behind', () => {
  assert.match(instrumentation, /^package za\.co\.littlemindsuniverse;/m);
  assert.match(instrumentation, /assertEquals\("za\.co\.littlemindsuniverse", appContext\.getPackageName\(\)\)/);
  assert.match(unitTest, /^package za\.co\.littlemindsuniverse;/m);
  assert.equal(fs.existsSync(path.join(root, 'android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java')), false);
  assert.equal(fs.existsSync(path.join(root, 'android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java')), false);
});

test('Android CI reruns web checks, runtime dependency audit, native lint, unit/instrumentation compilation and AAB build', () => {
  assert.match(androidWorkflow, /npm audit --omit=dev --audit-level=moderate/);
  assert.match(androidWorkflow, /npm run check/);
  assert.match(androidWorkflow, /npm run android:sync/);
  assert.match(androidWorkflow, /\.\/gradlew lintRelease testReleaseUnitTest :app:assembleDebugAndroidTest/);
  assert.match(androidWorkflow, /\.\/gradlew bundleRelease/);
  assert.match(androidWorkflow, /jarsigner -verify/);
});

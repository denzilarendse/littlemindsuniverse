import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function inspectAndroidPlayBaseline({ variables, manifest, appGradle }) {
  const checks = [];
  const add = (id, pass, detail) => checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
  const sdk = name => Number(variables.match(new RegExp(name + 'Version\\s*=\\s*(\\d+)'))?.[1] || 0);
  const min = sdk('minSdk');
  const compile = sdk('compileSdk');
  const target = sdk('targetSdk');
  add('min-sdk', min >= 24, 'minSdkVersion=' + min);
  add('target-sdk', target >= 36, 'targetSdkVersion=' + target + '; policy baseline requires API 36 or higher');
  add('compile-sdk', compile >= target, 'compileSdkVersion=' + compile);
  add('backup-disabled', /android:allowBackup="false"/.test(manifest), 'Android backup must remain disabled for the current child-data design');
  add('cleartext-disabled', /android:usesCleartextTraffic="false"/.test(manifest), 'Cleartext HTTP traffic must remain disabled');
  const permissions = [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)].map(match => match[1]);
  const allowed = new Set(['android.permission.INTERNET', 'android.permission.RECORD_AUDIO']);
  add('permission-minimisation', permissions.every(permission => allowed.has(permission)), 'Declared permissions: ' + (permissions.join(', ') || 'none'));
  add('identity-stable', /applicationId\s+"za\.co\.littlemindsuniverse"/.test(appGradle), 'Application ID must remain stable');
  add('release-signing-owner-controlled', /hasReleaseSigning/.test(appGradle), 'Signing is configured only when owner-controlled key.properties is supplied; signing itself is not verified here');
  return checks;
}

async function main() {
  const [variables, manifest, appGradle] = await Promise.all([
    fs.readFile(new URL('../android/variables.gradle', import.meta.url), 'utf8'),
    fs.readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8'),
    fs.readFile(new URL('../android/app/build.gradle', import.meta.url), 'utf8')
  ]);
  const checks = inspectAndroidPlayBaseline({ variables, manifest, appGradle });
  for (const check of checks) console.log(check.status + ' ' + check.id + ': ' + check.detail);
  const failed = checks.filter(check => check.status === 'FAIL');
  console.log(failed.length ? 'ANDROID BASELINE FAIL: ' + failed.length + ' checks' : 'ANDROID POLICY BASELINE PASS; external Play Console/device/signing gates remain open.');
  if (failed.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

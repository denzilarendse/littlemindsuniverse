import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONNECT_ANDROID_PACKAGE,
  buildConnectAssetLinksStatement
} from '../scripts/generate-connect-assetlinks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('Connect Digital Asset Links statement is locked to the frozen standalone package', () => {
  const statement = buildConnectAssetLinksStatement('22'.repeat(32));
  assert.equal(CONNECT_ANDROID_PACKAGE, 'za.co.littlemindsuniverse.connect');
  assert.deepEqual(statement.relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(statement.target.namespace, 'android_app');
  assert.equal(statement.target.package_name, 'za.co.littlemindsuniverse.connect');
  assert.equal(statement.target.sha256_cert_fingerprints[0].split(':').length, 32);
});

test('Connect assetlinks command uses the dedicated generator and does not overwrite production assetlinks implicitly', () => {
  assert.equal(pkg.scripts?.['android:connect:assetlinks'], 'node scripts/generate-connect-assetlinks.mjs');
  const source = fs.readFileSync(path.join(root, 'scripts', 'generate-connect-assetlinks.mjs'), 'utf8');
  assert.match(source, /assetlinks\.connect\.json/);
  assert.doesNotMatch(source, /targetFile\s*=\s*path\.join\(targetDir,\s*['"]assetlinks\.json['"]\)/);
  assert.equal(fs.existsSync(path.join(root, '.well-known', 'assetlinks.connect.json')), false);
});

test('Connect assetlinks fingerprint validation rejects placeholders through the shared strict normalizer', () => {
  for (const value of ['', 'SHA256', 'AA:BB:CC', 'not-a-certificate']) {
    assert.throws(() => buildConnectAssetLinksStatement(value));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeFingerprint, buildAssetLinksDocument } from '../scripts/generate-assetlinks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('Digital Asset Links fingerprint normalization is deterministic', () => {
  const compact = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
  assert.equal(
    normalizeFingerprint(compact),
    '00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF'
  );
});

test('Digital Asset Links rejects placeholders and malformed certificate values', () => {
  for (const value of ['', 'SHA256', 'AA:BB:CC', 'not-a-certificate']) {
    assert.throws(() => normalizeFingerprint(value));
  }
});

test('Digital Asset Links document is locked to the frozen LMU Android package', () => {
  const document = buildAssetLinksDocument('11'.repeat(32));
  assert.deepEqual(document[0].relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(document[0].target.namespace, 'android_app');
  assert.equal(document[0].target.package_name, 'za.co.littlemindsuniverse');
  assert.equal(document[0].target.sha256_cert_fingerprints[0].split(':').length, 32);
});

test('assetlinks publication is an explicit owner-certificate step', () => {
  assert.equal(pkg.scripts?.['android:assetlinks'], 'node scripts/generate-assetlinks.mjs');
  assert.equal(fs.existsSync(path.join(root, '.well-known', 'assetlinks.json')), false);
});

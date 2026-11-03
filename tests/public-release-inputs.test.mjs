import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  APPROVED_NETLIFY_SITE_ID,
  CONNECT_APK_FILENAME,
  CONNECT_APK_SIZE,
  CONNECT_APK_SHA256,
  verifyConnectChecksumSidecar,
  verifyPublicReleaseInputs
} from '../scripts/verify-public-release-inputs.mjs';

const validEnv = {
  LMU_ANDROID_KEYSTORE_BASE64: 'synthetic-keystore-placeholder',
  LMU_ANDROID_STORE_PASSWORD: 'synthetic-store-password',
  LMU_ANDROID_KEY_ALIAS: 'synthetic-alias',
  LMU_ANDROID_KEY_PASSWORD: 'synthetic-key-password',
  NETLIFY_AUTH_TOKEN: 'synthetic-netlify-token',
  NETLIFY_SITE_ID: APPROVED_NETLIFY_SITE_ID
};

function temporaryRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lmu-release-gate-'));
}

test('release gate rejects missing owner signing and Netlify credentials', () => {
  assert.throws(
    () => verifyPublicReleaseInputs({ env: {}, root: temporaryRoot() }),
    /missing owner-controlled release secrets/
  );
});

test('release gate rejects a Netlify site other than the approved production site', () => {
  assert.throws(
    () => verifyPublicReleaseInputs({ env: { ...validEnv, NETLIFY_SITE_ID: 'wrong-site' }, root: temporaryRoot() }),
    /does not identify the approved/
  );
});

test('release gate rejects a missing frozen signed Connect APK', () => {
  assert.throws(
    () => verifyPublicReleaseInputs({ env: validEnv, root: temporaryRoot() }),
    /frozen signed LittleMinds Connect APK is missing/
  );
});

test('release gate rejects an APK with the wrong byte size', () => {
  const root = temporaryRoot();
  const downloads = path.join(root, 'dist', 'downloads');
  fs.mkdirSync(downloads, { recursive: true });
  fs.writeFileSync(path.join(downloads, CONNECT_APK_FILENAME), Buffer.from('not-the-frozen-apk'));
  assert.throws(
    () => verifyPublicReleaseInputs({ env: validEnv, root }),
    /size mismatch/
  );
});

test('release gate rejects a same-sized APK with the wrong SHA-256', () => {
  const root = temporaryRoot();
  const downloads = path.join(root, 'dist', 'downloads');
  fs.mkdirSync(downloads, { recursive: true });
  fs.writeFileSync(path.join(downloads, CONNECT_APK_FILENAME), Buffer.alloc(CONNECT_APK_SIZE));
  assert.throws(
    () => verifyPublicReleaseInputs({ env: validEnv, root }),
    /SHA-256 mismatch/
  );
});

test('checksum sidecar accepts only the pinned frozen APK digest and filename', () => {
  assert.equal(
    verifyConnectChecksumSidecar(`${CONNECT_APK_SHA256}  ${CONNECT_APK_FILENAME}`),
    true
  );
  assert.throws(
    () => verifyConnectChecksumSidecar(`0000000000000000000000000000000000000000000000000000000000000000  ${CONNECT_APK_FILENAME}`),
    /does not match the frozen artifact/
  );
});

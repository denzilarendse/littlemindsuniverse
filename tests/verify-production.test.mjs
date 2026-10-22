import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assertConnectDownloadPage, verifyConnectApkBytes } from '../scripts/verify-production.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(root, 'download-connect.html'), 'utf8');

test('Connect download page pins package, version, APK checksum and certificate metadata', () => {
  const metadata = assertConnectDownloadPage(page);
  assert.equal(metadata.sha256, '65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb');
  assert.equal(
    metadata.certificateSha256,
    'E9:BB:1E:07:82:AA:8B:19:55:0E:74:2F:E2:F5:9C:49:A0:34:5A:FD:D6:54:47:CE:23:73:4C:64:34:45:25:D5'
  );
});

test('Connect APK verification rejects bytes that differ from the advertised checksum', () => {
  assert.throws(() => verifyConnectApkBytes(page, Buffer.from([0x50, 0x4b, 0x03, 0x04])), /do not match the published SHA-256/);
});

test('Connect APK verifier accepts ZIP/APK bytes only when their SHA-256 is advertised', () => {
  const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const pageWithFixtureHash = page.replace(
    /(official version 1\.0\.0 APK has this SHA-256 checksum:[\s\S]*?<code[^>]*>\s*)[a-f0-9]{64}/i,
    `$1${hash}`
  );
  const result = verifyConnectApkBytes(pageWithFixtureHash, bytes);
  assert.equal(result.sha256, hash);
  assert.equal(result.sizeBytes, bytes.length);
});

test('Connect APK verifier rejects a non-ZIP payload even when its checksum matches', () => {
  const bytes = Buffer.from('not an APK');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const pageWithFixtureHash = page.replace(
    /(official version 1\.0\.0 APK has this SHA-256 checksum:[\s\S]*?<code[^>]*>\s*)[a-f0-9]{64}/i,
    `$1${hash}`
  );
  assert.throws(() => verifyConnectApkBytes(pageWithFixtureHash, bytes), /not an APK\/ZIP payload/);
});

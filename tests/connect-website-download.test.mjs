import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConnectChecksum, assertConnectApkHeaders } from '../scripts/verify-production.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('Connect website download page exposes the frozen package and exact signed APK checksum', () => {
  const page = read('download-connect.html');
  assert.match(page, /za\.co\.littlemindsuniverse\.connect/);
  assert.match(page, /LittleMinds-Connect-1\.0\.0\.apk/);
  assert.match(page, /65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb/);
  assert.match(page, /not currently a Google Play Store download/i);
});

test('signed website APK remains owner-local while checksum metadata is source-controlled', () => {
  const ignore = read('.gitignore');
  const checksum = read('downloads/LittleMinds-Connect-1.0.0.sha256').trim();
  assert.match(ignore, /downloads\/\*\.apk/);
  assert.equal(
    checksum,
    '65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb  LittleMinds-Connect-1.0.0.apk'
  );
});

test('production build includes the download surface and optional downloads directory', () => {
  const build = read('scripts/build.mjs');
  assert.match(build, /download-connect\.html/);
  assert.match(build, /'downloads'/);
  assert.match(build, /LittleMinds Connect download page is missing/);
});

test('Netlify serves APKs as downloadable Android packages', () => {
  const headers = read('_headers');
  assert.match(headers, /\/downloads\/\*\.apk/);
  assert.match(headers, /Content-Type: application\/vnd\.android\.package-archive/);
  assert.match(headers, /Content-Disposition: attachment/);
});

test('production verifier accepts only the frozen Connect checksum and Android download headers', () => {
  const expected = '65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb';
  assert.equal(
    parseConnectChecksum(`${expected}  LittleMinds-Connect-1.0.0.apk\n`),
    expected
  );
  assert.throws(
    () => parseConnectChecksum(`${'0'.repeat(64)}  LittleMinds-Connect-1.0.0.apk\n`),
    /frozen signed APK checksum/i
  );
  assert.throws(
    () => parseConnectChecksum(`${expected}  Wrong.apk\n`),
    /wrong APK filename/i
  );

  const validHeaders = new Headers({
    'content-type': 'application/vnd.android.package-archive',
    'content-disposition': 'attachment'
  });
  assert.doesNotThrow(() => assertConnectApkHeaders(validHeaders));
  assert.throws(
    () => assertConnectApkHeaders(new Headers({ 'content-type': 'text/html', 'content-disposition': 'attachment' })),
    /wrong Content-Type/i
  );
  assert.throws(
    () => assertConnectApkHeaders(new Headers({ 'content-type': 'application/vnd.android.package-archive' })),
    /not served as an attachment/i
  );
});

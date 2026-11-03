import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const APPROVED_NETLIFY_SITE_ID = '989d3b15-5ba4-42f7-8ba6-b53dc64fbd27';
export const CONNECT_APK_FILENAME = 'LittleMinds-Connect-1.0.0.apk';
export const CONNECT_APK_SIZE = 3024688;
export const CONNECT_APK_SHA256 = '65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb';
export const CONNECT_CHECKSUM_FILENAME = 'LittleMinds-Connect-1.0.0.sha256';

const REQUIRED_SECRETS = [
  'LMU_ANDROID_KEYSTORE_BASE64',
  'LMU_ANDROID_STORE_PASSWORD',
  'LMU_ANDROID_KEY_ALIAS',
  'LMU_ANDROID_KEY_PASSWORD',
  'NETLIFY_AUTH_TOKEN',
  'NETLIFY_SITE_ID'
];

export function verifyConnectChecksumSidecar(text) {
  const expected = `${CONNECT_APK_SHA256}  ${CONNECT_APK_FILENAME}`;
  if (String(text || '').trim() !== expected) {
    throw new Error('Release blocked: Connect checksum sidecar does not match the frozen artifact.');
  }
  return true;
}

export function verifyPublicReleaseInputs({ env = process.env, root = process.cwd(), fsApi = fs } = {}) {
  const missing = REQUIRED_SECRETS.filter(name => !String(env[name] || '').trim());
  if (missing.length) {
    throw new Error(`Release blocked: missing owner-controlled release secrets: ${missing.join(', ')}`);
  }
  if (env.NETLIFY_SITE_ID !== APPROVED_NETLIFY_SITE_ID) {
    throw new Error('Release blocked: NETLIFY_SITE_ID does not identify the approved littlemindsuniverse-app production site.');
  }

  const downloads = path.join(root, 'dist', 'downloads');
  const apkPath = path.join(downloads, CONNECT_APK_FILENAME);
  const checksumPath = path.join(downloads, CONNECT_CHECKSUM_FILENAME);

  if (!fsApi.existsSync(apkPath) || !fsApi.statSync(apkPath).isFile()) {
    throw new Error('Release blocked: frozen signed LittleMinds Connect APK is missing from dist/downloads.');
  }
  const bytes = fsApi.readFileSync(apkPath);
  if (bytes.length !== CONNECT_APK_SIZE) {
    throw new Error(`Connect APK size mismatch: expected ${CONNECT_APK_SIZE}, got ${bytes.length}`);
  }
  const actualHash = createHash('sha256').update(bytes).digest('hex');
  if (actualHash !== CONNECT_APK_SHA256) {
    throw new Error(`Connect APK SHA-256 mismatch: ${actualHash}`);
  }
  if (!fsApi.existsSync(checksumPath) || !fsApi.statSync(checksumPath).isFile()) {
    throw new Error('Release blocked: Connect SHA-256 sidecar is missing.');
  }
  verifyConnectChecksumSidecar(fsApi.readFileSync(checksumPath, 'utf8'));
  return { siteId: APPROVED_NETLIFY_SITE_ID, size: bytes.length, sha256: actualHash };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = verifyPublicReleaseInputs();
    console.log(`Frozen signed Connect APK verified: ${result.size} bytes; SHA-256 ${result.sha256}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

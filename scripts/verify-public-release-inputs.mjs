import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const APPROVED_NETLIFY_SITE_ID = '989d3b15-5ba4-42f7-8ba6-b53dc64fbd27';
export const CONNECT_APK_FILENAME = 'LittleMinds-Connect-1.0.0.apk';
export const CONNECT_APK_SIZE = 3024688;
export const CONNECT_APK_SHA256 = '65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb';
export const CONNECT_APK_CERT_SHA256 = 'e9bb1e0782aa8b19550e742fe2f59c49a0345afdd65447ce23734c64344525d5';
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

export function verifyConnectApkSignature({
  apkPath,
  androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT,
  fsApi = fs,
  execFileSyncImpl = execFileSync
} = {}) {
  if (!androidHome) throw new Error('Release blocked: Android SDK path is unavailable for APK signature verification.');
  const buildToolsDir = path.join(androidHome, 'build-tools');
  if (!fsApi.existsSync(buildToolsDir) || !fsApi.statSync(buildToolsDir).isDirectory()) {
    throw new Error('Release blocked: Android SDK build-tools are unavailable.');
  }
  const versions = fsApi.readdirSync(buildToolsDir)
    .filter(name => /^[0-9]+[.][0-9]+[.][0-9]+$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const latest = versions.at(-1);
  if (!latest) throw new Error('Release blocked: no Android build-tools version is installed.');
  const apksigner = path.join(buildToolsDir, latest, process.platform === 'win32' ? 'apksigner.bat' : 'apksigner');
  if (!fsApi.existsSync(apksigner)) throw new Error('Release blocked: apksigner executable is missing.');
  const output = execFileSyncImpl(apksigner, ['verify', '--verbose', '--print-certs', apkPath], { encoding: 'utf8' });
  const match = String(output).match(/certificate SHA-256 digest:[ ]*([a-f0-9:]+)/i);
  if (!match) throw new Error('Release blocked: apksigner did not report a signer certificate SHA-256.');
  const actual = match[1].replaceAll(':', '').toLowerCase();
  if (actual !== CONNECT_APK_CERT_SHA256) {
    throw new Error(`Release blocked: Connect APK signer certificate mismatch: ${actual}`);
  }
  return { certificateSha256: actual, apksigner };
}

export function verifyPublicReleaseInputs({ env = process.env, root = process.cwd(), fsApi = fs, execFileSyncImpl = execFileSync } = {}) {
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
  const signature = verifyConnectApkSignature({ apkPath, androidHome: env.ANDROID_HOME || env.ANDROID_SDK_ROOT, fsApi, execFileSyncImpl });
  return { siteId: APPROVED_NETLIFY_SITE_ID, size: bytes.length, sha256: actualHash, certificateSha256: signature.certificateSha256 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = verifyPublicReleaseInputs();
    console.log(`Frozen signed Connect APK verified: ${result.size} bytes; SHA-256 ${result.sha256}; signer certificate SHA-256 ${result.certificateSha256}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

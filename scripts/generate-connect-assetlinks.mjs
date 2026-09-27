import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeFingerprint } from './generate-assetlinks.mjs';

const currentFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(currentFile), '..');

export const CONNECT_ANDROID_PACKAGE = 'za.co.littlemindsuniverse.connect';

export function buildConnectAssetLinksStatement(value) {
  const fingerprint = normalizeFingerprint(value);
  return {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: CONNECT_ANDROID_PACKAGE,
      sha256_cert_fingerprints: [fingerprint]
    }
  };
}

function main() {
  try {
    const raw = process.argv[2] || process.env.LMU_CONNECT_ANDROID_CERT_SHA256 || '';
    const statement = buildConnectAssetLinksStatement(raw);
    const targetDir = path.join(root, '.well-known');
    const targetFile = path.join(targetDir, 'assetlinks.connect.json');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, `${JSON.stringify([statement], null, 2)}\n`, 'utf8');
    console.log(`Wrote ${path.relative(root, targetFile)} for ${CONNECT_ANDROID_PACKAGE}`);
    console.log('Review and merge this statement with any existing LMU statement before publishing /.well-known/assetlinks.json.');
  } catch (error) {
    console.error('Usage: npm run android:connect:assetlinks -- <Google Play app-signing SHA-256 fingerprint>');
    console.error(error.message);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main();
}

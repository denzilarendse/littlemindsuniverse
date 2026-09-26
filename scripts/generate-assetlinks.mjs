import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(currentFile), '..');

export function normalizeFingerprint(value) {
  const compact = String(value || '').trim().replace(/:/g, '').toUpperCase();
  if (!/^[0-9A-F]{64}$/.test(compact)) {
    throw new Error('Fingerprint must contain exactly 32 SHA-256 bytes, with or without colons.');
  }
  return compact.match(/.{2}/g).join(':');
}

export function buildAssetLinksDocument(value) {
  const fingerprint = normalizeFingerprint(value);
  return [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'za.co.littlemindsuniverse',
      sha256_cert_fingerprints: [fingerprint]
    }
  }];
}

function main() {
  try {
    const raw = process.argv[2] || process.env.LMU_ANDROID_CERT_SHA256 || '';
    const document = buildAssetLinksDocument(raw);
    const targetDir = path.join(root, '.well-known');
    const targetFile = path.join(targetDir, 'assetlinks.json');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${path.relative(root, targetFile)} for za.co.littlemindsuniverse`);
  } catch (error) {
    console.error('Usage: npm run android:assetlinks -- <SHA-256 certificate fingerprint>');
    console.error(error.message);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main();
}

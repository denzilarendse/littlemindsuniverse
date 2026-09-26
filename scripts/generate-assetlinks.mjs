import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = String(process.argv[2] || process.env.LMU_ANDROID_CERT_SHA256 || '').trim();
const compact = raw.replace(/:/g, '').toUpperCase();

if (!/^[0-9A-F]{64}$/.test(compact)) {
  console.error('Usage: npm run android:assetlinks -- <SHA-256 certificate fingerprint>');
  console.error('Fingerprint must contain exactly 32 SHA-256 bytes, with or without colons.');
  process.exit(2);
}

const fingerprint = compact.match(/.{2}/g).join(':');
const document = [{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: 'za.co.littlemindsuniverse',
    sha256_cert_fingerprints: [fingerprint]
  }
}];

const targetDir = path.join(root, '.well-known');
const targetFile = path.join(targetDir, 'assetlinks.json');
fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(targetFile, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(root, targetFile)} for za.co.littlemindsuniverse`);

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const copyFile = relative => {
  const source = path.join(root, relative);
  const target = path.join(dist, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
};
const copyDir = relative => {
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) return;
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name.includes('.before-') || entry.name.includes('.backup-')) continue;
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) copyDir(child); else copyFile(child);
  }
};

for (const file of ['index.html', 'connect.html', 'manifest.json', 'sw.js', '_headers']) copyFile(file);
for (const dir of ['assets', 'data', '.well-known']) copyDir(dir);

const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
if (manifest.name !== 'LittleMindsUniverse') throw new Error('Unexpected PWA manifest name');
if (manifest.display !== 'standalone') throw new Error('PWA manifest must use standalone display');
if (!fs.existsSync(path.join(dist, 'connect.html'))) throw new Error('LittleMinds Connect shell is missing from production build');
if (!fs.existsSync(path.join(dist, '_headers'))) throw new Error('Netlify security headers are missing from production build');

const deployable = [];
const collect = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full); else deployable.push(full);
  }
};
collect(dist);
const forbidden = /(SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|WHATSAPP_ACCESS_TOKEN|PAYFAST_MERCHANT_KEY|PAYFAST_PASSPHRASE|NINEROUTER_API_KEY|GROQ_API_KEY)\s*[:=]\s*["']?[A-Za-z0-9_-]{12,}/;
for (const file of deployable.filter(f => /(?:\.(?:html|js|json|css|txt)|_headers)$/i.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  if (forbidden.test(text)) throw new Error(`Potential server secret found in deployable static file: ${path.relative(root, file)}`);
}
console.log(`PASS: built ${deployable.length} static production files into dist/`);
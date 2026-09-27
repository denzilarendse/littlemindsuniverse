import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const configPath = path.join(root, 'capacitor.connect.config.json');
const assetsRoot = path.join(root, 'android', 'connectapp', 'src', 'main', 'assets');
const publicDir = path.join(assetsRoot, 'public');

if (!fs.existsSync(dist)) throw new Error('dist/ is missing; run npm run build first');
if (!fs.existsSync(configPath)) throw new Error('capacitor.connect.config.json is missing');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (config.appId !== 'za.co.littlemindsuniverse.connect') throw new Error('Connect package identity changed unexpectedly');
if (config.appName !== 'LittleMinds Connect') throw new Error('Connect app name changed unexpectedly');

fs.rmSync(assetsRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(publicDir, 'assets'), { recursive: true });

const requiredAssets = [
  'assets/app.css',
  'assets/connect.css',
  'assets/accessibility.css',
  'assets/runtime-config.js',
  'assets/connect-app.js',
  'assets/icon.svg'
];

for (const relative of requiredAssets) {
  const source = path.join(dist, relative);
  if (!fs.existsSync(source)) throw new Error(`Missing Connect production asset: ${relative}`);
  const target = path.join(publicDir, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

const connectSource = path.join(dist, 'connect.html');
if (!fs.existsSync(connectSource)) throw new Error('dist/connect.html is missing');
let html = fs.readFileSync(connectSource, 'utf8');
html = html.replace(/\s*<link rel="manifest" href="\/manifest\.json" \/>/, '');
html = html.replace('<title>LittleMinds Connect</title>', '<title>LittleMinds Connect</title>\n  <meta name="application-name" content="LittleMinds Connect" />');
fs.writeFileSync(path.join(publicDir, 'index.html'), html);
fs.writeFileSync(path.join(publicDir, 'connect.html'), html);

fs.writeFileSync(path.join(assetsRoot, 'capacitor.config.json'), JSON.stringify(config, null, 2) + '\n');
fs.writeFileSync(path.join(assetsRoot, 'capacitor.plugins.json'), '[]\n');

const forbidden = /(SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|WHATSAPP_ACCESS_TOKEN|PAYFAST_MERCHANT_KEY|PAYFAST_PASSPHRASE|NINEROUTER_API_KEY|GROQ_API_KEY)\s*[:=]\s*["']?[A-Za-z0-9_-]{12,}/;
const inspect = [path.join(publicDir, 'index.html'), ...requiredAssets.map(file => path.join(publicDir, file))];
for (const file of inspect) {
  const text = fs.readFileSync(file, 'utf8');
  if (forbidden.test(text)) throw new Error(`Potential server secret found in Connect Android payload: ${path.relative(root, file)}`);
}

if (!html.includes('LittleMinds Connect')) throw new Error('Connect Android entry does not contain the Connect shell');
if (html.includes('id="app"')) throw new Error('Connect Android entry unexpectedly contains the main LMU application root');

console.log('PASS: prepared standalone LittleMinds Connect Android web payload');

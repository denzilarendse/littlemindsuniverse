import dns from 'node:dns/promises';
import tls from 'node:tls';
import { createHash } from 'node:crypto';

const SECRET_RE = /(?:SUPABASE_(?:SECRET_KEY|SERVICE_ROLE(?:_KEY)?)|SERVICE_ROLE(?:_KEY)?|PAYFAST_(?:MERCHANT_KEY|PASSPHRASE)|GROQ_API_KEY|NINEROUTER_API_KEY|WHATSAPP_ACCESS_TOKEN)\s*[:=]/i;
const CONNECT_APK_FILENAME = 'LittleMinds-Connect-1.0.0.apk';
const CONNECT_APK_PATH = `/downloads/${CONNECT_APK_FILENAME}`;
const CONNECT_SHA_PATH = '/downloads/LittleMinds-Connect-1.0.0.sha256';
const CONNECT_EXPECTED_SHA256 = '65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb';

export function validateOrigin(value) {
  let url;
  try { url = new URL(String(value || '').trim()); }
  catch { throw new Error('Production URL is invalid'); }
  if (url.protocol !== 'https:') throw new Error('Production URL must use HTTPS');
  if (url.username || url.password) throw new Error('Production URL must not contain credentials');
  if (url.pathname !== '/' || url.search || url.hash) throw new Error('Use only the production origin, for example https://www.example.com');
  return url;
}

export function sameSiteHost(a, b) {
  const normalize = host => String(host || '').toLowerCase().replace(/^www\./, '');
  return normalize(a) === normalize(b);
}

export function assertSecurityHeaders(headers) {
  const required = [
    ['content-security-policy', /default-src\s+'self'/i],
    ['content-security-policy', /object-src\s+'none'/i],
    ['content-security-policy', /connect-src/i],
    ['x-content-type-options', /^nosniff$/i],
    ['referrer-policy', /strict-origin/i],
    ['permissions-policy', /geolocation=\(\)/i],
    ['strict-transport-security', /max-age=\d+/i]
  ];
  for (const [name, pattern] of required) {
    const value = headers.get(name) || '';
    if (!pattern.test(value)) throw new Error(`Missing or weak ${name} header`);
  }
}

export function assertRuntimeConfig(text) {
  if (SECRET_RE.test(text)) throw new Error('Public runtime config contains a server-secret variable');
  if (!/supabasePublishableKey\s*:\s*['"]sb_publishable_/i.test(text)) {
    throw new Error('Public runtime config does not expose the expected browser-safe publishable credential');
  }
  if (!/environment\s*:\s*['"]release-candidate['"]/i.test(text)) {
    throw new Error('Runtime config is not marked release-candidate');
  }
}

export function parseConnectChecksum(text) {
  const normalized = String(text || '').trim();
  const match = normalized.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
  if (!match) throw new Error('Published Connect checksum file has an invalid format');
  const [, hash, filename] = match;
  if (filename.trim() !== CONNECT_APK_FILENAME) {
    throw new Error('Published Connect checksum references the wrong APK filename');
  }
  if (hash.toLowerCase() !== CONNECT_EXPECTED_SHA256) {
    throw new Error('Published Connect checksum does not match the frozen signed APK checksum');
  }
  return hash.toLowerCase();
}

export function assertConnectApkHeaders(headers) {
  const contentType = headers.get('content-type') || '';
  if (!/^application\/vnd\.android\.package-archive(?:\s*;|$)/i.test(contentType)) {
    throw new Error('Connect APK has the wrong Content-Type');
  }
  const disposition = headers.get('content-disposition') || '';
  if (!/\battachment\b/i.test(disposition)) {
    throw new Error('Connect APK is not served as an attachment');
  }
}

function tlsProbe(hostname, port = 443, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: true });
    const timer = setTimeout(() => socket.destroy(new Error('TLS probe timed out')), timeoutMs);
    socket.once('secureConnect', () => {
      clearTimeout(timer);
      const cert = socket.getPeerCertificate();
      const validTo = Date.parse(cert?.valid_to || '');
      socket.end();
      if (!socket.authorized) return reject(new Error(socket.authorizationError || 'TLS certificate is not authorized'));
      if (!Number.isFinite(validTo) || validTo <= Date.now()) return reject(new Error('TLS certificate is expired or has no valid expiry'));
      resolve({ protocol: socket.getProtocol(), validTo: new Date(validTo).toISOString() });
    });
    socket.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function fetchResponse(origin, path, { expectedStatus = 200, timeoutMs = 12000 } = {}) {
  const response = await fetch(new URL(path, origin), {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': 'LittleMindsUniverse-release-probe/1.0' }
  });
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:' || !sameSiteHost(finalUrl.hostname, origin.hostname)) {
    throw new Error(`${path} redirected outside the production HTTPS site`);
  }
  if (response.status !== expectedStatus) throw new Error(`${path} returned HTTP ${response.status}`);
  return response;
}

async function fetchText(origin, path, options = {}) {
  const response = await fetchResponse(origin, path, options);
  return { response, text: await response.text() };
}

async function verifyConnectWebsiteDownload(origin, results) {
  const page = await fetchText(origin, '/download-connect.html');
  if (!page.text.includes(CONNECT_APK_FILENAME) || !page.text.includes(CONNECT_EXPECTED_SHA256)) {
    throw new Error('Connect download page does not expose the frozen APK metadata');
  }
  results.push('Connect website download page: PASS');

  const checksumResponse = await fetchText(origin, CONNECT_SHA_PATH);
  const publishedChecksum = parseConnectChecksum(checksumResponse.text);
  results.push('Connect published checksum metadata: PASS');

  const apkResponse = await fetchResponse(origin, CONNECT_APK_PATH, { timeoutMs: 30000 });
  assertConnectApkHeaders(apkResponse.headers);
  const apkBytes = Buffer.from(await apkResponse.arrayBuffer());
  const contentLength = Number(apkResponse.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > 0 && contentLength !== apkBytes.byteLength) {
    throw new Error(`Connect APK Content-Length mismatch: expected ${contentLength}, received ${apkBytes.byteLength}`);
  }
  if (apkBytes.byteLength < 1024 * 1024) {
    throw new Error(`Connect APK payload is unexpectedly small: ${apkBytes.byteLength} bytes`);
  }
  const actualChecksum = createHash('sha256').update(apkBytes).digest('hex');
  if (actualChecksum !== publishedChecksum || actualChecksum !== CONNECT_EXPECTED_SHA256) {
    throw new Error(`Connect APK SHA-256 mismatch: ${actualChecksum}`);
  }
  results.push(`Connect signed APK bytes + headers + SHA-256: PASS (${apkBytes.byteLength} bytes)`);
}

export async function verifyProduction(rawOrigin, { requirePayfast = false } = {}) {
  const origin = validateOrigin(rawOrigin);
  const results = [];

  const addresses = await dns.lookup(origin.hostname, { all: true });
  if (!addresses.length) throw new Error('Production hostname did not resolve');
  results.push(`DNS: ${addresses.map(item => item.address).join(', ')}`);

  const tlsResult = await tlsProbe(origin.hostname, Number(origin.port || 443));
  results.push(`TLS: ${tlsResult.protocol || 'secure'}; certificate valid to ${tlsResult.validTo}`);

  const root = await fetchText(origin, '/');
  assertSecurityHeaders(root.response.headers);
  if (!/LittleMindsUniverse/i.test(root.text) || !/\/assets\/app\.js/.test(root.text)) {
    throw new Error('Production root does not contain the LMU release shell');
  }
  results.push('LMU root + security headers: PASS');

  const connect = await fetchText(origin, '/connect.html');
  if (!/LittleMinds Connect/i.test(connect.text) || !/\/assets\/connect-app\.js/.test(connect.text)) {
    throw new Error('Production Connect shell is missing or stale');
  }
  results.push('LittleMinds Connect shell: PASS');

  await verifyConnectWebsiteDownload(origin, results);

  const manifestResponse = await fetchText(origin, '/manifest.json');
  let manifest;
  try { manifest = JSON.parse(manifestResponse.text); }
  catch { throw new Error('Production manifest is not valid JSON'); }
  if (manifest.name !== 'LittleMindsUniverse' || manifest.start_url !== '/' || manifest.display !== 'standalone') {
    throw new Error('Production manifest does not match the LMU install contract');
  }
  results.push('PWA manifest: PASS');

  const worker = await fetchText(origin, '/sw.js');
  if (!/url\.origin!==self\.location\.origin/.test(worker.text) || !/CACHEABLE_PATHS/.test(worker.text)) {
    throw new Error('Production service worker is missing the authenticated-data cache boundary');
  }
  results.push('PWA cache privacy boundary: PASS');

  const runtime = await fetchText(origin, '/assets/runtime-config.js');
  assertRuntimeConfig(runtime.text);
  results.push('Browser-safe runtime config: PASS');

  const healthResponse = await fetchText(origin, '/api/health');
  let health;
  try { health = JSON.parse(healthResponse.text); }
  catch { throw new Error('Production health endpoint is not valid JSON'); }
  if (health.ok !== true || health.service !== 'littlemindsuniverse') throw new Error('Production health endpoint is unhealthy');
  if (health.connectConfigured !== true) throw new Error('Production Connect server configuration is incomplete');
  if (health.miloConfigured !== true) throw new Error('Production Milo server configuration is incomplete');
  if (requirePayfast && health.payfastConfigured !== true) throw new Error('Production PayFast server configuration is incomplete');
  results.push(`Server health: Connect PASS; Milo PASS; PayFast ${health.payfastConfigured ? 'configured' : 'not required by this probe'}`);

  return { origin: origin.origin, results, health };
}

async function main() {
  const args = process.argv.slice(2);
  const requirePayfast = args.includes('--require-payfast');
  const target = args.find(arg => !arg.startsWith('--')) || process.env.LMU_PRODUCTION_URL;
  if (!target) {
    console.error('Usage: npm run verify:production -- https://www.littlemindsuniverse.co.za [--require-payfast]');
    process.exitCode = 2;
    return;
  }
  try {
    const report = await verifyProduction(target, { requirePayfast });
    console.log(`Production probe PASS: ${report.origin}`);
    for (const line of report.results) console.log(`- ${line}`);
  } catch (error) {
    console.error(`Production probe FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();

import { createHash } from 'node:crypto';
import { validateOrigin, sameSiteHost, verifyProduction } from './verify-production.mjs';

export const CONNECT_APK_FILENAME = 'LittleMinds-Connect-1.0.0.apk';
export const CONNECT_APK_PATH = `/downloads/${CONNECT_APK_FILENAME}`;
export const CONNECT_SHA_PATH = '/downloads/LittleMinds-Connect-1.0.0.sha256';
export const CONNECT_EXPECTED_SIZE = 3024688;
export const CONNECT_EXPECTED_SHA256 = '65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb';

export function parsePublishedChecksum(text) {
  const match = String(text || '').trim().match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
  if (!match) throw new Error('Published Connect checksum file has an invalid format');
  const [, hash, filename] = match;
  if (filename.trim() !== CONNECT_APK_FILENAME) throw new Error('Published checksum references the wrong Connect APK filename');
  if (hash.toLowerCase() !== CONNECT_EXPECTED_SHA256) throw new Error('Published checksum differs from the frozen signed Connect APK checksum');
  return hash.toLowerCase();
}

export function assertAndroidDownloadHeaders(headers) {
  const type = headers.get('content-type') || '';
  if (!/^application\/vnd\.android\.package-archive(?:\s*;|$)/i.test(type)) {
    throw new Error('Connect APK has the wrong Content-Type');
  }
  const disposition = headers.get('content-disposition') || '';
  if (!/\battachment\b/i.test(disposition)) throw new Error('Connect APK is not served as an attachment');
}

export function hasAccountDataRequestLink(html) {
  return /href\s*=\s*["']\/account-data-request(?:\.html|\/)?["']/i.test(String(html || ''));
}

async function fetchSameSite(origin, path, { timeoutMs = 12000 } = {}) {
  const response = await fetch(new URL(path, origin), {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': 'LittleMindsUniverse-play-release-probe/1.0' }
  });
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:' || !sameSiteHost(finalUrl.hostname, origin.hostname)) {
    throw new Error(`${path} redirected outside the LittleMindsUniverse HTTPS site`);
  }
  if (response.status !== 200) throw new Error(`${path} returned HTTP ${response.status}`);
  return response;
}

export async function verifyConnectPlayProduction(rawOrigin) {
  const origin = validateOrigin(rawOrigin);
  const baseline = await verifyProduction(origin.origin);
  const results = [...baseline.results];

  const privacyResponse = await fetchSameSite(origin, '/privacy.html');
  const privacy = await privacyResponse.text();
  if (!/Privacy Policy/i.test(privacy) || !/LittleMindsUniverse/i.test(privacy) || !hasAccountDataRequestLink(privacy)) {
    throw new Error('Public privacy policy is missing required LittleMindsUniverse/account-request markers');
  }
  results.push('Public privacy policy: PASS');

  const deletionResponse = await fetchSameSite(origin, '/account-data-request.html');
  const deletionPage = await deletionResponse.text();
  if (!/Delete your LittleMindsUniverse account/i.test(deletionPage)) {
    throw new Error('Public account-deletion page is missing explicit account-deletion wording');
  }
  if (!/without installing the Android app/i.test(deletionPage) || !/\/assets\/privacy-request\.js/.test(deletionPage)) {
    throw new Error('Public account-deletion page is missing the external request mechanism');
  }
  results.push('Public account deletion resource: PASS');

  const privacyClientResponse = await fetchSameSite(origin, '/assets/privacy-request.js');
  const privacyClient = await privacyClientResponse.text();
  if (!/request_account_removal/.test(privacyClient) || !/submit_privacy_inquiry/.test(privacyClient)) {
    throw new Error('Production privacy request client is stale or incomplete');
  }
  if (/SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY)|auth\.admin/i.test(privacyClient)) {
    throw new Error('Production privacy request client contains privileged browser capability');
  }
  results.push('Production privacy request client boundary: PASS');

  const checksumResponse = await fetchSameSite(origin, CONNECT_SHA_PATH);
  const publishedChecksum = parsePublishedChecksum(await checksumResponse.text());
  results.push('Published Connect checksum metadata: PASS');

  const apkResponse = await fetchSameSite(origin, CONNECT_APK_PATH, { timeoutMs: 30000 });
  assertAndroidDownloadHeaders(apkResponse.headers);
  const apkBytes = Buffer.from(await apkResponse.arrayBuffer());
  if (apkBytes.byteLength !== CONNECT_EXPECTED_SIZE) {
    throw new Error(`Connect APK size changed: expected ${CONNECT_EXPECTED_SIZE}, received ${apkBytes.byteLength}`);
  }
  const headerLength = Number(apkResponse.headers.get('content-length'));
  if (Number.isFinite(headerLength) && headerLength > 0 && headerLength !== apkBytes.byteLength) {
    throw new Error(`Connect APK Content-Length mismatch: header ${headerLength}, bytes ${apkBytes.byteLength}`);
  }
  const actualChecksum = createHash('sha256').update(apkBytes).digest('hex');
  if (actualChecksum !== publishedChecksum || actualChecksum !== CONNECT_EXPECTED_SHA256) {
    throw new Error(`Connect APK SHA-256 mismatch: ${actualChecksum}`);
  }
  results.push(`Frozen signed Connect APK preserved: PASS (${apkBytes.byteLength} bytes; SHA-256 ${actualChecksum})`);

  return { origin: origin.origin, results, health: baseline.health };
}

async function main() {
  const target = process.argv.slice(2).find(arg => !arg.startsWith('--')) || process.env.LMU_PRODUCTION_URL;
  if (!target) {
    console.error('Usage: npm run verify:play-production -- https://www.littlemindsuniverse.co.za');
    process.exitCode = 2;
    return;
  }
  try {
    const report = await verifyConnectPlayProduction(target);
    console.log(`Connect Play production probe PASS: ${report.origin}`);
    for (const line of report.results) console.log(`- ${line}`);
  } catch (error) {
    console.error(`Connect Play production probe FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();

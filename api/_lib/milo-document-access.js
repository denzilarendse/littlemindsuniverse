import { createHash } from 'node:crypto';

export const DBE_RESOURCE_HOSTS = Object.freeze([
  'education.gov.za',
  'www.education.gov.za',
  'dbecloud.org.za',
  'www.dbecloud.org.za'
]);

function assertAllowedHttpsUrl(value, allowedHosts = DBE_RESOURCE_HOSTS) {
  let url;
  try { url = new URL(String(value || '')); }
  catch { throw new Error('Resource URL is invalid'); }
  if (url.protocol !== 'https:') throw new Error('Resource URL must use HTTPS');
  if (url.username || url.password) throw new Error('Resource URL must not contain credentials');
  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new Error('Resource host is not in the approved DBE source allowlist');
  }
  return url;
}

export async function fetchCapsPdf(sourceUrl, {
  fetchImpl = fetch,
  allowedHosts = DBE_RESOURCE_HOSTS,
  maxBytes = 40 * 1024 * 1024,
  timeoutMs = 20000
} = {}) {
  const source = assertAllowedHttpsUrl(sourceUrl, allowedHosts);
  const response = await fetchImpl(source.href, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/pdf, application/octet-stream;q=0.9' }
  });
  const finalUrl = assertAllowedHttpsUrl(response.url || source.href, allowedHosts);
  if (!response.ok) throw new Error(`Resource request failed with HTTP ${response.status}`);
  const declaredLength = Number(response.headers?.get?.('content-length') || 0);
  if (declaredLength > maxBytes) throw new Error('Resource exceeds the configured size limit');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error('Resource response is empty');
  if (bytes.length > maxBytes) throw new Error('Resource exceeds the configured size limit');
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Resource response is not a recognisable PDF document');
  }
  return Object.freeze({
    sourceUrl: source.href,
    finalUrl: finalUrl.href,
    contentType: response.headers?.get?.('content-type') || 'unknown',
    byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes
  });
}

export function validateCapsDocumentMetadata(resource) {
  const required = ['id', 'title', 'grade', 'subject', 'language', 'resourceType', 'sourceUrl', 'rightsStatus'];
  const missing = required.filter(key => !String(resource?.[key] ?? '').trim());
  if (missing.length) throw new Error(`CAPS resource metadata missing: ${missing.join(', ')}`);
  assertAllowedHttpsUrl(resource.sourceUrl);
  if (!['dbe-public-download', 'open-licence', 'publisher-authorised', 'teacher-authorised'].includes(resource.rightsStatus)) {
    throw new Error('CAPS resource rights status is not approved for retrieval');
  }
  return true;
}

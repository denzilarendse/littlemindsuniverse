import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

async function fetchSameOrigin(url, origin, fetchImpl) {
  const response = await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
  const finalUrl = response.url ? new URL(response.url) : new URL(url);
  if (finalUrl.protocol !== 'https:' || finalUrl.origin !== origin.origin) {
    throw new Error('Deployment provenance check redirected outside the verified HTTPS origin.');
  }
  if (response.status !== 200) throw new Error(`${new URL(url).pathname} returned HTTP ${response.status}`);
  return response;
}

export async function verifyDeployedProvenance(rawOrigin, {
  expectedSha = process.env.GITHUB_SHA,
  expectedRepository = process.env.GITHUB_REPOSITORY,
  fetchImpl = fetch
} = {}) {
  const origin = new URL(rawOrigin);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash) {
    throw new Error('Expected a clean HTTPS deployment origin.');
  }
  if (!expectedSha || !/^[a-f0-9]{40}$/i.test(expectedSha)) {
    throw new Error('Expected a full canonical source SHA.');
  }

  const infoResponse = await fetchSameOrigin(new URL('/build-info.json', origin), origin, fetchImpl);
  const info = await infoResponse.json();
  if (info?.schemaVersion !== 1 || info?.source?.sha !== expectedSha.toLowerCase()) {
    throw new Error('Deployed build provenance SHA does not match the workflow source SHA.');
  }
  if (expectedRepository && info?.source?.repository !== expectedRepository) {
    throw new Error('Deployed build provenance repository does not match the canonical repository.');
  }
  if (!info?.artifacts?.files || typeof info.artifacts.files !== 'object') {
    throw new Error('Deployed build provenance is missing its artifact manifest.');
  }

  const verifiedFiles = [];
  for (const relative of ['index.html', 'connect.html', 'downloads/LittleMinds-Connect-1.0.0.apk']) {
    const expected = info.artifacts.files[relative];
    if (!expected) {
      if (relative.startsWith('downloads/')) continue;
      throw new Error(`Deployed artifact manifest is missing ${relative}.`);
    }
    const response = await fetchSameOrigin(new URL(`/${relative}`, origin), origin, fetchImpl);
    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== expected.size || hash !== expected.sha256) {
      throw new Error(`Deployed artifact integrity mismatch for ${relative}.`);
    }
    verifiedFiles.push(relative);
  }

  return { origin: origin.origin, sourceSha: info.source.sha, verifiedFiles };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/verify-deployed-provenance.mjs https://<netlify-deploy-url>');
    process.exitCode = 2;
  } else {
    try {
      const result = await verifyDeployedProvenance(target);
      console.log(`Deployed source provenance PASS: ${result.sourceSha}`);
      console.log(`Verified artifacts: ${result.verifiedFiles.join(', ')}`);
    } catch (error) {
      console.error(`Deployed source provenance FAIL: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

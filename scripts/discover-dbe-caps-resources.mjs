import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const cataloguePath = new URL('../data/caps-resource-catalogue.json', import.meta.url);
const ALLOWED_HOSTS = ['education.gov.za', 'www.education.gov.za', 'dbecloud.org.za', 'www.dbecloud.org.za'];

export function extractOfficialLinks(html, pageUrl) {
  const links = [];
  const anchorPattern = /<a\b[^>]*href\s*=\s*(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of String(html || '').matchAll(anchorPattern)) {
    const href = match[2].replace(/&amp;/g, '&').trim();
    const title = match[3].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!href || !title) continue;
    let url;
    try { url = new URL(href, pageUrl); } catch { continue; }
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.includes(url.hostname.toLowerCase())) continue;
    links.push({ title, url: url.href });
  }
  return links;
}

export function extractDownloadCandidates(links) {
  const candidates = new Map();
  for (const link of links) {
    let url;
    try { url = new URL(link.url); } catch { continue; }
    const ticket = url.searchParams.get('fileticket');
    if (!ticket && !/\.pdf(?:$|[?#])/i.test(url.href)) continue;
    const key = ticket || url.href;
    const existing = candidates.get(key);
    if (!existing || (existing.title.toLowerCase() === 'download' && link.title.toLowerCase() !== 'download')) {
      candidates.set(key, { title: link.title, url: link.url });
    }
  }
  return [...candidates.values()];
}

export async function discoverDbeResources({ fetchImpl = fetch, catalogue, maxAttempts = 3 } = {}) {
  const sourceCatalogue = catalogue || JSON.parse(await fs.readFile(cataloguePath, 'utf8'));
  const results = [];
  for (const source of sourceCatalogue.officialSources) {
    const result = { id: source.id, title: source.title, url: source.url, status: 'not-checked', attempts: 0, linkCount: 0, candidateDownloads: 0 };
    let lastError = null;
    let successfulPage = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      result.attempts = attempt;
      try {
        const response = await fetchImpl(source.url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
          headers: { accept: 'text/html' }
        });
        const finalUrl = new URL(response.url || source.url);
        if (finalUrl.protocol !== 'https:' || !ALLOWED_HOSTS.includes(finalUrl.hostname.toLowerCase())) {
          throw new Error('Source redirected outside the official DBE resource allowlist');
        }
        if (!response.ok) throw new Error('HTTP ' + response.status);
        successfulPage = { finalUrl, html: await response.text() };
        break;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    if (!successfulPage) {
      result.status = 'failed';
      result.error = String(lastError?.message || lastError || 'Source fetch failed').slice(0, 240);
      results.push(result);
      continue;
    }
    const links = extractOfficialLinks(successfulPage.html, successfulPage.finalUrl.href);
    const downloadCandidates = extractDownloadCandidates(links);
    result.status = 'reachable';
    result.finalUrl = successfulPage.finalUrl.href;
    result.linkCount = links.length;
    result.candidateDownloads = downloadCandidates.length;
    result.downloadCandidates = downloadCandidates;
    result.links = links;
    results.push(result);
  }
  return {
    generatedAt: new Date().toISOString(),
    catalogueVersion: sourceCatalogue.catalogueVersion,
    sourceCount: results.length,
    reachableSources: results.filter(item => item.status === 'reachable').length,
    results
  };
}

async function main() {
  const report = await discoverDbeResources();
  const output = process.argv[2] || 'artifacts/dbe-caps-resource-discovery.json';
  await fs.mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  await fs.writeFile(new URL('../' + output.replace(/^\//, ''), import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log('DBE resource discovery: ' + report.reachableSources + '/' + report.sourceCount + ' official source pages reachable');
  for (const item of report.results) console.log('- ' + item.id + ': ' + item.status + '; attempts=' + item.attempts + '; ' + item.linkCount + ' links; ' + item.candidateDownloads + ' unique download candidates');
  if (report.reachableSources !== report.sourceCount) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

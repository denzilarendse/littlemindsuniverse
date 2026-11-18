import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const cataloguePath = new URL('../data/caps-resource-catalogue.json', import.meta.url);

export function extractOfficialLinks(html, pageUrl) {
  const links = [];
  const anchorPattern = /<a\\b[^>]*href\\s*=\\s*(['"])(.*?)\\1[^>]*>([\\s\\S]*?)<\\/a>/gi;
  for (const match of String(html || '').matchAll(anchorPattern)) {
    const href = match[2].replace(/&amp;/g, '&').trim();
    const title = match[3].replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();
    if (!href || !title) continue;
    let url;
    try { url = new URL(href, pageUrl); } catch { continue; }
    if (url.protocol !== 'https:' || !['education.gov.za', 'www.education.gov.za', 'dbecloud.org.za', 'www.dbecloud.org.za'].includes(url.hostname.toLowerCase())) continue;
    links.push({ title, url: url.href });
  }
  return links;
}

export async function discoverDbeResources({ fetchImpl = fetch, catalogue } = {}) {
  const sourceCatalogue = catalogue || JSON.parse(await fs.readFile(cataloguePath, 'utf8'));
  const results = [];
  for (const source of sourceCatalogue.officialSources) {
    const result = { id: source.id, title: source.title, url: source.url, status: 'not-checked', linkCount: 0, candidateDownloads: 0 };
    try {
      const response = await fetchImpl(source.url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: { accept: 'text/html' }
      });
      const finalUrl = new URL(response.url || source.url);
      if (finalUrl.protocol !== 'https:' || !['education.gov.za', 'www.education.gov.za', 'dbecloud.org.za', 'www.dbecloud.org.za'].includes(finalUrl.hostname.toLowerCase())) {
        throw new Error('Source redirected outside the official DBE resource allowlist');
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const links = extractOfficialLinks(html, finalUrl.href);
      result.status = 'reachable';
      result.finalUrl = finalUrl.href;
      result.linkCount = links.length;
      result.candidateDownloads = links.filter(link => /\\.pdf(?:$|[?#])|fileticket=|forcedownload=true/i.test(link.url)).length;
      result.links = links;
    } catch (error) {
      result.status = 'failed';
      result.error = String(error?.message || error).slice(0, 240);
    }
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
  await fs.writeFile(new URL('../' + output.replace(/^\\//, ''), import.meta.url), JSON.stringify(report, null, 2) + '\\n');
  console.log(`DBE resource discovery: ${report.reachableSources}/${report.sourceCount} official source pages reachable`);
  for (const item of report.results) console.log(`- ${item.id}: ${item.status}; ${item.linkCount} links; ${item.candidateDownloads} download candidates`);
  if (report.reachableSources !== report.sourceCount) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

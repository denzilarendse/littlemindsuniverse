import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fetchCapsPdf } from '../api/_lib/milo-document-access.js';

const sample = {
  id: 'dbe-fet-business-studies-grade-10-learner-book',
  title: 'Grade 10 Business Studies Learner Book (English)',
  sourceUrl: 'https://www.education.gov.za/LinkClick.aspx?fileticket=ZRvMbsxkhLA%3D&tabid=3137&portalid=0&mid=10661'
};

export async function verifySampleDbeDocument({ fetchImpl = fetch, attempts = 3 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await fetchCapsPdf(sample.sourceUrl, { fetchImpl });
      return {
        generatedAt: new Date().toISOString(),
        id: sample.id,
        title: sample.title,
        status: 'retrieved-pdf-signature-valid',
        attempts: attempt,
        finalUrl: result.finalUrl,
        contentType: result.contentType,
        byteLength: result.byteLength,
        sha256: result.sha256,
        stored: false,
        note: 'Fetched in memory for access verification only; no copy was retained or rehosted.'
      };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    id: sample.id,
    title: sample.title,
    status: 'retrieval-not-verified',
    attempts,
    error: String(lastError?.message || lastError).slice(0, 300),
    stored: false
  };
}

async function main() {
  const report = await verifySampleDbeDocument();
  await fs.mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  await fs.writeFile(new URL('../artifacts/dbe-sample-document-access.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log('DBE sample PDF retrieval: ' + report.status);
  if (report.byteLength) console.log('Bytes: ' + report.byteLength + '; SHA-256: ' + report.sha256);
  if (report.error) console.log('Reason: ' + report.error);
  if (report.status !== 'retrieved-pdf-signature-valid') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

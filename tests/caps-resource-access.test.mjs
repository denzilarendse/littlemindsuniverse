import test from 'node:test';
import assert from 'node:assert/strict';
import { extractOfficialLinks, extractDownloadCandidates } from '../scripts/discover-dbe-caps-resources.mjs';
import { fetchCapsPdf, validateCapsDocumentMetadata } from '../api/_lib/milo-document-access.js';

test('DBE link discovery accepts official HTTPS resources and rejects unrelated hosts', () => {
  const html = '<a href="/files/book.pdf">Learner Book</a><a href="https://evil.example/book.pdf">Bad</a><a href="http://education.gov.za/book.pdf">Insecure</a>';
  const links = extractOfficialLinks(html, 'https://www.education.gov.za/catalogue.aspx');
  assert.equal(links.length, 1);
  assert.equal(links[0].title, 'Learner Book');
  assert.equal(links[0].url, 'https://www.education.gov.za/files/book.pdf');
});


test('DBE download links are deduplicated by official file ticket and retain descriptive labels', () => {
  const links = [
    { title: 'Grade 4 Mathematics Learner Book', url: 'https://www.education.gov.za/LinkClick.aspx?fileticket=abc123' },
    { title: 'Download', url: 'https://www.education.gov.za/LinkClick.aspx?fileticket=abc123&forcedownload=true' },
    { title: 'Teacher Guide', url: 'https://www.education.gov.za/LinkClick.aspx?fileticket=def456' }
  ];
  const candidates = extractDownloadCandidates(links);
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].title, 'Grade 4 Mathematics Learner Book');
});

test('Milo document adapter validates HTTPS, host and PDF signature before accepting bytes', async () => {
  const pdf = Buffer.from('%PDF-1.7\nfixture');
  const response = {
    ok: true,
    status: 200,
    url: 'https://www.education.gov.za/files/sample.pdf',
    headers: new Headers({ 'content-type': 'application/pdf', 'content-length': String(pdf.length) }),
    arrayBuffer: async () => pdf
  };
  const result = await fetchCapsPdf(response.url, { fetchImpl: async () => response });
  assert.equal(result.byteLength, pdf.length);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  await assert.rejects(() => fetchCapsPdf('http://www.education.gov.za/book.pdf'), /HTTPS/);
  await assert.rejects(() => fetchCapsPdf('https://evil.example/book.pdf'), /allowlist/);
});

test('Milo rejects an external redirect before making a request to the redirected host', async () => {
  const calls = [];
  const redirect = {
    ok: false,
    status: 302,
    url: 'https://www.education.gov.za/redirect',
    headers: new Headers({ location: 'https://evil.example/collect.pdf' })
  };
  await assert.rejects(
    () => fetchCapsPdf('https://www.education.gov.za/start.pdf', { fetchImpl: async url => { calls.push(url); return redirect; } }),
    /allowlist/
  );
  assert.deepEqual(calls, ['https://www.education.gov.za/start.pdf']);
});

test('Milo document adapter rejects HTML masquerading as a textbook and oversized resources', async () => {
  const htmlResponse = {
    ok: true, status: 200, url: 'https://www.education.gov.za/file',
    headers: new Headers({ 'content-type': 'text/html' }),
    arrayBuffer: async () => Buffer.from('<html>login</html>')
  };
  await assert.rejects(() => fetchCapsPdf(htmlResponse.url, { fetchImpl: async () => htmlResponse }), /not a recognisable PDF/);
  const pdfResponse = {
    ok: true, status: 200, url: 'https://www.education.gov.za/file',
    headers: new Headers({ 'content-length': '1000' }),
    arrayBuffer: async () => Buffer.from('%PDF-1.7')
  };
  await assert.rejects(() => fetchCapsPdf(pdfResponse.url, { maxBytes: 100, fetchImpl: async () => pdfResponse }), /size limit/);
});

test('Milo requires resource metadata, rights evidence and explicit AI-processing approval', () => {
  const base = {
    id: 'dbe-grade4-maths',
    title: 'Grade 4 Mathematics',
    grade: '4',
    subject: 'Mathematics',
    language: 'English',
    resourceType: 'learner-book',
    sourceUrl: 'https://www.education.gov.za/book.pdf',
    rightsStatus: 'dbe-public-download',
    rightsEvidenceUrl: 'https://www.education.gov.za/Curriculum/LearningandTeachingSupportMaterials%28LTSM%29/State-owned-textbooks.aspx',
    aiProcessingAllowed: true
  };
  assert.equal(validateCapsDocumentMetadata(base), true);
  assert.throws(() => validateCapsDocumentMetadata({ ...base, rightsStatus: 'unknown' }), /rights status/);
  assert.throws(() => validateCapsDocumentMetadata({ ...base, language: '' }), /metadata missing/);
  assert.throws(() => validateCapsDocumentMetadata({ ...base, aiProcessingAllowed: false }), /AI processing/);
});

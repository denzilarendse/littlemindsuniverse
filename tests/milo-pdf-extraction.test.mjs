import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { extractMiloPdfPages } from '../api/_lib/milo-pdf-extraction.js';

function makePdf(pageTexts) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [' + pageTexts.map((_, i) => (3 + i * 2) + ' 0 R').join(' ') + '] /Count ' + pageTexts.length + ' >>'
  ];
  pageTexts.forEach((text, index) => {
    const pageId = 3 + index * 2;
    const streamId = pageId + 1;
    const escaped = text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
    const stream = 'BT /F1 12 Tf 72 720 Td (' + escaped + ') Tj ET';
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ' + (3 + pageTexts.length * 2) + ' 0 R >> >> /Contents ' + streamId + ' 0 R >>');
    objects.push('<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + '\nendstream');
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';
  return Buffer.from(pdf);
}

const resource = {
  id: 'fixture-grade-6-maths',
  title: 'LMU Synthetic Mathematics Sample',
  grade: '6',
  subject: 'Mathematics',
  language: 'English',
  sourceUrl: 'https://education.gov.za/fixture/sample.pdf',
  rightsStatus: 'teacher-authorised',
  rightsEvidenceUrl: 'https://education.gov.za/fixture/rights',
  aiProcessingAllowed: true
};

test('extracts each PDF page separately and preserves document provenance', async () => {
  const bytes = makePdf([
    'Grade 6 Mathematics: fractions represent equal parts of a whole.',
    'Equivalent fractions have the same value even when numerators differ.'
  ]);
  const extracted = await extractMiloPdfPages(bytes, { resource });

  assert.equal(extracted.document.resourceId, resource.id);
  assert.equal(extracted.document.grade, '6');
  assert.equal(extracted.document.subject, 'Mathematics');
  assert.equal(extracted.document.language, 'English');
  assert.equal(extracted.document.pageCount, 2);
  assert.equal(extracted.document.byteLength, bytes.length);
  assert.equal(extracted.document.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(extracted.document.extractor.name, 'pdf-parse');
  assert.equal(extracted.pages[0].pageNumber, 1);
  assert.match(extracted.pages[0].text, /fractions represent equal parts/);
  assert.equal(extracted.pages[1].pageNumber, 2);
  assert.match(extracted.pages[1].text, /Equivalent fractions/);
  assert.equal(extracted.pages[0].extractionStatus, 'text-extracted');
});

test('flags image-only or nearly empty pages for OCR review instead of inventing text', async () => {
  const bytes = makePdf(['']);
  const extracted = await extractMiloPdfPages(bytes, { resource });
  assert.equal(extracted.pages[0].text, '');
  assert.equal(extracted.pages[0].extractionStatus, 'requires-ocr-review');
});

test('rejects invalid, empty and oversized input before parsing', async () => {
  await assert.rejects(() => extractMiloPdfPages(Buffer.alloc(0), { resource }), /empty/);
  await assert.rejects(() => extractMiloPdfPages(Buffer.from('not a PDF'), { resource }), /recognisable PDF/);
  await assert.rejects(() => extractMiloPdfPages(makePdf(['A sufficiently long fixture page for the size check.']), {
    resource, maxBytes: 8
  }), /size limit/);
});

test('requires explicit per-resource AI-processing permission', async () => {
  await assert.rejects(() => extractMiloPdfPages(makePdf(['A sufficiently long fixture page for rights testing.']), {
    resource: { ...resource, aiProcessingAllowed: false }
  }), /explicit AI-processing permission/);
});

test('requires complete provenance before extraction', async () => {
  await assert.rejects(() => extractMiloPdfPages(makePdf(['A sufficiently long fixture page for provenance testing.']), {
    resource: { ...resource, rightsEvidenceUrl: '' }
  }), /resource.rightsEvidenceUrl/);
});

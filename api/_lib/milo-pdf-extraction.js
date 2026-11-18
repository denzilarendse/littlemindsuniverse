import { createHash } from 'node:crypto';
import { PDFParse } from 'pdf-parse';

const PDF_PARSE_VERSION = '2.4.5';
const DEFAULT_MAX_BYTES = 128 * 1024 * 1024;
const DEFAULT_OCR_THRESHOLD = 40;

function requiredText(value, name) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error('Document provenance requires ' + name);
  return text;
}

function normaliseText(value) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/[\t\u00a0]+/g, ' ')
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract text from an already-authorised PDF while preserving page-level
 * provenance. This function does not fetch, persist, index, OCR, or call an AI.
 */
export async function extractMiloPdfPages(pdfBytes, {
  resource,
  maxBytes = DEFAULT_MAX_BYTES,
  ocrThreshold = DEFAULT_OCR_THRESHOLD,
  parserFactory = options => new PDFParse(options)
} = {}) {
  const provenance = {
    resourceId: requiredText(resource?.id, 'resource.id'),
    title: requiredText(resource?.title, 'resource.title'),
    grade: requiredText(resource?.grade, 'resource.grade'),
    subject: requiredText(resource?.subject, 'resource.subject'),
    language: requiredText(resource?.language, 'resource.language'),
    sourceUrl: requiredText(resource?.sourceUrl, 'resource.sourceUrl'),
    rightsStatus: requiredText(resource?.rightsStatus, 'resource.rightsStatus'),
    rightsEvidenceUrl: requiredText(resource?.rightsEvidenceUrl, 'resource.rightsEvidenceUrl')
  };
  if (resource?.aiProcessingAllowed !== true) {
    throw new Error('Document extraction requires explicit AI-processing permission');
  }

  const bytes = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes ?? []);
  if (!bytes.length) throw new Error('PDF document is empty');
  if (bytes.length > maxBytes) throw new Error('PDF document exceeds the configured size limit');
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Document is not a recognisable PDF');
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const parser = parserFactory({ data: bytes });
  try {
    const result = await parser.getText();
    const pages = (Array.isArray(result?.pages) ? result.pages : []).map((page, index) => {
      const text = normaliseText(page?.text);
      const pageNumber = Number.isInteger(page?.num) && page.num > 0 ? page.num : index + 1;
      return Object.freeze({
        pageNumber,
        text,
        characterCount: text.length,
        extractionStatus: text.length >= ocrThreshold ? 'text-extracted' : 'requires-ocr-review'
      });
    });

    if (!pages.length) throw new Error('PDF parser returned no pages');
    return Object.freeze({
      document: Object.freeze({
        ...provenance,
        byteLength: bytes.length,
        sha256,
        pageCount: pages.length,
        extractor: Object.freeze({ name: 'pdf-parse', version: PDF_PARSE_VERSION })
      }),
      pages: Object.freeze(pages)
    });
  } finally {
    await parser.destroy();
  }
}

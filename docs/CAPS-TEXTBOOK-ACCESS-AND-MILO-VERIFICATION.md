# CAPS Textbook Access and Milo Verification

**Status:** First implementation slice; catalogue discovery and safe PDF retrieval contract added. Full curriculum coverage and model-context integration remain open.

## Official source inventory

The initial catalogue is in `data/caps-resource-catalogue.json`. It points to the Department of Basic Education (DBE) LTSM hub, Digital Content, State-owned Textbooks pages, grade-specific state-owned textbook pages and CAPS policy statements.

The DBE Digital Content and state-owned textbook pages expose a useful but non-uniform subset of resources. They are discovery sources, not proof that all 13 grades, all subjects and all language streams have a free state-owned textbook. Use the National Catalogue to discover approved titles where the DBE does not publish a state-owned digital copy.

## Resource ingestion contract

Each resource record must include:
- Stable resource ID, title, grade, subject, language and resource type.
- Canonical source URL and original publisher/owner.
- Rights status and evidence.
- CAPS document/version and topic mapping where known.
- Publication/version date and last-checked timestamp.
- MIME type, byte length and SHA-256 after retrieval.
- Retrieval status and extraction status kept separately.

Do not mirror or redistribute a textbook based solely on the fact that a download link is publicly reachable. Retain source attribution and respect the rights/terms for each item.

## Implemented

- `api/_lib/milo-document-access.js` validates HTTPS and an explicit DBE host allowlist, follows redirects only within that allowlist, enforces a byte limit, verifies the PDF signature and calculates SHA-256.
- `scripts/discover-dbe-caps-resources.mjs` discovers links on the official DBE source pages and emits a discovery report. It does not download or rehost books.
- Automated tests cover link allowlisting, PDF signature, redirect host, size limits and metadata rights status.

## Not yet implemented

- PDF text extraction, OCR for scanned pages, table/equation/diagram extraction.
- A durable document store or vector index.
- Per-page/chunk citations and retrieval evaluation.
- Connecting retrieved textbook context into `api/milo.js` model prompts.
- Full grade/subject/language coverage matrix and publisher-rights audit.
- Live hosted Milo end-to-end tests.

The current Milo route is a tutor orchestration endpoint and has no verified textbook retrieval/context injection path. Do not claim that Milo can already read the PDFs. The safe retrieval adapter is a prerequisite, not proof of comprehension.

## Commands

```bash
node scripts/discover-dbe-caps-resources.mjs
node --test tests/caps-resource-access.test.mjs
node --test tests/android-play-readiness.test.mjs
```

The discovery script writes a timestamped JSON report under `artifacts/`; do not commit generated textbook files or large PDFs.

## Verified DBE catalogue coverage examples (18 November 2026)

The DBE pages currently list resources across a broader set than the first seed:
- Grades 4–6: Mathematics learner books; Natural Sciences and Technology learner books and teacher guides, including English and Afrikaans listings.
- Grades 7–9: Mathematics, Natural Sciences and Technology learner/teacher resources, plus interactive difficult-concept resources.
- Grades 10–12: Business Studies, Life Sciences, Mathematics, Physical Sciences, Technical Mathematics, Technical Science, CAT, IT, Agricultural Technology and related digital resources.
- Grade 10: Mathematical Literacy learner/teacher material.
- Grade 10–12: Hospitality Studies digital curriculum and video resources.

These are page-listed resource groups, not yet individually ingested items. Some source files are large: DBE listings include PDFs around 100 MB. The retrieval adapter default cap was raised to 128 MiB and timeout to 120 seconds to accommodate large official source files. Per-resource retrieval still needs size, checksum and actual PDF-signature evidence.

Official page references:
- https://www.education.gov.za/Curriculum/LearningandTeachingSupportMaterials%28LTSM%29/DigitalContent/StateOwnedTextbooksGrade4TO9.aspx
- https://www.education.gov.za/Curriculum/LearningandTeachingSupportMaterials%28LTSM%29/DigitalContent/StateOwnedTextbooksGrade10to12.aspx
- https://www.education.gov.za/Curriculum/LearningandTeachingSupportMaterials%28LTSM%29/DigitalContent.aspx

The National Catalogue must still be reconciled grade-by-grade and subject-by-subject for publisher-approved materials that are not listed as state-owned digital books.

The source seed now covers 11 DBE discovery endpoints, including:
- LTSM National Catalogue (publisher-approved titles by grade/phase).
- Digital Content and state-owned textbook listings.
- CAPS policy statements and amendments.
- Rainbow Workbooks.
- Grade 12 Mind the Gap study guides.
- Foundation Phase graded readers and big books.
- Incremental Introduction of African Languages resources.

The catalogue records 18 known resource groups from page headings and resource listings. The discovery report separately records each page's link count and deduplicated official download candidates. A link candidate is not counted as a verified PDF until the safe retrieval adapter successfully checks the bytes, and no resource is marked AI-processable until its individual rights evidence is reviewed.

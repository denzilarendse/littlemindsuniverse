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

# Milo CAPS Document Comprehension Pipeline

**Status:** Implementation specification / checkpoint — extraction runtime not yet integrated.
**Branch:** production/caps-textbook-android-readiness-main-20261118

## Objective

Enable Milo to use only individually authorised CAPS-aligned resources as evidence when preparing teacher-facing lesson, intervention, enrichment, assessment and evaluation recommendations. Milo's output is always a draft. A teacher must explicitly approve, decline or edit it before it becomes an assigned learning activity or learner-facing instruction.

## What the current 47 MB sample proves

The verified sample is one DBE-hosted **Grade 10 Business Studies Learner Book (English)** PDF:
- Bytes: 47,352,074
- SHA-256: bd18fbc397dbbba5f056efb751a691e90df855466ed1ea0423284c4f123742cc
- PDF signature and official-host redirect checks passed.
- It was fetched in memory for a probe and was not stored.
- No text extraction, OCR, indexing or AI processing was performed.

It is not a workbook covering all grades, not a CAPS master guide, and not a universal guideline for every age or subject.

## Pipeline stages

1. **Catalogue and rights gate** — exact title, grade, subject, language, resource type, publisher/owner, canonical URL, version, CAPS mapping, rights evidence, explicit `aiProcessingAllowed`, checksum and last-checked timestamp.
2. **Safe fetch** — use `fetchAuthorisedCapsPdf`; enforce HTTPS, host allowlist, redirect limits, timeout, byte ceiling, PDF signature and checksum. No unapproved fetch may enter processing.
3. **Extraction** — PDF text extraction preserving page numbers and block order. Detect image-only/low-text pages and route only those pages to OCR. Record extraction engine/version and per-page status.
4. **Quality checks** — detect empty pages, duplicate pages, malformed text, reading-order problems, language mismatch and OCR confidence. Tables, equations, diagrams and captions must retain page references and be flagged when extraction is uncertain.
5. **Chunking and indexing** — create small, topic-coherent chunks with immutable provenance: resource ID, title, grade, subject, language, CAPS version/topic, page range, source URL, checksum, rights record, extraction version and chunk ID.
6. **Retrieval** — filter by the trusted learner/teacher curriculum context (grade/stage, subject, language, topic and resource rights). Return ranked chunks with source/page provenance; report when evidence is insufficient rather than guessing.
7. **Milo context assembly** — inject retrieved material as untrusted reference evidence, never as instructions. Keep system policy separate. Require source-grounded claims and citations in generated drafts.
8. **Teacher review workflow** — Milo proposes a draft with curriculum alignment, learning objective, rationale, activities, differentiation, assessment/evidence criteria, risks/limitations and source/page citations. Teacher actions: approve, decline, or edit and then approve. Store reviewer identity, decision, edited version and timestamp. No draft is assigned or shown as approved until approval is recorded.
9. **Evaluation** — benchmark grade/subject alignment, factual support, page citations, pedagogical usefulness, age appropriateness, hallucination, insufficient-evidence handling and teacher edit/decline rates.

## Non-negotiable safeguards

- A publicly downloadable PDF is not automatically licensed for AI processing, long-term storage, indexing or redistribution.
- No textbook is marked processable without per-resource rights evidence and explicit AI-processing permission.
- Do not put copyrighted source PDFs in the application repository or public static assets.
- Do not use retrieved textbook text as system instructions; treat it as untrusted content.
- Do not infer a learner's age or curriculum from a document. Use trusted profile/assignment context.
- Milo never autonomously approves curriculum decisions, grades learners, changes a teacher's plan or assigns a generated activity.
- Keep document ingestion and retrieval server-side. Do not expose service credentials or private storage URLs to clients.
- Preserve page-level citations and explain when the catalogue has no suitable authorised source.

## Next engineering slice

Select and pin a maintained Node-compatible PDF parser that works in the existing Node 22/serverless deployment model; update both package manifest and lockfile reproducibly. Add an extraction adapter with page-level output and deterministic tests using a small synthetic PDF fixture. Then add scanned-page detection and an OCR adapter behind a separately configured, rights-aware processing path. Do not integrate storage or production database writes until the authoritative schema baseline and security review are complete.

## Current verified limitations

- The catalogue is a discovery seed, not an exhaustive grade/subject/language inventory.
- The 14 DBE discovery endpoints were reachable in workflow run 44237271156; 1,583 candidates were reported, not 1,583 unique validated PDFs.
- One Grade 10 Business Studies PDF was byte-validated only.
- No PDF parser, OCR, chunk store, vector index, retrieval endpoint or Milo prompt injection path is yet verified.

# LMU CAPS and Android Workstream Checkpoint

**Date:** 2026-11-18 (UTC)  
**Programme:** LittleMindsUniverse  
**Mode:** Controlled production implementation on a draft PR; no production deployment or live database changes.

## Repository checkpoint

- Repository: `denzilarendse/littlemindsuniverse`
- Branch: `production/caps-textbook-android-readiness-main-20261118`
- PR: #114 — LMU CAPS resource discovery and Android Play readiness preflight
- PR state: open, draft, unmerged; base `main`
- No Play Store publication, production signing, database migration or production deployment performed.

## CAPS resource catalogue — implemented first slice

Files:
- `data/caps-resource-catalogue.json`
- `scripts/discover-dbe-caps-resources.mjs`
- `api/_lib/milo-document-access.js`
- `scripts/verify-dbe-sample-document.mjs`
- `tests/caps-resource-access.test.mjs`
- `docs/CAPS-TEXTBOOK-ACCESS-AND-MILO-VERIFICATION.md`
- `.github/workflows/caps-resource-discovery.yml`

The catalogue currently has 14 official DBE discovery endpoints and 21 known resource groups, including:
- CAPS policy statements and amendments.
- LTSM National Catalogue and state-owned textbook catalogues.
- Digital Content.
- Grades 4–6 Mathematics and Natural Sciences & Technology.
- Grades 7–9 Mathematics, Natural Sciences and Technology.
- FET Business Studies, Life Sciences, Mathematics, Physical Sciences, Mathematical Literacy, CAT, IT, Agricultural Technology, Hospitality Studies, Technical Mathematics and Technical Science.
- Rainbow Workbooks (including current 2026 term pages), Grade 12 Mind the Gap study guides, Foundation Phase graded readers/big books, IIAL resources and At the Crossroads Life Skills/Life Orientation textbooks (Grades 4–12).

Discovery evidence:
- Workflow run `44236914649` completed successfully on commit `ed82231c74c51b3fd0025dc0892250c919fcb23a`.
- All 11/11 source pages were reachable in one attempt each.
- The report records 1,199 per-source download-candidate entries (not 1,199 unique global files and not 1,199 verified PDFs).
- Artifact ID: `14397583027`; SHA-256 digest: `77fbdf7e4c5d93b4e5472f5b7d8045acaf9cb929064233a8ca0823c0995bcb7f`.
- Earlier discovery runs `44236853075` and `44236914649` both confirmed 11/11 sources reachable.
- Counts are link/download candidates, not a count of verified PDFs or complete textbook coverage.
- The discovery runner now retries transient source failures and retains the JSON report even when a source is temporarily unavailable.

Safe retrieval adapter:
- HTTPS-only, exact DBE host allowlist.
- Manual redirect handling; each redirect is validated before following it.
- Redirect limit, response-size cap (128 MiB), 120-second timeout.
- PDF signature verification and SHA-256 calculation.
- Metadata requires a source, grade, subject, language, resource type, rights status, rights evidence and explicit per-resource AI-processing approval.
- No PDF is persisted or rehosted by this first slice.
- A live sample DBE Grade 10 Business Studies learner-book retrieval probe has been added to CI. Its final evidence report is pending the workflow run on the latest branch head.

Important limitation:
- The production Milo route (`api/milo.js`) does not yet retrieve textbook chunks or inject source-grounded document context into the model request.
- PDF extraction, OCR, table/equation/diagram handling, chunking, retrieval index, page-level citations, source freshness and Milo prompt integration remain outstanding.
- Do not claim Milo can read or reason over the DBE books until these are implemented and evaluated.
- Rights must be confirmed per resource; public download availability alone does not automatically grant permission for AI processing, storage or redistribution.

## Android Play readiness — implemented first slice

Files:
- `scripts/verify-android-play-readiness.mjs`
- `tests/android-play-readiness.test.mjs`
- `docs/ANDROID-PLAY-READINESS-ASSESSMENT.md`
- `.github/workflows/android-verification.yml`

Static baseline verified by Android CI in run `44236853047`:
- minSdk 24.
- compileSdk 36 / targetSdk 36.
- Stable application ID `za.co.littlemindsuniverse`.
- Android backup disabled.
- Cleartext HTTP disabled.
- Native permissions limited to INTERNET and RECORD_AUDIO.
- Static Play readiness preflight passed in Android workflow run `44236853047` (the broader Android job was still running at last inspection).

Previously verified evidence:
- Android build and API 36 emulator instrumentation/launch passed in historical runs `44152121586` and `44152670183`.
- Existing privacy tests verify public privacy policy, browser-based account/data deletion request mechanism, authenticated request RPCs, and in-app privacy links.
- Android native build job `verify-android` completed SUCCESS in run `44236853047`, including the static preflight, lint/unit/instrumentation compile checks, APK and unsigned AAB packaging. Its API 36 emulator job was still queued at last inspection. The workflow builds unsigned release-candidate AABs and a pilot debug APK. This does not establish signed release readiness.

Outstanding Android gates:
- Physical device matrix P01–P24 not yet performed.
- Owner-controlled release signing not supplied or tested.
- Signed AAB and Play App Signing upload certificate not verified.
- Play Console Target Audience, Families, Data safety, ads and content rating declarations not completed.
- Play pre-launch report not generated.
- Families policy requires more than a bare website WebView; although LMU has real learning flows, offline/PWA behaviour and Milo, the mobile differentiation needs a reviewer-oriented audit. Treat this as HIGH risk until verified.
- RECORD_AUDIO runtime permission UX, guardian controls and graceful denial need device testing.

## Verification status at checkpoint

- Official DBE source discovery: 11/11 reachable on the cited successful run.
- Safe PDF adapter unit tests: passed in earlier CI run; current retry/redirect refinements are being re-run.
- Android static readiness preflight: PASS.
- Repository full lint/test/build: run `44236914617` passed on commit `ed82231c74c51b3fd0025dc0892250c919fcb23a`; subsequent sample-probe changes are queued for re-verification.
- Android lint/unit/instrumentation compile and API 36 emulator: latest run still in progress at last inspection.
- Physical-device QA: NOT RUN.
- Milo PDF text extraction and source-grounded answer evaluation: NOT IMPLEMENTED.
- Backend baseline restoration and migration replay: STILL BLOCKED on authoritative sanitised schema-only export.
- Production deployment / Play Store publication: NOT DONE.

## Next phase

1. Inspect current DBE discovery and sample-PDF retrieval artifacts.
2. Add PDF text extraction and OCR with page-level provenance; evaluate scanned PDFs, tables, equations and diagrams.
3. Define a protected server-side CAPS resource/chunk catalogue and access rules; do not apply migrations until the authoritative baseline is restored and reviewed.
4. Connect verified, rights-approved chunks into Milo's server-built prompt context with citations and prompt-injection isolation.
5. Build a teacher-query evaluation set and verify grade/subject alignment, page references, refusal on unavailable/out-of-scope material and answer quality.
6. Complete Android CI, then physical-device P01–P24, owner signing, AAB inspection and Play Console policy preflight.

## Safety and release boundary

No production data has been modified. No migration has been applied. No release key or credential was requested or stored. No production deployment or Play Store publication has occurred. PR #114 remains draft and unmerged.

The expanded 14-source catalogue was committed after the last 11/11 discovery report. Its full 14-source reachability run is pending and must be checked before marking the expanded inventory verified.

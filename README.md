# LittleMindsUniverse — Production Release Candidate

LittleMindsUniverse is the deployable web/PWA learning platform for ages 2–18 with Learner, Teacher, Parent/Guardian and Admin roles. The current release candidate includes six age stages, authentic learning/evidence, mastery tracking, teacher-governed Milo workflows, classroom/reporting flows, LittleMinds Connect relationship-authorized messaging, Supabase live integration, PayFast server integration, PWA support and an Android Capacitor/API-36 wrapper.

WhatsApp is historical only and is not a runtime or release dependency. LittleMinds Connect is the canonical communication layer.

## Local Android-first development

```bash
cd /storage/emulated/0/Development/LittleMindsUniverse
npm ci --ignore-scripts
npm run check
npx serve . -l 5500
```

Open `http://localhost:5500`.

## Verification

```bash
npm run check
```

`npm run check` performs syntax/lint checks, the automated regression suite, smoke tests and the production web build. GitHub Actions additionally audits shipped dependencies and builds/verifies the Android API-36 release candidate.

## Android

The permanent application ID is:

```text
za.co.littlemindsuniverse
```

Useful commands:

```bash
npm run android:sync
npm run android:bundle
```

Owner-controlled release signing and Digital Asset Links are intentionally separate external gates. See `docs/ANDROID-OWNER-SIGNING.md`; never commit a keystore, `android/key.properties`, passwords or Play credentials.

## Production configuration

Use `.env.example` as the server-side deployment-variable template. Browser/mobile bundles may contain only the Supabase publishable credential; service-role/secret provider keys remain server-side.

## Deployment and release evidence

- `docs/DEPLOYMENT.md` — deployment and release gates
- `docs/SECURITY.md` — security boundaries
- `docs/LITTLEMinds-CONNECT-ARCHITECTURE.md` — LittleMinds Connect architecture
- `docs/ANDROID-OWNER-SIGNING.md` — signing/App Links procedure
- `docs/RELEASE-EVIDENCE-20260926.md` — current evidence-based release state

A successful source build is not by itself a public-launch or store-approval decision. Hosted authenticated E2E, recovery/rollback, signing, physical-device and store gates remain evidence-driven.

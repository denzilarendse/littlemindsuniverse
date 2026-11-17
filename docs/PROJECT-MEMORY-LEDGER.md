# LittleMindsUniverse — Project Memory Ledger

**Ledger version:** 1.1  
**Last scan:** 2026-11-17, current session (UTC+02:00)  
**Canonical repository:** denzilarendse/littlemindsuniverse  
**Working branch:** production/lmu-blueprint-room-shell-20261117  
**Status:** RELEASE HOLD — interactive room demo MVP and backend contract are checkpointed; live room integration, child identity/consent hardening, Android artifact and release verification remain outstanding.

## Objective

Deliver one LittleMindsUniverse web application and Android Capacitor wrapper with twelve connected rooms, one identity model, shared learning progress, guardian consent, teacher workflows, Milo tutoring and child-safe controls, using the supplied LMU blueprint as product scope.

## Source scan and already-complete work

Scanned current project conversation and accessible LMU handover context; project instructions; canonical GitHub PR/branch and ledger; Supabase project, table definitions, helper functions, policies and security advisors; current workflow run summaries; existing Vercel association.

Already present and not rebuilt:
- Shared application shell and role-aware navigation.
- Supabase Auth and learner/guardian/teacher/admin profiles.
- Academy tasks, evidence submission and teacher review.
- Milo server-backed tutoring and session records.
- Shared mastery/progress and classroom workflows.
- Parent reporting, guardian evidence consent/receipts and guardian feature controls.
- LittleMinds Connect messaging, accessibility, PWA and Capacitor wrapper.
- Existing security/RLS migrations.

## Architecture decision

The frozen Phase 1 spec proposed React + TypeScript + Vite. Canonical source is a working static-JavaScript app with Supabase/Capacitor integration and passing tests. Preserve the existing architecture to avoid destructive rework; architecture mismatch remains open for product decision.

## Completed implementation

- Blueprint room demo surfaces and shell navigation for PlayWorld, StoryVerse, Career Galaxy, Adult Academy, Creator Studio, Community Garden, Parent Hub, Teacher Studio and Admin Console.
- Role/age gates, demo/live separation, shared demo mastery, PWA precache and 8 new regression tests.
- Draft PR #112 remains open, draft and unmerged.
- Added `docs/ROOMS-BACKEND-CONTRACT-20261117.md` defining the live data model, role authorization, consent reuse, child PIN requirements, acceptance tests and rollout sequence.
- Added `docs/drafts/rooms-backend-schema.draft.sql`. It is explicitly a design sketch wrapped in a transaction ending with ROLLBACK; it is not a deployable migration and must not be applied as production DDL.
- The schema design reuses existing guardian consent and feature-control tables rather than introducing a parallel consent ledger.

## Current evidence

- PR: https://github.com/denzilarendse/littlemindsuniverse/pull/112
- Latest branch commit after this session's design artifacts: ebfbbdb9f32667d6e24c6f9b329201790da39b63
- Supabase project: zcokxljcsfkrlouzragv; ACTIVE_HEALTHY; PostgreSQL 17.6.
- Existing tables inspected read-only: profiles, learners, guardian_learner_links, guardian_evidence_consents, guardian_evidence_consent_events, guardian_consent_receipts, guardian_feature_controls, learning_items, learning_item_recipients, learner_skill_mastery and mastery_evidence.
- Existing authorization helper `can_access_learner(uuid)` covers learner self, verified guardian and active classroom teacher. Existing guardian consent RPC checks verified primary guardian capability and writes versioned receipts.
- Supabase security advisor snapshot: 14 RLS-enabled tables without policies; 94 SECURITY DEFINER functions executable by authenticated; leaked-password protection disabled; pg_net in public schema. These are pre-existing findings and were not modified. Do not blanket-revoke functions; assess each dependent flow.
- Current PR metadata: open, draft, unmerged; mergeable reported false after latest docs commits. Recheck branch/merge status before any merge consideration.
- CI/workflow summary: earlier 2 release/public checks completed successfully; Android verification was still in progress at the last observed workflow snapshot. New docs-only commits have no workflow run returned yet.
- A Vercel preview deployment was building at last observation. This is a preview, not a production release.

## Test results (last code verification)

- `npm run check`: PASS — 313 tests, syntax scan 117 JS files, smoke tests and static build.
- `npm run android:sync`: PASS.
- `npm audit --omit=dev`: PASS — zero production dependency vulnerabilities; full install audit has 6 moderate dev dependency advisories.
- Android APK: NOT BUILT — previous sandbox lacked Java/JAVA_HOME.
- Hosted authenticated browser E2E: NOT RUN.
- Live RLS/API integration for new rooms: NOT IMPLEMENTED OR TESTED.
- Current schema contract and SQL sketch are documentation-only; no SQL test or migration executed.

## Outstanding work

1. Create a disposable/local Supabase test environment and implement migration plus positive/negative role-matrix tests.
2. Define and implement the validated append-only room activity RPC and catalogue publication/moderation model.
3. Implement server-backed room reads/writes and integrate with existing mastery/review pipeline.
4. Implement Community Garden reporting, human moderation, guardian opt-in and age gates on the server.
5. Implement cross-device guardian time limits and quiet hours.
6. Resolve adult learner identity/age verification; current role model does not establish Adult Academy eligibility.
7. Design and implement child profile unlock/PIN only after security model approval; never store plaintext PIN or create a duplicate child identity.
8. Verify Milo memory/data minimization and multilingual content/narration; verify South African career qualification/salary data before making claims.
9. Complete live Parent Hub, Teacher Studio and Admin Console operations.
10. Resolve React-vs-static-JS architecture conflict.
11. Build/sign Android APK/AAB in JDK 21 + Android SDK environment and test on physical devices.
12. Run hosted authenticated E2E, RLS negative tests, backup/restore and rollback checks.
13. Resolve pre-existing Supabase advisor findings through separate scoped work.

## Risks and blockers

- New room pages are still demo-only, not live-backed.
- Child safety cannot rely on UI-only age checks, client PII regexes or localStorage.
- Current user/consent model differs from blueprint's child PIN-first onboarding; must preserve guardian-first authority and legal review.
- 14 existing RLS tables without policies and 94 authenticated-callable SECURITY DEFINER functions warrant a separate security remediation programme.
- POPIA/legal review is needed for consent language, retention, age thresholds and cross-border processing.
- Android build environment/signing and hosted E2E are unavailable/unverified.
- Production release remains on hold.

## Approvals and deployment

- No live migration applied and no production data changed.
- No production deployment or main-branch merge performed.
- Explicit approval remains mandatory before live DB migrations and production deployment.
- PR #112 remains draft/unmerged.

## Recovery instructions

Continue on `production/lmu-blueprint-room-shell-20261117`. Re-run `npm ci --ignore-scripts && npm run check`. Android commands: `npm run android:sync`, `npm run android:apk`, `npm run android:bundle`. Never commit keystores, passwords or service-role secrets. Do not reset/delete/modify live Supabase as a shortcut.

## Next phase brief

Implement the backend contract in a local or disposable Supabase branch, starting with content catalogue and append-only activity, then community moderation. Write SQL role-matrix tests before enabling Data API grants. Keep live migration and production deployment approval-gated. Separately triage existing advisor findings without blanket policy/function changes.

## Free local backend checkpoint — 2026-11-17

- User decision: pause paid Supabase branch work and continue using free/local tooling only.
- No Supabase cloud branch was intentionally created, no live migration was applied, and no production data was changed in this checkpoint.
- Added `database/migrations/20261117_lmu_rooms_read_boundary.sql`: additive PlayWorld/StoryVerse catalogue + activity schema, RLS read policies, published-only catalogue visibility, activity visibility through existing `can_access_learner(uuid)`, explicit authenticated SELECT grants, and no client write grants/policies.
- Added `tests/room-backend-contract.test.mjs`: five static contract tests for additive scope, publication audit, relationship-scoped reads, read-only grants and payload bounds.
- Added `docs/LOCAL-BACKEND-DEV-20261117.md`: free/local workflow and migration-chain constraints.
- Verification actually performed: isolated Node.js 22 run of the five new static contract tests — 5 passed, 0 failed. The test and migration were mirrored into a temporary local directory for execution; repository clone was unavailable because this runtime cannot resolve github.com.
- Not run: full `npm run check`, SQL parser/database execution, RLS role-matrix tests, Supabase CLI, Docker/Podman. Environment has Node.js 22 and Java 21; `psql`, Supabase CLI, Docker and Podman are absent.
- Important limitation: existing database migrations are documented as deltas, not a zero-to-one bootstrap. A sanitized baseline/local fixture is required before a full local PostgreSQL run.
- No UI client adapter or write RPC was added; live room activity remains disabled. Demo behavior remains unchanged.

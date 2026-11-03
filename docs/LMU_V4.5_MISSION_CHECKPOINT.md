# LMU V4.5 Mission Checkpoint

**Checkpoint date:** 2026-11-03  
**Mission:** LittleMindsUniverse V4.5 Unified Supervercity  
**Controller:** DRAVEN  
**Current phase:** Phase 2 — research, architecture and release verification  
**Current milestone:** Fail-closed release pipeline implementation, SHA provenance and test-environment isolation  
**Overall status:** IN PROGRESS — Phase 2 acceptance BLOCKED

## Canonical source and repository state

- Repository: `denzilarendse/littlemindsuniverse`
- Canonical branch: `main`
- Last verified main SHA: `91289ae8796af660c287a8f94936c94b383b9879`
- Main's latest commit is documentation-only and adds `docs/LMU_V4.5_MASTER_ENGINEERING_MISSION.md`.
- The original 65-page Master Plan is not present in the recursive main-branch tree; project file search did not return a matching uploaded source. The operational engineering document contains Phase 2 requirements but does not define all later phases. Do not infer the original phase sequence or acceptance criteria.
- No mission checkpoint existed on main at first inspection. This checkpoint is preserved on a separate non-production branch.

## PR #108 — active remediation branch

- Title: Prevent false-green public release checks when production steps are skipped.
- State: OPEN, DRAFT; not merged.
- Branch: `fix/public-release-gate-requires-secrets`
- Current head at last verification: `7d089f8af9e69c634ef321d8904a2613f4776a23`
- Base: `main` at `91289ae8796af660c287a8f94936c94b383b9879`; branch was reconciled with current main through a two-parent merge commit `7197fe7a7e9b5838e25f9ff31dd14158cf0ac1d3`.
- DRAVEN changes on this branch:
  - added `capacitor.connect.config.json` to both PR and main-push path filters;
  - added an executable fail-closed verifier for owner signing secrets, Netlify site identity, frozen Connect APK size/hash and checksum sidecar;
  - added negative-path unit tests for missing secrets, wrong site, missing APK, wrong size and wrong digest;
  - added source-SHA and SHA-256 artifact manifest generation to `dist/build-info.json`;
  - added deployed-provenance verification for canonical source SHA and critical static files;
  - changed release sequence to build → Netlify draft preview → preview smoke/provenance checks → production gate → production deployment;
  - production promotion now requires owner-triggered `workflow_dispatch` from `main` with `confirm_production=true`;
  - owner-only deployment conditions added; production is no longer promoted on ordinary main pushes;
  - removed job-level secret exposure, scopes secrets to exact release steps, disables checkout credential persistence and avoids passing Netlify token in process arguments;
  - updated release documentation and regression tests.
- The PR remains DRAFT and must not be merged without explicit user authorization.

### CI evidence — current PR head

Current PR head: `7d089f8af9e69c634ef321d8904a2613f4776a23`.

- `public-release` run `41554371304`: **PASS**. Locked install, runtime dependency audit, `npm run check`, Android release APK/AAB build and release-gate tests completed. Node test output: **316 tests, 316 passed, 0 failed**. PR event intentionally skips owner signing, Netlify preview and production deployment.
- Previous `public-release` run `41553474711` failed 1 of 316 tests due to a brittle static assertion matching the entire Netlify URL expression. The assertion was corrected to count the two `deploy_ssl_url` uses; latest current-head run passes.
- `release-verification` run `41554371278`: **PASS**.
- `android-verification` run `41554371194`: **PASS**. Source verification, runtime dependency audit, Android sync, standalone Connect payload preparation, native identity/SDK/child-safety checks, lint, unit/instrumentation compile, API 36 release builds and artifact uploads completed.
- Android artifacts (all unsigned; expire 2026-12-03):
  - `littlemindsuniverse-android-api36-unsigned`, ID `13194310385`, ZIP SHA-256 `a2c6c97f82291cbdf0860c939a01766f8f081f06e65fa94469d91684a15667a3`.
  - `littlemindsuniverse-pilot-debug-apk`, ID `13194060834`, ZIP SHA-256 `d6c86034c034f1d98076f2b1aca0576aeda17d1edca89f3386781758d003cf92`.
  - `littleminds-connect-android-api36-unsigned-apk`, ID `13193920988`, ZIP SHA-256 `f1bc595af9ac5425152c03d642f567dc9c7658b56377e00c123f8ff2a7fa89b1`.
  - `littleminds-connect-android-api36-unsigned`, ID `13193755981`, ZIP SHA-256 `20eedbe3e74a50bc28ca9ab5655c5657a9a34e2007406d08b3a92c8586fc4b09`.
- These artifacts are unsigned build candidates, not the frozen owner-signed direct-download APK.
- PR run does not execute the main-branch Netlify preview or manual production path. Those paths remain NOT TESTED.

## Phase 2 findings

### Release workflow — FAIL / critical on main; remediation implemented on PR branch

- Main-branch `.github/workflows/public-release.yml` remains the pre-remediation version until PR #108 is reviewed and merged.
- Main run `40453502266` at SHA `2c18e9b1ad14a83272f0f60dad33b3c4b2c0b314` concluded SUCCESS while:
  - owner signing preparation was SKIPPED;
  - signed APK verification/publication was SKIPPED;
  - signed artifact upload was SKIPPED;
  - Netlify production deployment was SKIPPED;
  - post-deploy smoke test was SKIPPED;
  - deployment evidence upload was SKIPPED;
  - unsigned release candidate upload succeeded.
- This is direct evidence of a false-green release workflow.
- PR #108 now contains a preview-first, manually confirmed, owner-only production sequence and testable fail-closed gates. The main-push/manual-dispatch execution path has not yet run; do not claim it is verified.
- Latest main run `41550386330` at SHA `91289ae8796af660c287a8f94936c94b383b9879` was release-verification only. It passed tests/build/artifact hygiene but did not run public-release.
- The current PR branch public-release CI run `41554371304` succeeded for preflight (316/316 tests); deployment and production steps were skipped by design. A previous static-test failure was fixed and the current-head run passed.

### Branch protection — FAIL / critical

- GitHub branch API reports `main.protected=false` and protection disabled.
- Direct branch-protection endpoint returned 403 (integration permission limitation), but the branch object itself explicitly reports unprotected.
- Required status checks and protected-branch enforcement are not established.
- Do not merge PR #108 until repository owner enables branch protection and requires PR review plus `verify`, `verify-package-deploy`, and `verify-android` checks.

### Netlify provenance and preview — BLOCKED / NOT TESTED

- Correct production site confirmed: `littlemindsuniverse-app`, site ID `989d3b15-5ba4-42f7-8ba6-b53dc64fbd27`.
- Current published deploy: `6ac32e778f64ae1e8cf84c65`, state READY, branch `main`, created 2026-10-05.
- Netlify deploy metadata has `commit_ref=null`, `commit_url=null`, and `commit_message=null`; source-SHA parity cannot be established for the current production deploy.
- Netlify metadata confirms health route `/api/health`; main workflow still smoke-tests the old `/.netlify/functions/health` route.
- Fresh Netlify metadata reinspection confirms the same production deploy is still READY, created 2026-10-05, `deploy_source=cli`, `branch=main`, but `commit_ref=null`, `commit_url=null`, `commit_message=null`. Source-SHA parity remains unprovable. Runtime smoke testing remains NOT TESTED.
- PR #108 now writes a source-SHA/artifact-hash manifest into the deploy bundle and verifies the manifest from the actual Netlify deploy URL. This code is implemented and unit-tested, but no Netlify preview has been created by this session.

### Vercel — deployment metadata PASS; runtime smoke NOT TESTED

- Vercel project `littlemindsuniverse` exists; project reports `live=false`.
- Main deployment `dpl_5QEGkWY1Xq9TY56BhEC7STcb3Ne6` is READY and records exact main SHA `91289ae8796af660c287a8f94936c94b383b9879`.
- Current PR #108 Vercel preview deployment `dpl_9fRnRnefRfcXojVyMCHTUAPLYU8D` is READY and records exact current head SHA `7d089f8af9e69c634ef321d8904a2613f4776a23`. SSO/deployment protection remains enabled; protected runtime smoke testing was not performed.
- SSO/deployment protection is enabled for non-custom-domain deployments. Runtime/browser smoke testing was not performed. The available protected-URL fetch creates or reuses a temporary share link accessible to anyone with the link; no share link was created without authorization.

### Supabase isolation — BLOCKED pending approval

Organization:
- `LittleMinds Universe (Pty)Ltd`
- Organization ID: `dkkwrleslatgzlsigahz`
- Current plan: Free.

Projects observed:
- Production `zcokxljcsfkrlouzragv`: ACTIVE_HEALTHY; read-only.
- Forge `ekswytyvfwgrpzfzxtgf`: ACTIVE_HEALTHY; inspection-only, not a test database.
- Legacy project `ghgkeqjtztmrtqmrqsfs`: INACTIVE; not approved as test.
- `LittleMindsUniverse Adults Staging` `rjtwpwlzwjejiuxmmycw`: INACTIVE; not approved as test.
- `CareerLaunch SA` `rqyvfbuvdhbtwakkqnok`: INACTIVE; not approved as test.
- A fresh `list_branches` call returned only the default `main` branch (branch inventory length 1); no distinct isolated development branch exists. Its `with_data=false` property does not by itself make the default branch an approved test environment.

Supabase returned a development-branch estimate of **US$0.01344/hour**. Continuous use is approximately **US$0.32256/day** or **US$9.6768 per 30 days**, before additional usage charges/taxes. A new development branch would receive a fresh database with production migrations applied and no production data copied. No branch/project has been created. Explicit approval and organization confirmation are required.


### Production Supabase advisor snapshot — READ ONLY

Read-only advisor checks were run against production at 2026-11-03 00:39 UTC. No SQL writes or schema changes were made.

Security advisor:
- 14 tables have RLS enabled but no policies (INFO; review whether service-only access is intentional).
- 94 authenticated-executable SECURITY DEFINER functions (WARN; each grant and function boundary requires review, not blanket revocation).
- 1 `pg_net` extension in `public` (WARN).
- 1 Auth leaked-password protection setting disabled (WARN).

Performance advisor:
- 18 unindexed foreign keys (INFO).
- 59 unused indexes (INFO; do not drop based solely on this advisor).
- 4 tables with multiple permissive policies (WARN).

These are advisory findings, not confirmed exploitable vulnerabilities. They require migration/source review and isolated integration testing before any remediation. Production remains read-only.

### Signed LM Connect artifact — BLOCKED

- Current repository contains the checksum sidecar but not `LittleMinds-Connect-1.0.0.apk`.
- The frozen release gate requires exactly 3,024,688 bytes and SHA-256 `65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb`.
- Recent Android workflow artifacts inspected are explicitly named unsigned (including `littleminds-connect-android-api36-unsigned` and `littleminds-connect-android-api36-unsigned-apk`). They are not substitutes and were not treated as signed.
- No owner-signed APK was found in the repository source or the recent runs inspected. The historical artifact search was not exhaustive across all 1,308 runs.

### Uploaded production package — RELEASE HOLD

The uploaded `LMU-V4.5-Production-Package.zip` was inspected locally:
- ZIP extraction succeeded.
- All 6 manifest SHA-256 entries matched.
- Curriculum JSON parsed; 288 question objects (96 each Foundation, Discovery, Creator).
- `api/milo.js` passed `node --check`.
- These checks establish package integrity and syntax only, not product correctness or production readiness.

The accompanying initial QA report classifies the package RELEASE HOLD. Material findings include:
- no eight-engine Milo routing implementation in the HTML/API;
- learner history/evidence stored in localStorage in the preview;
- no integrated authenticated evidence → teacher review → mastery → recommendation workflow;
- SQL `approve_mastery()` permits `school_admin` as well as teacher;
- `learners_self_update` does not constrain `guardian_user_id`, creating possible guardian reassignment/access risk if UPDATE privileges permit it;
- no actual SQL/RLS/concurrency tests, browser/mobile tests, Netlify tests or live endpoint tests were run.
The package is a separate generated starter/preview and is not verified as canonical GitHub application source. Do not deploy it or migrate its SQL to production.

## Additional source document inspected

The uploaded `tenders sa.pdf` is a 19-page foundational blueprint dated 2026-10-26, not the original 65-page LMU Master Plan. It defines Tenders SA source requirements for a later module milestone: official-source tender discovery with last-checked timestamps and amendments; tender analysis tied to original pages/sections; business readiness statuses; realistic cost/pricing estimates with assumptions; draft documents that never invent business facts; user-reviewed submissions; deadline reminders; secure tenant-separated document storage and POPIA safeguards; and a limited MVP rather than claiming full national coverage. It also prohibits tender-win guarantees and unlawful procurement assistance. This document has been inspected but no Tenders SA implementation was started or reordered ahead of Phase 2.

## Safety and approvals

- Production Supabase was not written to.
- Forge was not written to.
- No Supabase project/branch was created.
- No PR was merged.
- No production deployment, promotion, rollback, DNS change or security-setting change was performed.
- No secrets were read or changed.
- No signed APK was accessed.
- No Vercel share link was created.

## Outstanding critical blockers

1. Original 65-page Master Plan unavailable; later phase order/acceptance cannot be asserted.
2. No approved isolated Supabase testing environment.
3. Main public-release workflow remains false-green until PR #108 remediation is reviewed/merged.
4. Main branch protection and required checks are disabled/not established.
5. Exact frozen signed LM Connect APK is absent; unsigned artifacts are not substitutes.
6. Current Netlify production deploy cannot be tied to a canonical source SHA.
7. Netlify preview smoke and Vercel protected-preview runtime smoke not completed.
8. Physical-device owner-signed acceptance not completed.
9. Uploaded package has material security and functional gaps described above.

## Next execution

1. Continue Phase 2 with owner-controlled branch protection, isolated Supabase environment approval and a safe Netlify preview path.
2. Inspect final PR #108 checks/logs and reconcile any failures.
3. Review the updated workflow carefully; main-push preview and owner-confirmed production-dispatch paths remain NOT TESTED.
4. Continue Phase 2 source-level release work on the non-production PR branch. Do not merge PR #108.
5. Obtain explicit user approval and organization confirmation before creating a Supabase development branch at the quoted cost.
6. Obtain authorization before creating a temporary Vercel preview share link if protected runtime smoke is required.
7. Retrieve the original 65-page Master Plan before proceeding to later phases.
8. Continue safe source-level analysis and implementation while the above dependencies remain open.

## Acceptance

- Phase 1: previously approved; not repeated.
- Phase 2: **BLOCKED / IN PROGRESS** — isolated DB, main workflow remediation, branch protection, signed artifact and deployment provenance gates remain unresolved.
- Production release: **RELEASE HOLD**.

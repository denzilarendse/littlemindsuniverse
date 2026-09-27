# LittleMindsUniverse Release Evidence — 27 September 2026

## Decision

**RELEASE HOLD — production hosting and automated release layers are green, and the live teacher-assignment database defect has been repaired without weakening RLS. The post-repair real-account vertical slice, PayFast provider-backed settlement, recovery/rollback, owner signing, physical-device testing and Play Console gates remain open.**

The release standard remains:

`discover defect -> isolate root cause -> repair -> regression test -> retest -> record evidence`

A successful deployment, database migration or unsigned Android bundle is not by itself a public-launch or store-release decision.

## Canonical state

- Repository: `denzilarendse/littlemindsuniverse`
- Canonical branch: `main`
- Current main SHA: `a0bd247b371a90029cceb7d015bc2984dc6b93c1`
- Current production web deploy source SHA: `274a74629c0fc354d4363dac00c88013bcac1c39`
- Production host: Netlify project `littlemindsuniverse-app`
- Production URL: `https://www.littlemindsuniverse.co.za`
- Live Supabase project: `zcokxljcsfkrlouzragv`

The current main delta after the web deploy is database-only for the teacher-assignment repair. That migration has been applied to the live Supabase project, so no static Netlify redeploy was required for this repair.

## Production hosting evidence

The previously stale Netlify production deployment was repaired from a clean Termux-private release checkout and linked to the existing Netlify project rather than creating a replacement site.

Independent GitHub-hosted production probe `36278055418` passed after that deploy. External evidence included:

- HTTPS root: HTTP 200 from Netlify;
- TLS 1.3 with valid certificate at probe time;
- CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer Policy, Permissions Policy and COOP present;
- `/connect.html`: HTTP 200;
- `/manifest.json`: HTTP 200 with standalone PWA metadata;
- `/sw.js`: HTTP 200 with explicit static cache allowlist/cross-origin cache boundary;
- `/assets/runtime-config.js`: HTTP 200 with browser-safe Supabase publishable configuration and no server-secret patterns detected by the probe;
- `/api/health`: HTTP 200 with `ok=true`, Connect configured and Milo configured;
- production verifier: PASS.

The same health evidence reported `payfastConfigured=false`, so PayFast remains a separate release gate rather than being hidden by the green hosting result.

## Production teacher-assignment incident and repair

Real mobile testing reproduced two connected failures:

- a teacher could not save a mapped assignment draft;
- an existing draft could not be published to an active learner, leaving the learner learning view empty.

Live Supabase logs isolated backend causes:

1. `create_teacher_draft_with_skill` inserted a `learning_items` row without the required non-null `week_number`;
2. recipient RLS invoked `learner_in_learning_item_classroom` after direct authenticated EXECUTE had intentionally been revoked from that public internal helper;
3. learner/guardian recipient and submission RLS similarly invoked `has_commercial_learning_access` after its public direct EXECUTE was revoked;
4. `weekly_reports` had RLS policies but lacked the authenticated table-level `SELECT` grant needed before those policies could run;
5. the teacher Connect contact query used `SELECT DISTINCT` while ordering on `gl.primary_guardian`, which was not in the selected row shape.

PR #39, `Fix: restore production teacher assignment workflow`, repaired the path with migration:

`database/migrations/20260927_repair_teacher_publish_and_role_reads.sql`

The repair:

- derives a bounded classroom curriculum week (1–40), falling back to week 1 for a new classroom;
- moves RLS-only commercial-access and classroom-membership predicates into a non-exposed `private` schema;
- keeps the corresponding public internal helpers non-executable by anon/authenticated clients;
- rewires recipient/submission policies to the private predicates;
- restores only authenticated `SELECT` on `weekly_reports`, while RLS remains enabled;
- fixes the Connect teacher contact query without weakening active-classroom or verified-guardian requirements;
- adds regression coverage for the repaired migration boundary.

The migration was successfully applied to the live Supabase project.

## Verification after assignment repair

PR #39 passed release verification, Android verification and Vercel preview/status before merge.

On exact current main SHA `a0bd247b371a90029cceb7d015bc2984dc6b93c1`:

- release-verification run `36285484781`: PASS;
- Android-verification run `36285484785`: PASS;
- unsigned API-36 AAB generation: PASS.

The Android result remains intentionally unsigned. It is not evidence of owner signing, physical-device validation, Play upload, pre-launch success or store approval.

Live database post-migration checks confirmed:

- `weekly_reports`: authenticated `SELECT` restored and RLS still enabled;
- public `has_commercial_learning_access`, `has_premium_access`, and `learner_in_learning_item_classroom`: not directly executable by authenticated/anon roles;
- private RLS predicates: available to the intended authenticated policy execution path;
- active workflow test classroom: expected learner and curriculum skill relationship still resolves;
- rollback-only synthetic verification: no persistent synthetic learning item left behind.

No RLS rule, entitlement rule, teacher ownership rule, active classroom membership rule or verified guardian condition was disabled to obtain a pass.

## Supabase advisor state after repair

Security advisor currently reports hardening/review items rather than a newly introduced release-path critical defect:

- `pg_net` is installed in `public`; prior catalog inspection showed this installed extension is not relocatable, so it has not been blindly moved/dropped/reinstalled merely to silence the warning;
- leaked-password protection remains disabled and needs supported Auth/project configuration;
- 55 authenticated SECURITY DEFINER findings remain. These include intended browser RPCs as well as helpers; they require function-by-function classification and must not be bulk-revoked merely to reduce the advisor count.

Performance advisor currently reports:

- 61 unused-index notices;
- 4 multiple-permissive-policy warnings.

The unused indexes are expected to be noisy before meaningful production traffic and are not being removed from a pre-launch system solely because usage counters are zero. The permissive-policy warnings will only be changed where equivalent authorization semantics can be proven by regression tests.

Supabase remediation references:

- Extension placement: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
- SECURITY DEFINER exposure: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Leaked-password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Multiple permissive policies: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies
- Unused indexes: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

## Android/API-36 status

The application identity remains frozen as:

`za.co.littlemindsuniverse`

The automated Android pipeline verifies the production web source before packaging, syncs the Capacitor bundle, checks the frozen identity/API/child-safe native defaults, runs Android lint/unit/app instrumentation compilation, and builds an unsigned API-36 release bundle.

Owner-controlled signing material remains outside source control.

## Current gate status

| Gate | State | Evidence still required |
| --- | --- | --- |
| Canonical source / current main SHA | PASS | Keep every release decision tied to exact SHA |
| Automated lint/tests/build | PASS | Repeat if source changes |
| Netlify production deployment | PASS | Repeat if web deploy artifact changes |
| Production DNS/TLS/security headers | PASS | Repeat after hosting/DNS changes |
| LittleMinds Connect hosted shell | PASS | Real parent/teacher/realtime E2E |
| PWA manifest/service-worker privacy boundary | PASS externally | Real install/update/offline device exercise |
| Milo/Connect server health | PASS | Authenticated role/context E2E still required |
| Teacher draft backend repair | PASS at source/CI/live DB layer | Real teacher Save draft confirmation |
| Teacher publish backend repair | PASS at source/CI/live DB layer | Real teacher Publish confirmation |
| Learner assignment visibility | PENDING POST-REPAIR RETEST | Target learner confirms item appears in Learning |
| Learner submission -> teacher review | OPEN | Real hosted start/save/submit/review evidence |
| Weekly report read path | REPAIRED DB LAYER | Real teacher/guardian report E2E |
| Connect teacher contact SQL | REPAIRED DB LAYER | Real teacher Connect contact E2E |
| Hosted auth lifecycle | OPEN | Learner/parent/teacher/admin login, recovery, logout and role isolation |
| PayFast automated logic | PASS at automated layer | Provider-backed settlement + entitlement evidence |
| PayFast production configuration | OPEN | Production health previously reported `payfastConfigured=false` |
| Backup/restore/rollback | OPEN | Successful recovery/rollback drill with recorded result |
| Supabase leaked-password protection | OPEN HARDENING | Enable through supported project control and verify |
| `pg_net` public-schema advisor | REVIEWED | Managed-extension-safe remediation or accepted platform constraint |
| Android package ID/API-36 unsigned bundle | PASS | Final signed candidate must remain tied to final source |
| Android owner signing | OPEN OWNER GATE | Owner upload key + Play App Signing evidence |
| Digital Asset Links | PREPARED | Play app-signing SHA-256, production publication and verification |
| Signed Android AAB | OPEN OWNER GATE | Sign exact final candidate and verify signature |
| Physical-device release test | OPEN | Install/exercise exact signed artifact |
| Play internal/closed/pre-launch | OPEN OWNER GATE | Console upload, testers and pre-launch report |
| Play declarations/production approval | OPEN OWNER GATE | Families, target audience, Data Safety, deletion/privacy and store review evidence |

## Immediate hosted vertical-slice retest

Using the production website and existing test accounts:

1. teacher opens the existing draft and publishes it to the active learner;
2. teacher creates a fresh mapped assignment and confirms **Save draft** succeeds;
3. learner signs in and confirms the published work appears in **Learning**;
4. learner starts, saves and submits the work;
5. teacher confirms the submission appears in the review inbox and completes review;
6. confirm the resulting mastery/report path without exposing another learner's data.

Once this real-account vertical slice is green, record the result and continue to payment, recovery/rollback, signing/device and Play gates.

## Current conclusion

The stale Netlify deployment blocker is closed, the production teacher-assignment backend defect is repaired live, and current main web/Android automation is green. The next meaningful evidence is the post-repair real-account hosted vertical slice. Until that and the remaining external owner/provider/store gates are observed, the evidence-based overall decision remains **RELEASE HOLD**.

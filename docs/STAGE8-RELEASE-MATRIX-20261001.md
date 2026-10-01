# Stage 8 Release Matrix — Controlled School Pilot

Date: 2026-10-01  
Candidate branch: `release/stage8-live-test-readiness-20261001`  
PR: #47 — Stage 8: controlled school live-test readiness

Status vocabulary: **VERIFIED**, **VERIFIED WITH WARNINGS**, **FAILED**, **NOT CHECKED**, **DEFERRED (pilot non-blocker)**.

Engineering control SHA evaluated before this documentation-only update: `173f0766b74fe6ede35e81a625964f8cbae4d400`. Android runtime candidate SHA: `6cceed400aaba01fc21c67e557bf60429bf5c094`.

| Gate | Status | Evidence / note |
|---|---|---|
| Six learner stages (EE24, F57, DB810, CA1113, PA1415, EDGE1618) represented in runtime and managed learner flow | VERIFIED | Static regression coverage in `tests/stage8-live-test-readiness.test.mjs`; existing Milo/curriculum suites cover stage routing. |
| LittleMinds Connect is canonical messaging surface | VERIFIED | Connect web/bridge/mobile source exists; runtime phone-provider variables are absent, and the live database has no legacy external phone-provider tables, columns or functions. |
| External phone-provider runtime removed | VERIFIED | Source and runtime tests reject external phone-provider identifiers; phone-number discovery UI removed. |
| Connect teacher ↔ verified guardian isolation | VERIFIED | Live Supabase transactional probes: teacher/guardian member + visible; learner/unrelated user denied and see zero messages in sampled classroom conversation. |
| Connect learner unrestricted messaging | VERIFIED DENIED | Live logic returned `connect_can_send=false` for learner; UI keeps learner composer unavailable. |
| Connect offline retry / duplicate-send protection | VERIFIED | Stage 8 adds session-scoped outbox + `send_connect_message_v2` client UUID idempotency and unique DB index. Transactional duplicate call returned same message ID. |
| Connect delivery/read foundation | VERIFIED | `mark_connect_thread_delivered`, existing read RPC, receipts table and client refresh path. |
| Connect realtime | VERIFIED (foundation) | Existing RLS-protected Postgres Changes subscription scoped to active conversation; manual refresh fallback retained. |
| Connect push registration | VERIFIED (foundation) | Capability-sensitive subscription table is RPC-only with explicit direct deny; service worker handles generic same-origin notifications. Public VAPID key/dispatch service intentionally not enabled yet. |
| Native push delivery | DEFERRED (pilot non-blocker) | No `POST_NOTIFICATIONS` permission and no native dispatch pipeline yet. Keep disabled until a real implementation is tested. |
| Pilot feedback | VERIFIED | Authenticated bounded feedback RPC/table, direct table deny, minimal-data guidance in UI. |
| PayFast settlement | DEFERRED (pilot non-blocker) | `pilotMode=true`, `pilotPaymentsRequired=false`, pilot verifier added. Commercial release must rerun with `--require-payfast`. |
| Week 1 permanently free / pricing design retained | VERIFIED | Runtime keeps `weekOneAlwaysFree=true` and configured USD pricing while pilot settlement is bypassed. |
| Milo role/stage/assessment authority | VERIFIED | Server-derived role/stage; assigned-item assessment state; assistance cap; client spoof ignored. Exact-head release verification passed. |
| Milo prompt-injection / assessment integrity | VERIFIED | Regression tests protect role/stage/assessment rules, first-attempt enforcement and bounded assistance; no multiple-choice-first policy remains. |
| Accessibility baseline | VERIFIED | CI covers lang metadata, live status, semantic main/nav, focus-visible, 44px targets, reduced motion and forced colors. |
| PWA cache privacy | VERIFIED | CI confirms only explicit static shell paths cache; cross-origin and `/api/*` responses are not cached. |
| Android target API | VERIFIED | Root `android/variables.gradle`: compileSdk 36, targetSdk 36, minSdk 24. |
| Connect Android privacy permissions | VERIFIED | Connect manifest requests INTERNET only; no location, contacts, camera, microphone, AD_ID or notification permission. |
| Owner-controlled Android signing | NOT CHECKED | Build scripts support owner `key.properties`; signing remains an owner-controlled release step and is not needed for the CI-generated debug APK pilot smoke. |
| Physical Android device smoke test for this Stage 8 SHA | NOT CHECKED | CI now produces an installable LMU debug APK. Install/touch/microphone/session smoke is the first real-device pilot activity before cohort expansion. |
| Google Play target audience / Data Safety / IARC / review | DEFERRED (pilot non-blocker) | Required for Play/public distribution, not for supervised controlled-school distribution outside Play. |
| Supabase Stage 8 schema migrations | VERIFIED | Idempotency/delivery/push foundation, explicit deny, and pilot feedback migrations applied successfully to production project. |
| Supabase Security Advisor | VERIFIED WITH WARNINGS | Current warnings: `pg_net` in public schema, 71 authenticated SECURITY DEFINER RPC findings requiring contract review, and leaked-password protection disabled. No missing-RLS warning is present for the new Stage 8 tables. |
| Dependency audit | VERIFIED WITH WARNINGS | Shipped runtime dependency audit is 0 vulnerabilities. Full dependency tree reports 3 moderate development-tool transitive findings; CI high-severity gate remains green. |
| GitHub lint/test/build exact Stage 8 head | VERIFIED | Release verification passed on control SHA `173f0766...`; the preceding runtime SHA executed 188 tests with 188 pass / 0 fail and completed build. |
| Vercel preview | DEFERRED (pilot non-blocker) | Connected Vercel integration currently exposes no teams/projects, and no deployment was attempted. The supervised Android debug-APK pilot does not require a Vercel preview. |
| Hosted deployment of exact Stage 8 SHA | NOT CHECKED | Deliberately not performed in this Stage 8 autonomous run. Production/hosted deployment remains a separate owner-controlled gate. |
| Backup / rollback source anchor | VERIFIED (source) | Stage 8 isolated in PR #47 against release branch; rollback is PR/base SHA based. Hosted database restore drill remains NOT CHECKED. |

## Current release decision

**READY WITH KNOWN NON-BLOCKERS for controlled real-life testing.**

The engineering candidate is ready to enter supervised browser and physical-device testing across all six learner stages. The first physical Android install, microphone-consent check, authenticated browser journeys and school/guardian observation are part of the testing stage and remain honestly marked NOT CHECKED until executed.

Public commercial release, hosted production promotion, Play submission/signing, leaked-password protection, CAPTCHA/bot-abuse configuration, legal/store declarations and backup-restore drill remain separate release gates. This matrix does **not** declare public commercial or Google Play release readiness.

# Stage 8 Release Matrix — Controlled School Pilot

Date: 2026-10-01  
Candidate branch: `release/stage8-live-test-readiness-20261001`  
PR: #47 — Stage 8: controlled school live-test readiness

Status vocabulary: **VERIFIED**, **FAILED**, **NOT CHECKED**, **DEFERRED (pilot non-blocker)**.

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
| Milo role/stage/assessment authority | VERIFIED by source tests, CI pending final run | Server-derived role/stage; assigned-item assessment state; assistance cap; client spoof ignored. |
| Milo prompt-injection / assessment integrity | VERIFIED by existing regression design, CI pending final run | System prompts and regression tests protect role/stage/assessment rules; no MCQ-first policy remains. |
| Accessibility baseline | VERIFIED by source tests, CI pending final run | lang metadata, live status, semantic main/nav, focus-visible, 44px targets, reduced motion, forced colors. |
| PWA cache privacy | VERIFIED by source tests, CI pending final run | Only explicit static shell paths cache; cross-origin and `/api/*` responses are not cached. |
| Android target API | VERIFIED | Root `android/variables.gradle`: compileSdk 36, targetSdk 36, minSdk 24. |
| Connect Android privacy permissions | VERIFIED | Connect manifest requests INTERNET only; no location, contacts, camera, microphone, AD_ID or notification permission. |
| Owner-controlled Android signing | NOT CHECKED | Build scripts support owner `key.properties`, but signing key and signed candidate must remain owner-controlled and require device evidence. |
| Physical Android device smoke test for this Stage 8 SHA | NOT CHECKED | Must be run on the final candidate before expanding school cohort. |
| Google Play target audience / Data Safety / IARC / review | DEFERRED (pilot non-blocker) | Required for Play/public distribution, not for supervised controlled-school distribution outside Play. |
| Supabase Stage 8 schema migrations | VERIFIED | Idempotency/delivery/push foundation, explicit deny, and pilot feedback migrations applied successfully to production project. |
| Supabase Security Advisor | VERIFIED WITH WARNINGS | Push table no-policy finding resolved. Remaining warnings: pre-existing `pg_net` in public schema, intentional authenticated SECURITY DEFINER app RPCs requiring ongoing contract review, leaked-password protection disabled. |
| Dependency audit | VERIFIED for runtime / high severity in CI history | Runtime dependency audit previously 0 vulnerabilities; full tree currently includes moderate dev-tool transitive findings only. |
| GitHub lint/test/build exact Stage 8 head | PENDING | Must be green before merge. |
| Vercel preview | DEFERRED (pilot non-blocker) | PR preview status can fail from team build-rate limit; LMU canonical production hosting is Netlify. |
| Netlify deployment of exact Stage 8 SHA | NOT CHECKED | Requires deployment of merged release candidate and hosted pilot probe. |
| Backup / rollback source anchor | VERIFIED (source) | Stage 8 isolated in PR #47 against release branch; rollback is PR/base SHA based. Hosted database restore drill remains NOT CHECKED. |

## Current release decision

**HOLD pending exact-head CI and hosted/device smoke evidence.**

Once GitHub lint/test/build is green and the exact candidate is deployed and smoke-tested on HTTPS plus at least one physical Android device, this matrix can move to **READY WITH KNOWN NON-BLOCKERS** for supervised school pilot testing.

This matrix does **not** declare public commercial or Google Play release readiness.

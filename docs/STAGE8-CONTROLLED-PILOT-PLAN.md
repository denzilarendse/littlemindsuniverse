# Stage 8 Controlled School Pilot Plan

Date: 2026-10-01  
Branch: `release/stage8-live-test-readiness-20261001`

## Goal

Prepare LittleMindsUniverse Architecture 2.0 for supervised real-life testing in elementary/primary and secondary-school settings without treating a controlled pilot as a commercial public release.

The pilot covers every learner stage:

| Stage | Ages | Pilot emphasis |
|---|---:|---|
| EE24 — Early Explorers | 2–4 | adult-assisted touch/narration/play safety |
| F57 — Foundation | 5–7 | literacy/numeracy, short activities, accessibility |
| DB810 — Discovery Builders | 8–10 | core academics, projects, Milo guidance |
| CA1113 — Creator Academy | 11–13 | independent creation, coding, study skills |
| PA1415 — Pathfinder Academy | 14–15 | secondary mastery, APIs/data/career discovery |
| EDGE1618 — LittleMinds Edge | 16–18 | full-stack, AI literacy, enterprise/career readiness |

## Pilot operating decisions

1. LittleMinds Connect is the canonical communication system. External phone-number/WhatsApp runtime dependencies remain removed.
2. PayFast settlement is non-blocking during the controlled pilot. The normal commercial entitlement design is retained for re-gating before paid public launch.
3. Week 1 remains permanently free. Pilot mode may expose broader testing access, but it does not change authentication, authorization or child-safety rules.
4. Learner messaging remains restricted. Classroom communication is teacher/verified-guardian relationship based; learner accounts do not receive an unrestricted direct-message composer.
5. Milo remains teacher-led: no multiple-choice-first teaching, no doing assessed work for the learner, server-derived assessment state, bounded assistance and teacher approval for academic decisions.
6. Test feedback is captured through an authenticated, minimal-data in-app channel. Testers must not enter passwords, phone numbers, private learner conversations or unnecessary personal information.

## Test cohort design

Start with a small supervised cohort before increasing traffic. Each participating school should include at least one teacher account and one guardian relationship; learner coverage should include all six stage codes over the pilot, not necessarily on the first day.

For ages 2–7, sessions should be adult-assisted and short. For ages 8–18, include independent learner tasks but retain teacher observation for the first live session. Do not use pilot results as high-stakes grades or formal qualifications.

## Required journeys

### Authentication and roles
- sign up / sign in / sign out
- learner, parent/guardian, teacher and admin role boundaries
- unauthorized cross-role reads/writes rejected
- account recovery and session expiry observed

### Learning
- teacher creates and approves learning work
- learner receives and completes authentic work
- teacher reviews submitted evidence
- mastery and intervention/enrichment recommendations update through approved paths
- Friday revision / Sunday assessment rules preserve assistance restrictions

### Milo
- all six stages route to age-appropriate engines
- assessment help is server-derived and capped
- prompt-injection attempts do not override tutor/safety rules
- provider failure produces a safe failure rather than fabricated completion

### LittleMinds Connect
- verified teacher ↔ guardian conversation
- send / reply / read / delivered states
- realtime update with manual-refresh fallback
- offline queue retry uses idempotent client message IDs
- relationship revocation stops access on the next authorization check
- no phone-number discovery or learner unrestricted messaging

### PWA / Android
- responsive phone/tablet/desktop layouts
- install shell and service-worker update
- offline shell never caches authenticated Supabase/API payloads
- Connect Android package keeps minimal permissions
- physical-device smoke test on at least one low/mid-range Android device before scaling the cohort

## Feedback triage

Classify feedback as:
- **blocking** — prevents a core pilot journey or creates a safety/security risk
- **minor** — degraded experience with a reliable workaround
- **observation** — suggestion, content note or non-blocking usability finding

Safety, privacy, authorization and assessment-integrity reports always outrank cosmetic defects.

## Exit criteria for “ready for real-life pilot”

A pilot candidate can be marked **READY WITH KNOWN NON-BLOCKERS** only when:

- clean CI lint/test/build is green for the exact source SHA;
- live Supabase migrations are applied and security-sensitive negative tests pass;
- Connect and Milo production configuration are healthy;
- all six learner stages are represented by automated curriculum/router coverage;
- hosted HTTPS/PWA smoke checks pass on the candidate;
- payment settlement is explicitly classified as deferred/non-blocking for pilot;
- no unresolved blocking child-safety, auth, RLS/RPC or data-loss defect exists;
- rollback/source SHA are recorded.

Play Console submission, store approval, PayFast live settlement, native push delivery and broad device-lab coverage may remain later gates if they are explicitly marked NOT CHECKED / DEFERRED and are not required for the supervised school pilot distribution method.

## 96-hour feasibility

Given the current repository already contains the core learning workflows, Architecture 2.0 Milo engines, Connect, Supabase policies, PWA shell and Android API-36 projects, 96 hours is a reasonable engineering window for a **controlled school pilot readiness cycle** if remaining work is limited to validation, defect repair, deployment proof and device smoke testing.

It is not a defensible guarantee for unrestricted public commercial launch or Google Play approval because external review, owner-controlled signing, Play declarations/review, provider settlement and school/guardian operational approvals can exceed an engineering timetable.

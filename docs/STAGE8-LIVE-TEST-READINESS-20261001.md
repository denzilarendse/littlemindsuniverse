# Stage 8 Live-Test Readiness Report — 2026-10-01

## Decision

**READY WITH KNOWN NON-BLOCKERS for controlled real-life testing.**

LittleMindsUniverse Architecture 2.0 has reached the engineering handoff point for supervised testing across all six learner stages. This is not a public-production or app-store release declaration.

Engineering control SHA: `173f0766b74fe6ede35e81a625964f8cbae4d400`  
Android runtime candidate SHA: `6cceed400aaba01fc21c67e557bf60429bf5c094`

No production deployment, DNS mutation, Play submission, payment activation or signing-key operation was performed.

## Stage 8 outcomes completed

- LittleMinds Connect is the canonical in-product communication layer. The current source tree and live public schema contain no legacy external phone-provider runtime tables, columns or functions.
- Controlled-pilot access can proceed without PayFast settlement. `pilotMode=true` and `pilotPaymentsRequired=false` remain explicit, while commercial payment architecture remains intact for later re-gating.
- All ages 2 through 18 map to one of six LMU stages and are covered by automated stage-routing checks.
- The yearly curriculum scaffold contains 240 stage-week entries: 40 ordered weeks for each of the six stages.
- Early Explorers and Foundation technical-theme mismatches were replaced with age-appropriate themes.
- Reasoning Missions enforce first-attempt evidence where required and use bounded sessions.
- Voice/Language evidence remains guardian-consent gated and private.
- Coding Studio provides bounded JavaScript execution in an isolated worker, with restricted network/storage capability and governed private code evidence.
- Brilliant Milo can bind trusted curriculum topics server-side and use a bounded, read-only reviewed mastery snapshot without writing teacher-approved mastery.
- Assigned learning can open Brilliant Milo, Voice Coach, Coding Studio and the learner whiteboard in the same assignment context.
- Teacher review can inspect approved whiteboard/image, audio, video and text/code evidence through authenticated private storage.
- Authentication UI now includes explicit role context and accessible show/hide-password controls while keeping server-side role authority.
- Parent recovery messages remain generic to reduce account-enumeration leakage.
- Pilot feedback has an authenticated bounded RPC and indexed profile foreign key.
- The LMU Android project targets API 36 and CI produces both the release bundle and an installable debug APK for device testing.

## Verification evidence

### GitHub release verification

The Stage 8 candidate passed the repository release workflow after the final engineering changes.

A verified run on the runtime candidate executed:

- 188 tests
- 188 passed
- 0 failed
- production dependency audit: 0 vulnerabilities
- full dependency tree: 3 moderate development-tool transitive findings
- lint: passed
- build: passed

Subsequent release-verification runs also passed after documentation and migration-source cleanup.

### Android

Android verification passed on runtime candidate SHA `6cceed400aaba01fc21c67e557bf60429bf5c094`.

Generated artifacts include:

- LMU debug APK artifact: `littlemindsuniverse-android-api36-debug-apk`
- artifact ID: `11188971953`
- SHA-256 digest: `6d22ff926aea8471da6d61a34a158e24a4dccfe990e4856d2299f4a63c313a99`
- LMU unsigned release AAB artifact ID: `11189746556`
- LittleMinds Connect unsigned AAB/APK artifacts also passed the same Android workflow.

### Supabase

Live checks verified:

- RLS enabled on Connect conversations, members, messages, receipts, push subscriptions and pilot feedback.
- Stage 8 Connect and pilot RPCs are not executable by `anon` or `PUBLIC`; intended authenticated execution remains explicit.
- Stage 8 SECURITY DEFINER RPCs use an empty pinned `search_path`.
- legacy external phone-provider runtime tables, columns and functions are absent.
- the Stage 8 pilot-feedback foreign key now has a covering index.

Current advisor warnings are recorded rather than suppressed:

Security:
- `extension_in_public`: 1 warning
- `authenticated_security_definer_function_executable`: 71 warnings requiring continued per-RPC contract review
- `auth_leaked_password_protection`: 1 warning

Performance:
- `unused_index`: 77 informational findings
- `multiple_permissive_policies`: 4 warnings
- no remaining unindexed-foreign-key finding after Stage 8 index hardening

## What remains intentionally NOT CHECKED

These are the first activities of the real-life testing stage or later public-release gates:

- authenticated browser E2E for the newest Stage 5–7 UI additions;
- physical Android install/touch/offline/microphone tests using the generated debug APK;
- supervised learner/parent/teacher scenarios at every stage;
- owner-controlled release signing and Play Console internal-test track;
- production CAPTCHA/bot-abuse configuration;
- leaked-password protection configuration;
- production SMTP/recovery deliverability;
- legal/privacy/store declarations, Data Safety, target audience and content rating;
- hosted production promotion and DNS;
- backup restore drill;
- commercial PayFast settlement;
- native push delivery at production scale.

## 96-hour completion assessment

**Yes. Ninety-six focused engineering and validation hours are sufficient to move the current candidate through a controlled real-life testing cycle, assuming the required test accounts, devices and owner-controlled consoles are available when needed.**

This is not a guarantee of public launch or store approval. External review, signing, legal/store declarations and school/guardian operational approvals can exceed an engineering timetable.

Recommended 96-hour sequence:

1. **Hours 0–24 — authenticated browser E2E and defect repair**  
   Parent, learner and teacher login/recovery; assignments; Reasoning Missions; Brilliant Milo; Coding Studio; Voice Coach; Connect; evidence review; mastery synchronization.

2. **Hours 24–48 — physical Android and device permissions**  
   Install the generated debug APK; phone/tablet touch; rotation; offline shell; service-worker update; microphone permission; guardian consent; private evidence upload; Connect messaging.

3. **Hours 48–72 — all-stage supervised scenarios**  
   Run scripted scenarios for EE24, F57, DB810, CA1113, PA1415 and EDGE1618; collect teacher/guardian observations; review curriculum tone, age fit, accessibility and Milo boundaries.

4. **Hours 72–96 — repair, rerun and freeze**  
   Fix blockers; rerun CI and device/browser scenarios; exercise rollback/restore; freeze the pilot candidate; issue a final pilot-results report.

## External platform check

As of 1 October 2026, Google Play requires new Android apps and app updates to target Android 16 / API level 36. LMU already targets API 36, so the engineering target level is aligned with the current submission requirement. Apps whose audience includes children also require accurate Target Audience, Data Safety and content-rating declarations and must comply with the Families requirements. Those owner/store steps remain outside this no-deployment Stage 8 run.

## Chronos, Codex Usage and deployment-tool boundaries

The Chronos and Codex Usage skills require access to the user's local Codex host/terminal to inspect local processes, heartbeats and quota snapshots. This cloud project session cannot truthfully inspect that separate local machine, so those checks are marked NOT CHECKED rather than guessed.

The connected Vercel integration currently exposes no teams/projects to this session. No Vercel deployment was attempted.

## Handoff

The next meaningful human-involved work is **testing, not more architecture**:

- install the generated LMU debug APK on a real Android device;
- run authenticated browser and device journeys;
- execute all-six-stage pilot scripts;
- log blocking/minor/observation findings through the pilot feedback path;
- keep public release on hold until owner-controlled security, legal, store and deployment gates are complete.

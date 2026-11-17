# LMU Rooms Backend Contract — Phase 4 checkpoint

**Date:** 2026-11-17 (SAST)  
**Repository:** denzilarendse/littlemindsuniverse  
**Branch:** production/lmu-blueprint-room-shell-20261117  
**PR:** #112 (draft, unmerged)  
**Status:** DESIGN CHECKPOINT — no schema or production data changed.

## 1. Goal and boundary

Replace the demo-only room data boundary with a server-backed contract while preserving the existing static-JS shell, Supabase Auth, learner/guardian/teacher roles, existing mastery model, and Capacitor wrapper.

This document is a design artifact, not an applied migration. It deliberately does not introduce a second learner identity or duplicate the existing consent system.

## 2. Current source-of-truth findings

Live project `zcokxljcsfkrlouzragv` was observed `ACTIVE_HEALTHY`, PostgreSQL 17.6. Public tables inspected had RLS enabled.

Existing reusable structures:
- `profiles` and `learners` provide the account/learner boundary.
- `guardian_learner_links` stores verified relationships and capability flags.
- `guardian_evidence_consents`, `guardian_evidence_consent_events`, and `guardian_consent_receipts` already implement versioned evidence consent with immutable receipt snapshots.
- `guardian_feature_controls` is already the per-learner guardian feature-control pattern.
- `learning_items`, `learning_item_recipients`, `learner_submissions`, `submission_reviews`, `learner_skill_mastery`, and `mastery_evidence` already implement learning assignment, review and mastery.
- `can_access_learner(uuid)` authorizes the learner, verified guardian, or active classroom teacher. `teacher_owns_classroom(uuid)` is also present.

Important security observations from the current advisor snapshot:
- 14 public tables have RLS enabled but no policies. These include several learning-verification, Milo-usage and support-group tables. They are not changed by this slice.
- 94 SECURITY DEFINER functions are executable by authenticated users; these require a separate function-by-function authorization review. Do not blanket-revoke them because existing UI flows may depend on them.
- Leaked-password protection is disabled in Auth settings.
- `pg_net` is installed in `public`; advisor recommends moving it.
These are existing project findings, not regressions introduced by the rooms branch.

## 3. Domain model decision

Use four bounded concepts:

1. **Room content** — curated, versioned, published catalogue content. Content is authored/reviewed by trusted staff; learner clients never publish catalogue rows.
2. **Room activity** — append-only learner activity events. Events reference a content item and learner; the database derives actor identity from `auth.uid()`. No client-supplied profile id is trusted.
3. **Community posts** — submissions are private/pending by default. Public visibility requires a moderation decision and a separate guardian permission check for the relevant learner.
4. **Guardian room controls** — reuse the existing guardian/learner relationship and feature-control model; do not create a parallel consent ledger.

Suggested first room keys: `playworld`, `storyverse`, `career`, `adult_academy`, `creator`, `community`. Existing Academy/Milo/classroom workflows remain canonical and should be linked, not copied.

## 4. Proposed schema (migration not yet approved)

### `room_content_items`
- `id uuid primary key`
- `room_key text` constrained to the supported room keys
- `content_key text` unique stable slug
- `version integer` positive
- `locale text` (BCP-47; initial content may be `en-ZA`)
- `stage_code text null` (age-band filtering)
- `curriculum_code text null`
- `content_type text`
- `payload jsonb` validated by server-side content schema before publication
- `status text` draft / review / published / retired
- `created_by uuid`, `approved_by uuid`, timestamps

Only published content is selectable by authenticated learners. Draft/review content is staff-only. Content approval must be separate from authoring. No personally identifying learner data belongs in catalogue payloads.

### `room_activity_events`
- `id uuid primary key`
- `learner_id uuid references learners`
- `room_key text`, `content_item_id uuid references room_content_items`
- `event_type text` allow-listed per room
- `result jsonb` bounded to score/outcome/progress fields; no free-form chat/transcript
- `duration_seconds integer null` bounded non-negative value
- `occurred_at timestamptz`, `created_at timestamptz`
- `actor_profile_id uuid` derived server-side, never accepted from client

Events are append-only for learners. Guardian and teacher read access follows `can_access_learner`; learner insert is limited to their own active learner profile. A single validated RPC should check published content, learner access, event allow-list and payload size, then insert. Avoid allowing arbitrary direct UPDATE/DELETE.

### `community_posts`
- `id uuid primary key`
- `learner_id uuid references learners`
- `body text` strict length cap
- `status text` pending / approved / rejected / hidden
- `moderated_by uuid null`, `moderated_at timestamptz null`
- timestamps

Learners can create pending posts only. Learners can read their own posts; everyone else sees only approved posts in a permitted community context. Moderation is staff-only, audited, and never performed by an AI model alone. No direct messages, public profile search, location sharing, images or external links in the first release.

### `community_post_reports` and `community_moderation_events`
Reports capture post id, reporter profile/learner context, bounded reason code and timestamp. Moderation events are append-only and record moderator, action, reason code and timestamp. Reports are private to moderators and the reporter where safe.

### `guardian_room_controls`
Prefer extending the existing `guardian_feature_controls` allow-list through an explicit reviewed migration rather than creating a duplicate consent system. Candidate feature keys: `community_posting`, `career_pathway`, `creator_publishing`, `adult_academy_access`, `room_activity_tracking`. Each control must require a verified primary guardian; the default for social publishing is OFF. A revocation takes effect immediately for future actions.

Cross-device time limits and quiet hours need a separate normalized schedule table and server-side enforcement. Browser timers alone are not a safety control.

## 5. Authorization contract

- Never trust `user_metadata` or client-supplied `actor_profile_id` for authorization.
- Use `auth.uid()` and database-owned relationships.
- Do not expose SECURITY DEFINER RPCs as generic data access shortcuts. Prefer RLS with SECURITY INVOKER. If a privileged RPC is unavoidable, place it in a non-exposed schema, pin `search_path`, check `auth.uid()` and relationship/role in the body, and grant EXECUTE narrowly.
- RLS policies must distinguish learner self-access, verified guardian access, active classroom teacher access, moderator/admin access and public approved-content reads. `TO authenticated` alone is not authorization.
- New public-schema tables must explicitly enable RLS. Supabase's 2026 Data API change means table exposure and SQL GRANTs must be explicitly reviewed; do not assume a new public table is automatically exposed.
- All writes that affect mastery should integrate with the existing learning evidence/review pipeline. Do not let a game score alone award a CAPS mastery judgement or formal qualification.
- Community posts require guardian opt-in for under-13 users and human moderation before publication. Do not treat client-side PII pattern checks as the security boundary.

## 6. Child PIN and consent lifecycle

The existing account model uses adult Auth accounts and managed learner records. Do not create child Auth accounts or store a raw PIN in `learners`, browser storage, Milo metadata or logs.

Before implementing a child PIN:
1. Decide whether it is a local profile-unlock PIN or a server-authentication factor. It must not be described as a password or independent identity unless it truly authenticates.
2. For server-verified PINs, store only a modern password hash (Argon2id preferred; bcrypt acceptable with calibrated cost), enforce rate limits/lockout server-side, avoid user enumeration, and never return hashes to clients.
3. Bind unlock sessions to an authenticated guardian-created learner profile and short-lived server-issued session state; revoke on guardian action.
4. Ensure Milo receives a pseudonymous learner id and only approved learning context; never send legal names, school, contact details, birth date or guardian contact details as memory instructions.
5. Reuse versioned consent receipts for each distinct data use. A single broad checkbox is not sufficient. Revocation must stop future processing and invoke documented retention/deletion rules.

## 7. Acceptance tests before any live migration

1. Unauthenticated and anon callers cannot read learner activity or pending community posts.
2. Learner A cannot read or write learner B's activity, posts or controls.
3. A guardian with a verified link can read the linked learner's activity; an unverified link cannot.
4. A teacher can read only learners in an active classroom they own.
5. A teacher cannot change guardian controls or moderate community content unless separately granted a moderator role.
6. Learners cannot publish directly; all new posts begin pending.
7. A learner cannot set post status, moderator id, approval timestamp or actor profile id.
8. Revoked guardian opt-in blocks subsequent community posting immediately.
9. Content in draft/review/retired state cannot be consumed by learner clients.
10. Activity events reject unknown room/event keys, oversized JSON, negative or unreasonable durations, and content items not published for the learner's stage/locale.
11. Direct UPDATE/DELETE on append-only activity is denied.
12. No room event can create formal qualification or mastery without the existing review/evidence process.
13. RLS tests run with at least two learners, two guardians, two teachers and a moderator/admin.
14. Advisor review reports no new RLS-without-policy or unintended SECURITY DEFINER exposure findings.

## 8. Deployment sequence

1. Complete schema and policy review on a disposable Supabase branch or isolated local stack.
2. Add SQL regression tests for positive and negative role matrix.
3. Run Supabase security and performance advisors; resolve all new findings.
4. Add typed client adapters and feature-flagged live reads.
5. Add server-side RPC writes and integration tests.
6. Backfill no learner data in this initial migration; it is additive only.
7. Capture and verify backup/recovery point.
8. Obtain explicit approval before applying migration to the live project.
9. Deploy preview, run authenticated browser tests, then obtain explicit production deployment approval.
10. Build/sign Android APK/AAB in the configured JDK 21 + Android SDK environment and test on devices.

## 9. Open blockers and decisions

- The frozen blueprint's React/TypeScript/Vite direction conflicts with the verified static-JS canonical repository. Preserve current architecture pending explicit product/architecture resolution.
- Adult learner identity and age verification are not represented by the existing learner role model. Do not expose Adult Academy to under-18 accounts by UI checks alone.
- Moderator role and moderation staffing/operating hours need a product owner decision.
- Legal review is needed for POPIA consent language, child age thresholds, retention, cross-border processing and deletion workflows.
- JDK 21 + Android SDK and signing configuration are required for release-grade Android verification.
- Live migration and production deployment remain approval-gated.

## 10. Evidence and checkpoint

- Live Supabase project metadata: ACTIVE_HEALTHY, PostgreSQL 17.6.
- Existing guardian consent, relationship, learner and mastery tables/functions inspected read-only.
- Security advisor snapshot: 14 RLS-enabled tables without policies, 94 authenticated-executable SECURITY DEFINER functions, leaked-password protection disabled, pg_net in public.
- No migration applied, no live data modified, no production deployment performed.
- Next slice: convert this reviewed contract into a local/disposable-branch migration + role-matrix tests; do not touch production until review and explicit approval.

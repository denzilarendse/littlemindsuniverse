# LMU Project Memory Ledger Addendum — 2026-11-17 19:45 SAST

## Scan
- Canonical repository: `denzilarendse/littlemindsuniverse`
- Branch: `production/lmu-blueprint-room-shell-20261117`
- PR #112: open, draft, unmerged; head at scan time `5d24b1c4a4fd553373ba6309aded6fbf9235da89`.
- Scanned PR metadata, changed-file list, review submissions/threads, project ledger, both room migrations, backend contract, baseline README, export script and PostgreSQL 17 workflow.
- No review submissions or inline review threads exist.
- Production Supabase project checked read-only: no room tables exist.
- Free test project `LMU-V45-TESTING` (`klfvrawkieyqefbpzywq`) is `ACTIVE_HEALTHY`, PostgreSQL 17.11; current read-only inventory remains 0 application tables and 0 application routines.
- Baseline SQL and manifest remain absent from the branch.

## Newly verified CI evidence
All four PR-triggered workflow runs associated with the scanned head completed successfully:
- Room PostgreSQL 17 disposable fixture run `44137352164`: SUCCESS. The SQL migration + RLS fixture and static contract tests executed.
- Release verification run `44137352134`: SUCCESS. npm install, runtime dependency audit, lint, tests, build and deployable-artifact checks passed.
- Android verification run `44137352156`: SUCCESS. JDK 21 setup, Android lint/unit/instrumentation compile, API 36 release bundle/pilot APK build and artifact uploads passed; Android API 36 emulator job also passed.
- Public release run `44137352144`: SUCCESS as a workflow, but owner signing was unavailable; signing steps were skipped, unsigned release-candidate artifacts uploaded, Netlify production deploy and smoke test skipped. No production deployment occurred.
- Vercel Preview status check succeeded.
- Android emulator verification is no longer outstanding for this PR head; physical-device testing remains outstanding.

## Independent review findings
1. Room migration 1 is additive and read-only for client roles. RLS is enabled; authenticated SELECT is explicitly granted; no client INSERT/UPDATE/DELETE grants or policies are provided.
2. Room activity RPC derives actor and timestamps server-side, pins an empty search_path, restricts writes to active learner-self, validates published room/stage/language content, allow-lists bounded scalar result keys, caps duration and serializes a 30/minute actor rate check.
3. **Security follow-up (not proven exploitable):** `record_room_activity` is a SECURITY DEFINER RPC in the public schema and granted to authenticated. The backend contract recommends keeping privileged implementation functions in a non-exposed schema where possible. Actual PostgREST exposed-schema configuration has not been verified. Before live client integration, verify exposure and consider a private implementation with a narrowly granted exposed wrapper. Do not change production configuration as part of this checkpoint.
4. Catalogue publication audit currently checks that `approved_by` and `published_at` are non-null when status is published; it does not itself validate approver role. Client roles have no write grants, and a staff-authoring workflow is not implemented. Add authorization/audit checks in the future trusted publishing path.
5. Existing room event append-only behavior is enforced for ordinary client roles by grants/RPC boundary; privileged service/database operators remain outside that boundary and must be separately controlled.

## State / decisions
- No production schema/data changes, no live migration, no merge and no production deployment.
- No user secrets were requested or exposed.
- Do not recreate historical migrations or infer that unmatched migration-ledger entries are missing source.
- Preserve static-JS architecture and existing identity/consent systems.
- The test target remains clean and ready, but do not apply room migrations until the authoritative schema-only baseline has been exported, reviewed and supplied.

## Blocker and next actions
1. Owner-controlled local export of production schema-only SQL using `scripts/export-lmu-schema-baseline.sh`; keep DB URL private.
2. Review SQL for credentials, row data, managed-schema dependencies, owners, grants/default privileges and extension compatibility; provide only reviewed SQL plus sanitized manifest.
3. Restore only to isolated Free PostgreSQL 17 target; verify baseline object parity; then apply the two room migrations and run full compatibility/security checks.
4. Verify PostgREST exposed schemas and review SECURITY DEFINER function placement before implementing the live client adapter.
5. Physical-device Android test, hosted authenticated browser E2E, POPIA/legal review and production release approvals remain outstanding.

## Current classification
**RELEASE HOLD / BASELINE RESTORE BLOCKED.** CI verification of the current branch is substantially stronger than the prior checkpoint, including PostgreSQL 17 and Android API 36 emulator success, but full LMU baseline compatibility and live backend integration are not yet verified.

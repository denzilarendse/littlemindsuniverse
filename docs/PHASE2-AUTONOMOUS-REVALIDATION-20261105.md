# Phase 2 — autonomous revalidation (5 November 2026)

## Decision
Phase 2 remains OPEN — RELEASE HOLD. This revalidation corrects one stale blocker: an isolated Supabase project now exists and is owner-authorized for synthetic-only testing. Several release blockers remain confirmed by live provider evidence.

No production writes, database migrations, Auth/Storage changes, PR merges, deployments, DNS/security changes, or Forge operations were performed.

## Source and provider baseline
- Canonical repository: denzilarendse/littlemindsuniverse
- Canonical branch: main
- Latest main commit observed: 91289ae8796af660c287a8f94936c94b383b9879 (2026-11-03)
- Production Supabase: zcokxljcsfkrlouzragv, ACTIVE_HEALTHY; inspected read-only.
- Isolated test Supabase: klfvrawkieyqefbpzywq, LMU-V45-TESTING, ACTIVE_HEALTHY, Free, eu-west-1.
- Netlify site: littlemindsuniverse-app, ID 989d3b15-5ba4-42f7-8ba6-b53dc64fbd27.
- Netlify published deployment: 6ac32e778f64ae1e8cf84c65, READY, production, branch main, created 2026-10-05. Deployment metadata reports commit_ref=null, commit_url=null and commit_message=null.
- Vercel project: littlemindsuniverse, ID prj_OEcMPBGFcMymnPScg4WzvEMLWafI; SSO protection enabled. Latest deployment observed is a READY non-production deployment from the documentation branch.

## Corrected database isolation status
The earlier Phase 2 statement that no isolated test project existed is stale. The user explicitly authorized synthetic-only schema, Auth configuration and test-account creation in the existing LMU-V45-TESTING project. Live provider inventory confirms it is ACTIVE_HEALTHY on the Free plan.

A read-only SQL inventory on 2026-11-05 returned 0 application tables in public/private and confirmed the migration ledger relation is absent. No schema, fixtures, Auth users or test accounts have been created.

The project is an approved isolated target, but database testing remains blocked until a complete authoritative schema baseline is available. Production migration files are a curated delta set: 45 repository SQL files versus 97 production migration-ledger entries in the prior inventory. Applying those deltas to an empty database is unsafe. Generated TypeScript types are not a complete SQL bootstrap.

Required next step: owner-controlled schema-only export from production, with the connection string kept local and no production data exported. Review it, replay locally, then apply to the approved test project. Do not use Forge or inactive legacy projects.

## Release workflow findings
### Canonical main defects confirmed by source inspection
1. Signing and Netlify secrets are declared at job scope, unnecessarily exposing them to every step in the job.
2. Missing signing/Netlify credentials are reported in the summary as BLOCKED, but the main push path does not fail the job solely because those credentials are absent. This can produce a green workflow with release actions skipped.
3. Main path filters omit capacitor.connect.config.json.
4. The health smoke test calls /.netlify/functions/health.

### Live Netlify route verification
Read-only GET checks against https://www.littlemindsuniverse.co.za on 2026-11-05 returned:
- Homepage: HTTP 200
- /api/health: HTTP 200
- /.netlify/functions/health: HTTP 404
- /api/milo with GET: HTTP 405, consistent with a method-restricted API; this is not a successful Milo POST test.

Canonical source contains netlify/functions/health.mjs with config.path = /api/health. Therefore /api/health is the configured route and the current main workflow default function URL is incorrect.

The latest published Netlify deployment metadata lists deployed health and Milo functions with custom routes /api/health and /api/milo. It does not provide a source commit SHA, so deployment-to-source provenance remains unproven.

### PR #108 remediation branch review
Compared fix/public-release-gate-requires-secrets against main: 45 commits ahead, 0 behind; 10 changed files.

The branch workflow scopes secrets to individual steps, uses persist-credentials: false, includes capacitor.connect.config.json in both relevant path filters, changes the health smoke route to /api/health, writes dist/build-info.json containing source SHA and artifact hashes, deploys and smoke-tests a non-production Netlify preview before any production gate, requires owner-triggered workflow_dispatch with confirm_production=true for production promotion, verifies deployed provenance, and contains negative-path tests for missing secrets, wrong site ID, missing/wrong APK, checksum and signature failures.

These are source-level remediation findings, not proof of a successful live preview or production release. CI was not rerun in this turn.

### Frozen Connect APK blocker
docs/PUBLIC-RELEASE.md on the remediation branch explicitly states the pinned 3,024,688-byte signed APK binary is absent from the repository; only its checksum sidecar is said to exist. The exact binary, SHA-256, sidecar and signer certificate must all match. The production gate is expected to fail closed until the owner-signed binary is recovered. Do not substitute an unsigned build or another APK.

## Netlify Deploy Preview provenance correction
The previously inspected deployment 6adb2cd1938624fdaeb89c81 is an agent-run Deploy Preview from 2026-10-23 (agent-6adb2c46b423e1cc4). Its deployment metadata explicitly reports no functions deployed. It is not the current published production deploy and is not evidence about a newer user-observed Milo Preview.

Do not use this older agent preview to conclude that currently published Netlify production functions are absent. Obtain the exact URL of the preview where the user observed Milo responding and inspect that deployment separately.

## Vercel and PR branch status
Vercel project SSO remains enabled. The latest observed Vercel deployment is a READY deployment for draven/phase2-schema-inventory-2026-11-05, source SHA 7231e9518b73835a80e9b12a9ddc5ccd63da3040; it is a documentation preview, not a production deployment.

The prior checkpoint records PR #108, #110 and #111 as open/draft/unmerged. This turn verified their source branches exist and compared changes against main, but the connected GitHub toolset did not expose a current PR-detail/list endpoint; do not represent their current PR state as freshly reverified.

PR #111 changes the global Vercel CSP to allow the isolated test Supabase host. Because vercel.json applies the header globally, this also broadens the Production browser policy. Treat environment-specific CSP separation as a review item before merging.

## Phase 2 acceptance matrix
| Requirement | Result | Evidence / limitation |
|---|---|---|
| Canonical main SHA | PASS | GitHub commit listing |
| Repository/workflow inspection | PASS | Main workflow and package/config files fetched |
| PR #108 remediation diff | PARTIAL | Branch comparison and key workflow/tests/docs inspected |
| Missing-secret fail-closed on main | FAIL | Current main summary-only behavior does not force failure |
| PR #108 fail-closed implementation | SOURCE REVIEW PASS | Gate and negative-path test code inspected; CI not rerun in this turn |
| Correct health route on main | FAIL | Main workflow uses default function path; live GET proves /api/health 200 and default path 404 |
| Correct health route in PR #108 branch | SOURCE REVIEW PASS | Uses /api/health |
| Connect Capacitor path filters on main | FAIL | Omitted in main workflow |
| Connect Capacitor path filters in PR #108 branch | SOURCE REVIEW PASS | Present in PR branch |
| Build provenance on main | FAIL / ABSENT | Provenance scripts not present on main |
| Build provenance in PR #108 branch | SOURCE REVIEW PASS | Writer/verifier source inspected |
| Current Netlify deployment source SHA | BLOCKED | Deployment metadata has null commit_ref/commit_url |
| SHA-bound preview | NOT TESTED | No fresh deploy from remediation branch verified |
| Branch protection / required checks | BLOCKED | Prior checkpoint records rulesets empty and classic protection API 403; not reverified this turn |
| Exact frozen signed Connect APK | BLOCKED | Remediation docs state binary absent |
| Isolated Supabase project exists | PASS | ACTIVE_HEALTHY Free project confirmed |
| Empty test DB baseline | PASS (EMPTY) | 0 app tables; migration ledger relation absent |
| Authoritative schema-only export | BLOCKED | Not supplied/available |
| Synthetic DB functional tests | NOT RUN | No schema/fixtures; no writes |
| Production safety | PASS | Only metadata and HTTP GET/read-only SQL used |

## Plugin/tool capability record
Actually used: Denzil Super Coding Expert and Agentic Workbench/Repository Operator skills; Denzil Super Milo mission-control, deep-testing, deep-research, provider-routing, release-deployment and evidence skills; Milo Connect Intelligence engineering; Deep Testing; Supabase and Postgres Best Practices; Vercel deployment/CI; Netlify deploy; Exa deep research; GitHub, Supabase, Vercel, Linear and Netlify connected tools.

Unavailable in this chat runtime: Chronos local Windows inspection/Heartbeat scripts require the user's local Codex installation and filesystem; no local terminal or Chronos script execution interface is exposed here. Skill instructions were read, but Chronos was not run. Codex Usage reader requires local terminal access and was not run. Browser/computer UI automation for the Netlify learner journey is not exposed in the connected tool list. No independent reviewer/agent execution was available or claimed.

## Required remaining actions
1. Obtain and inspect the complete owner-controlled schema-only export; replay locally; then build the approved test DB baseline.
2. Recover the exact frozen owner-signed Connect APK binary and verify its signature/certificate against the pinned artifact.
3. Fix the main workflow defects through the existing remediation PR path; do not merge without explicit owner authorization.
4. Obtain branch-protection owner access and enforce required checks before accepting main.
5. Generate a fresh Netlify preview from the exact remediation source SHA; verify functions, /api/health, Milo POST/auth behavior and deployed provenance.
6. Verify that the production Netlify deployment can be tied to an immutable source SHA. Do not deploy production as part of this work.
7. Complete browser/device and teacher-led mastery pipeline tests in the isolated environment.

## Safety statement
No production database writes, production migrations, Forge writes, test database writes, PR merges, deployments, DNS changes, access-control changes, or secret disclosures occurred during this revalidation.

**Phase 2 acceptance: NOT ACCEPTED. Overall: RELEASE HOLD.**
# LMU Primary Blueprint — Phase 0 Discovery and Evidence Baseline

**Prepared:** 2026-11-19 (SAST)  
**Authority:** User-designated primary LittleMindsUniverse expanded master blueprint, uploaded as `97 page lmu master plan expandes.docx`. The user confirmed that this expanded document is the authoritative original blueprint, evolving from the earlier 65-page foundation.  
**Repository:** `denzilarendse/littlemindsuniverse`  
**Default branch inspected:** `main`  
**Main HEAD at scan:** `91289ae8796af660c287a8f94936c94b383b9879`  
**Discovery mode:** Read-only inspection. No production database, DNS, hosting, merge, deployment, signing or billing changes were performed.

## 1. Executive result

Phase 0 has established a source-backed inventory of the canonical repository, open development work, hosting projects, Supabase projects, the current production domain/deploy identity, and the eleven named ecosystem components.

The canonical source repository is a static JavaScript/PWA application with a Capacitor Android wrapper. Its current main branch contains the central children's learning platform, Milo runtime, and LittleMinds Connect. Significant blueprint-aligned extensions exist on draft pull requests/feature branches and are not part of `main`.

The live website is served by Netlify at `https://www.littlemindsuniverse.co.za`. Its current published deployment is READY and is associated with branch `main`, but Netlify reports no commit SHA, commit URL or commit message for that deploy. Therefore, the exact source revision running in production is **not proven**.

Supabase currently lists one active production LMU project and one active empty PostgreSQL 17 test project. Separate projects named LittleMindsUniverse Adults Staging, Denzil Forge and CareerLaunch SA exist but are INACTIVE. They are not evidence of operational products.

## 2. Canonical source and development environment

### Repository facts

- GitHub repository: `denzilarendse/littlemindsuniverse`
- Visibility: public
- Default branch: `main`
- Main HEAD: `91289ae8796af660c287a8f94936c94b383b9879`
- Repository tree at inspected HEAD: 347 paths.
- Package: `littlemindsuniverse` version `4.0.0`
- Module type: ES modules.
- Runtime requirement: Node.js >=22.
- Source architecture: static HTML, CSS and JavaScript; do not replace with a framework without a separately approved architecture decision.
- Main checks: `npm run lint`, `npm test`, `npm run build`, combined by `npm run check`.
- Android: Capacitor 8.5.2; application ID `za.co.littlemindsuniverse`.
- Main source folders: `assets/`, `api/`, `netlify/`, `database/`, `data/`, `android/`, `scripts/`, `tests/`, `docs/`.
- Main app shell: `index.html`; main application: `assets/app.js`; Milo API: `api/milo.js`; Connect UI: `connect.html` and `assets/connect-app.js`.

### Existing architecture documents

- `docs/ARCHITECTURE-2.0.md`: Milo Learning OS architecture contract.
- `docs/PRODUCT-SCOPE.md`: current children's learning product scope and release boundaries.
- `docs/LITTLEMinds-CONNECT-ARCHITECTURE.md`: Connect architecture.
- `docs/SECURITY.md`: security boundaries.
- `docs/DEPLOYMENT.md`: deployment and release gates.

The repository's Architecture 2.0 document is an implementation architecture for the current children's learning platform and Milo engines. It is not a substitute for the full ecosystem scope in the primary master blueprint.

## 3. Ecosystem component reconciliation

Statuses distinguish source code, tests, hosted infrastructure and production deployment. A document or inactive database project does not prove an operational application.

| Primary blueprint component | Evidence found | Current status | Gap / next dependency |
|---|---|---|---|
| LittleMindsUniverse — central platform | `index.html`, `assets/app.js`, Supabase Auth client, role-aware learner/teacher/parent/admin flows, PWA and Capacitor shell; CI status on main reports success | **IMPLEMENTED; CI-TESTED; production source provenance UNVERIFIED** | Map the published Netlify deploy to an exact Git SHA; verify live authentication and complete core journeys. |
| LittleMindsUniverse Supervarsity — children 2–18 | Six age stages, Academy/learning, assignments, submissions/evidence, mastery, classrooms, parent/teacher workflows and Milo integration in main; tests and Architecture 2.0 docs | **IMPLEMENTED; TESTED IN SOURCE** | Full end-to-end hosted learner journey, full curriculum coverage, physical-device acceptance and release gates remain open. |
| Milo AI — ecosystem intelligence | `api/milo.js`, `api/_lib/milo-orchestrator.js`, Netlify `milo` function and active Supabase `milo` Edge Function; PRs #114, #115 and #116 | **IMPLEMENTED PARTIALLY; EXTENSIONS IN DEVELOPMENT** | PR #116 authorizer is not wired into `/api/milo`; curriculum and document pipeline is incomplete; memory database baseline and teacher approval integration remain gated. |
| LittleMindsUniverse Adults | Inactive Supabase project `LittleMindsUniverse Adults Staging`; PR #112 includes an Adult Academy demo room only | **NOT PRODUCTION-IMPLEMENTED; DEMO WORK IN DRAFT** | Establish a distinct adult learning journey, independent adult privacy/profile rules, live backend and verified curriculum/content. |
| LMU Connect | `connect.html`, `assets/connect-app.js`, `assets/connect-bridge.js`, Connect Android module, database migrations and Connect tests exist on main | **IMPLEMENTED; SOURCE-TESTED** | Confirm live messaging/auth workflows and release identity; owner-signed Android and Play gates remain separate. |
| Career Launch SA | Supabase project `CareerLaunch SA` exists but is INACTIVE; PR #112 Career Galaxy is a demo room, not proof of the separate product | **NOT LOCATED AS AN OPERATIONAL PRODUCT** | Locate/confirm authoritative Career Launch source, activate only through approved plan, and implement full profile-to-CV/application workflow. |
| Tenders SA | No dedicated application directory, runtime module or matching Supabase project found in the canonical repository/project inventory | **NOT LOCATED** | Identify authoritative source, product owner and opportunity data sources before implementation. |
| Denzil Forge | Supabase project `Denzil Forge` exists but is INACTIVE; no dedicated Forge app/module found in canonical main tree | **NOT LOCATED AS AN OPERATIONAL PRODUCT** | Locate source and decide how it integrates with existing GitHub/CI/security workflows without duplicating reliable tools. |
| Automate LMU | No dedicated Automate LMU product/runtime found in canonical main tree or Supabase project list. GitHub Actions and Netlify functions exist as platform engineering infrastructure | **NOT LOCATED AS A SEPARATE PRODUCT** | Preserve its separate-product boundary; define its own workflow/event/approval/audit architecture. Do not relabel CI scripts as Automate LMU. |
| LatestLMU | GitHub workflows, tests, PR process and docs provide engineering/release activity; no dedicated LatestLMU product/module found | **NOT LOCATED AS A DISTINCT PRODUCT** | Define controlled feature intake, bug triage, release planning, versioning and feedback workflows as the blueprint specifies. |
| Ultimate LMU | No separate app/module found. The blueprint explicitly defines this as the unified ecosystem operating environment, not another standalone application | **PLANNED INTEGRATION OBJECTIVE** | Depends on the intended applications being implemented and their identity, entitlement, Milo, automation, monitoring and data boundaries being verified. |

## 4. Current development branches and pull requests

The following open draft PRs are material to blueprint alignment:

| PR | Title | State | Evidence-based meaning |
|---|---|---|---|
| #112 | LMU blueprint rooms MVP — shared shell integration | Open, draft, unmerged; head `fe2f2548def02280960137ed9765f0300e545fba` | Adds PlayWorld, StoryVerse, Career Galaxy, Adult Academy, Creator Studio, Community Garden, Parent Hub, Teacher Studio and Admin Console demo surfaces. New room writes are demo-only; live persistence and RLS-backed APIs are not complete. |
| #114 | LMU CAPS resource discovery and Android Play readiness preflight | Open, draft, unmerged; head `7c60f1fc7b1ef12ceebcc63c27c5618cbd33bac2` | CAPS discovery, rights-gated PDF retrieval, page-preserving PDF extraction adapter, Android preflight. PR summary reports 321 tests passed and a pilot debug APK artifact; the 47 MB sample is one Grade 10 Business Studies learner book, not an all-grades workbook. |
| #115 | Milo personalised academic improvement and weekly mastery workflow | Open, draft, unmerged; head `efcca89616ddb8dabf9192ce828ac5fa52646132` | Curriculum/progression/teacher-governed workflow design and Grade 6 Mathematics Term 1 starter slice. No learner-facing teaching engine or runtime workflow is claimed in this PR. It is stacked on #114. |
| #116 | Prototype Milo memory and academic history services | Open, draft, unmerged; head `a5c53eadfd636a0953868418b1d44c91a648f08f` | Memory lifecycle and academic history services with synthetic tests and a schema proposal. Authorizer is not yet integrated into `/api/milo`; no migration applied. |
| #111 | Route Vercel Preview to isolated Supabase runtime | Open, draft, unmerged | Preview-only runtime configuration change; stacked on auth work. No production DB or Netlify changes. |
| #110 | Fix Supabase auth callback login stall | Open, draft, unmerged | Auth-state callback repair; not merged. |
| #109 | Enforce canonical www production domain policy | Open, draft, unmerged | Documents canonical www host and Netlify evidence; apex redirect/source provenance still open. |
| #108 | Prevent false-green public release checks when production steps are skipped | Open, draft, unmerged | Release gate hardening. PR body records missing owner-signed Connect binary, main branch protection, and production SHA provenance as unresolved. |

No PR listed above is merged. Their source changes must not be represented as present on main or live production.

## 5. Hosting and deployment inventory

### Netlify — production host

- Canonical site: `littlemindsuniverse-app`
- Site ID: `989d3b15-5ba4-42f7-8ba6-b53dc64fbd27`
- Primary URL: `https://www.littlemindsuniverse.co.za`
- Published deploy: `6ac32e778f64ae1e8cf84c65`
- Deploy state: `ready`
- Deploy branch: `main`
- Published: 2026-10-05
- Deploy detail lists `health` and `milo` functions.
- **Critical provenance gap:** `commit_ref`, `commit_url` and `commit_message` are null. The current production source SHA is therefore not established by the Netlify deploy record.
- A second site, `littlemindsuniverse-web-app`, exists with a separate deploy and SSO required for non-production. It is not the canonical public production site.

### Vercel — linked preview/API project

- Team: `denzilarendse projects` (Hobby plan).
- Project: `littlemindsuniverse`, ID `prj_OEcMPBGFcMymnPScg4WzvEMLWafI`.
- Git link: `denzilarendse/littlemindsuniverse`.
- Project domain found: `littlemindsuniverse.vercel.app`.
- No LMU custom production domain is attached to this Vercel project.
- Recent deployment records include READY preview builds from the Milo memory branch; these have no production target designation.
- Vercel is not the verified owner of the LMU custom production domain.

### Production domain

Netlify currently reports the canonical public URL as `https://www.littlemindsuniverse.co.za`. PR #109 reports a valid TLS chain and www CNAME evidence, but apex-to-www redirect and complete alias inventory remain unverified. No DNS changes were made.

## 6. Supabase project inventory

Read-only project listing returned:

| Project | Ref | Status | Interpretation |
|---|---|---|---|
| LittleMindsUniverse | `zcokxljcsfkrlouzragv` | ACTIVE_HEALTHY; PostgreSQL 17.6 | Canonical production project. Strictly read-only for this work. |
| LMU-V45-TESTING | `klfvrawkieyqefbpzywq` | ACTIVE_HEALTHY; PostgreSQL 17.11 | Isolated test project; prior verified inventory found zero public tables and zero migrations. Not yet a restored LMU baseline. |
| LittleMindsUniverse Adults Staging | `rjtwpwlzwjejiuxmmycw` | INACTIVE | Not an operational adult product backend. |
| Denzil Forge | `ekswytyvfwgrpzfzxtgf` | INACTIVE | Project shell exists; no operational Forge product established. |
| CareerLaunch SA | `rqyvfbuvdhbtwakkqnok` | INACTIVE | Project shell exists; no operational Career Launch product established. |
| `@littlemindsuniverse/LittleMindsUniverse-a03b6b7e` | `ghgkeqjtztmrtqmrqsfs` | INACTIVE | Legacy/other project; ownership and intended role require confirmation before use. |

The production project currently lists active Edge Functions: `payfast-itn`, `lmu-retention-cleanup`, `payfast-checkout`, `pricing` and `milo`.

Prior read-only database recovery evidence (carried forward, not replayed in this scan):
- Production migration ledger contains 97 entries.
- 97 production ledger SQL statements were recovered and integrity-checked in the owner's Ubuntu environment.
- 68 historical Git migration files were recovered.
- The Git migration folder is a curated delta, not a complete bootstrap.
- No complete authoritative schema-only baseline has yet been restored into the isolated test project.
- Do not replay partial migrations into an empty project.
- Production remains read-only. No DDL, DML, migration or schema change was performed.

## 7. Android and PWA inventory

- Main branch includes Capacitor Android project, manifest, package identity tests and Android verification workflow.
- Main branch includes a PWA manifest and service worker.
- PR #112 records API 36 emulator and packaging verification for a pilot debug APK; unsigned/debug artifacts are not production-signed or Play Store releases.
- PR #114 reports a later pilot debug APK artifact and Android build/static verification; owner signing, physical-device acceptance and Play Console gates remain open.
- No current owner-signed production APK/AAB or Play Store publication was verified during this discovery scan.
- Connect has a separate Android module and signing/Play readiness documentation; the frozen owner-signed direct-download binary is still a release gate according to PR #108.

## 8. Security, privacy and data governance baseline

Primary blueprint requirements include central identity with application-specific authorization, multi-tenant separation, database RLS, server-side API authorization, input validation, rate limiting, audit logging, secret management, backups, incident response and vulnerability testing. South African POPIA and child-protection requirements are particularly relevant.

Current evidence and constraints:
- Supabase Auth is the existing identity foundation.
- Existing main code includes role-aware workflows and database migrations/RLS for the current LMU and Connect features.
- The Milo memory PR uses admin Supabase adapters that bypass RLS; the fail-closed application authorizer is mandatory and is not yet wired to `/api/milo`.
- New blueprint room writes remain demo-only in PR #112.
- No room or memory migrations were applied to production or the isolated test project.
- Main branch protection was reported as disabled in PR #108; no branch ruleset was reported there. This must be rechecked before release governance is considered complete.
- Legal review of the uploaded South African law reference booklet remains an engineering issue list, not a substitute for qualified legal advice.

## 9. Phase 0 blocker and risk register

| ID | Severity | Finding | Required action |
|---|---|---|---|
| P0-01 | HIGH | Production Netlify deploy has no source SHA provenance. | Establish a traceable deploy from a known Git SHA using a preview-first process; production promotion requires explicit owner approval. |
| P0-02 | HIGH | Canonical main is behind multiple unmerged draft branches/PRs. | Review dependencies and test evidence; do not merge automatically. Resolve stacked PR order. |
| P0-03 | HIGH | Production schema baseline is not restored; isolated test project is empty. | Owner-controlled schema-only export, sanitisation/review, local PostgreSQL 17 replay, then separately approved isolated test migration. |
| P0-04 | HIGH | Milo memory authorization is not integrated into `/api/milo`. | Integrate in a feature branch and test legitimate and cross-learner-denied paths before any deployment. |
| P0-05 | HIGH | Several named ecosystem products are absent or exist only as inactive project shells/demo rooms. | Locate authoritative source repositories or treat as not implemented; create phased product plans from the primary blueprint. |
| P0-06 | HIGH | Main branch protection/review gates were reported disabled. | Owner-controlled branch ruleset and required CI/review checks before release. |
| P0-07 | MEDIUM | Netlify has two similarly named sites, creating deployment-target ambiguity. | Keep canonical site ID explicit in release automation; do not alter either site without approval. |
| P0-08 | MEDIUM | Career Launch SA, Denzil Forge and Adults Supabase projects are inactive. | Confirm whether these are retained staging projects, archive candidates or intended future targets; do not activate or delete during discovery. |
| P0-09 | MEDIUM | Local Termux/Ubuntu working tree was not accessible to this connected inspection. | Compare owner-local working tree, local branches and uncommitted changes before local edits or release work. |
| P0-10 | MEDIUM | Full live apex redirect and all domain aliases not verified. | Complete read-only DNS/redirect verification before release acceptance. |
| P0-11 | MEDIUM | Curriculum catalogue/resource discovery is incomplete and rights-gated. | Validate authoritative source, redistribution/AI-processing rights, grade/subject coverage and page provenance before learner-facing use. |
| P0-12 | MEDIUM | Android artifacts are debug/unsigned candidates; owner signing and physical-device acceptance are outstanding. | Keep Play/production release on hold until owner-controlled signing and device gates pass. |

## 10. Phase 0 exit-gate assessment

**Phase 0 — Discovery and Evidence: COMPLETE WITH LIMITATIONS.**

The inventory identifies the canonical repository, main source structure, major application components, draft workstreams, hosting ownership, active/inactive Supabase projects, production deployment identity, known database baseline gap, security blockers and unverified items. The unverified deployment SHA, local Termux state and domain redirect details are explicitly recorded as findings rather than silently assumed.

No production system was modified. No migrations were run. No pull request was merged. No production deployment was performed.

## 11. Phase 1 — Foundation and Consolidation: readiness

Phase 1 is **NOT COMPLETE**. It can proceed in safe documentation and review slices, but its exit gate is blocked by:
1. authoritative source-to-production SHA mapping;
2. final repository/branch ownership and merge sequencing;
3. staging database baseline restoration and reviewed recovery procedure;
4. owner-controlled branch protection and release controls;
5. verified secret-management/configuration ownership;
6. documented backup/restore test evidence;
7. API conventions and service ownership across all intended applications.

The next implementation slice should be a read-only source/deployment and PR dependency review, followed by a proposed foundation decision record. Do not perform production migrations, merges, deployments, DNS changes, security-setting changes or project activation without the required approval.

## 12. Evidence links

- Canonical repository: https://github.com/denzilarendse/littlemindsuniverse
- Main HEAD: https://github.com/denzilarendse/littlemindsuniverse/commit/91289ae8796af660c287a8f94936c94b383b9879
- PR #112 Blueprint rooms: https://github.com/denzilarendse/littlemindsuniverse/pull/112
- PR #114 CAPS/Android: https://github.com/denzilarendse/littlemindsuniverse/pull/114
- PR #115 Milo weekly mastery: https://github.com/denzilarendse/littlemindsuniverse/pull/115
- PR #116 Milo memory: https://github.com/denzilarendse/littlemindsuniverse/pull/116
- PR #108 release hardening: https://github.com/denzilarendse/littlemindsuniverse/pull/108
- PR #109 canonical domain: https://github.com/denzilarendse/littlemindsuniverse/pull/109
- Production domain: https://www.littlemindsuniverse.co.za
- Netlify production site: https://app.netlify.com/projects/littlemindsuniverse-app
- Vercel project: https://vercel.com/denzilarendse-projects/littlemindsuniverse

---
**Checkpoint rule:** This report records a point-in-time discovery baseline. Refresh live project/PR/deploy state before making any Phase 1 decision that depends on it.

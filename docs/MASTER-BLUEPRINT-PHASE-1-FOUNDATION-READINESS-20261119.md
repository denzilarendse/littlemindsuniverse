# LMU Primary Blueprint — Phase 1 Foundation and Consolidation Readiness

**Prepared:** 2026-11-19 (SAST)  
**Parent checkpoint:** `docs/MASTER-BLUEPRINT-PHASE-0-VERIFIED-BASELINE-20261119.md`  
**Repository:** `denzilarendse/littlemindsuniverse`  
**Inspected main HEAD:** `91289ae8796af660c287a8f94936c94b383b9879`  
**Status:** FOUNDATION BASELINE DOCUMENTED — PHASE EXIT GATE NOT YET MET

## 1. Purpose

The primary master blueprint's Phase 1 establishes a reliable technical and organisational foundation. This record consolidates what the existing source and project configuration already establish, what can safely be adopted as the working baseline, and which controls still require owner-controlled action or evidence.

This is a documentation/review checkpoint. It does not change production configuration, credentials, database schema, DNS, branch protection, hosting, billing or release state.

## 2. Foundation baseline — evidence and disposition

| Phase 1 requirement | Existing evidence | Disposition |
|---|---|---|
| Confirm authoritative application architecture | Primary ecosystem blueprint; canonical repository `denzilarendse/littlemindsuniverse`; `docs/ARCHITECTURE-2.0.md`; `docs/PRODUCT-SCOPE.md` | **Working baseline identified.** The master blueprint governs product scope; Architecture 2.0 governs the Milo/children's learning technical slice. Neither silently replaces the other. |
| Establish repository ownership | Public GitHub repository; owner `denzilarendse`; default branch `main`; current main SHA recorded in Phase 0 | **Identified.** Feature branches and PRs remain separate from main until reviewed/merged. |
| Define development environments | `docs/DEPLOYMENT.md` records Termux/Android-first local workflow; GitHub Actions; Vercel/Netlify build paths; Node >=22 from `package.json` | **Documented, local state unverified.** Owner-local Termux/Ubuntu checkout and uncommitted files were not accessible in this connected scan. |
| Establish staging environments | Supabase project `LMU-V45-TESTING` is ACTIVE_HEALTHY on PostgreSQL 17.11, but prior verified inventory found zero public tables and zero migrations | **Environment exists; usable LMU staging baseline not ready.** Do not treat an empty database as a restored staging system. |
| Confirm production hosting responsibilities | Netlify canonical site `littlemindsuniverse-app`; Vercel linked project exists and uses the same Git repository | **Working responsibility identified:** Netlify serves the canonical production domain; Vercel supports approved preview/API work. Netlify deploy SHA provenance remains unresolved. |
| Standardise application configuration | `.env.example`, `netlify.toml`, `vercel.json`, `assets/runtime-config.js` | **Configuration conventions documented.** Do not copy secrets into browser/mobile files. |
| Establish secret management | `.env.example` separates browser-safe Supabase publishable key from backend-only Supabase secret/service-role and Groq keys | **Policy documented; provider settings not audited by reading secret values.** Never expose, copy or log secret values. |
| Document database ownership | Primary blueprint Part 3 assigns shared infrastructure; existing app uses Supabase Auth/PostgreSQL/RLS; production ref `zcokxljcsfkrlouzragv` | **Working ownership identified.** The central Supabase project is production. Specialised apps must enforce their own authorization and must not access each other's private data merely because they share infrastructure. |
| Define API conventions | `api/_lib/http.js`, `api/_lib/supabase.js`, `api/milo.js`; Netlify adapters reuse API handlers | **Conventions evidenced.** Node ESM handlers; bearer-token authentication; explicit method/CORS handling; UUID validation; sanitized errors; user JWT RPC path; server-only admin RPC/read path. |
| Establish development standards | `package.json`, CI workflows, `docs/SECURITY.md`, architecture docs, tests and PR workflow | **Partially established.** Existing lint/test/build checks are defined; main branch protection and required-review enforcement were reported disabled in PR #108 and need owner-controlled verification/enforcement. |
| Establish backup and recovery | `docs/BACKUP-RESTORE-AND-DELETION-GATE-20261003.md`; schema recovery evidence in Phase 0 | **Not verified operationally.** A backup availability record and a successful isolated restore drill are still required. Production in-place restore is not an acceptable test. |
| Define release management | `docs/DEPLOYMENT.md`, `docs/PUBLIC-RELEASE.md`, CI workflows and PR #108 | **Partially established.** Preview-first and explicit owner promotion are described; exact production SHA provenance and branch protection remain unresolved. |

## 3. Working technical direction

The following is the evidence-backed working direction. It preserves the current architecture and the primary blueprint; it is not permission to replace providers or perform high-impact changes.

1. **Product authority:** the user's expanded primary LMU master blueprint is the source of truth for ecosystem components, product boundaries, priorities and phase exit criteria.
2. **Canonical source:** `denzilarendse/littlemindsuniverse`, with `main` as the default branch. Draft branches are not production source.
3. **Application architecture:** retain the existing static HTML/CSS/JavaScript + PWA + Capacitor structure where it is sound. Do not introduce a framework rewrite.
4. **Production website:** Netlify site `littlemindsuniverse-app` is the verified current canonical host for `www.littlemindsuniverse.co.za`.
5. **Preview/API:** Vercel is linked to the canonical GitHub repository and may be used for approved preview/API services. It does not own the LMU custom production domain in the current inventory.
6. **Identity/database:** Supabase Auth and PostgreSQL/RLS remain the existing foundation. Each application must enforce authorization for its own data.
7. **Server API:** share the tested Node ESM API handlers between Vercel-compatible `/api` routes and thin Netlify function adapters where supported.
8. **Local workflow:** Termux/Ubuntu remains the intended owner-local development environment; current local filesystem state still needs owner-side verification.
9. **Android:** Capacitor package ID remains `za.co.littlemindsuniverse`; owner signing and store publication are separate controlled gates.
10. **Production safety:** production Supabase remains read-only during foundation/discovery; no database migration or production deployment is implied.

## 4. API and configuration conventions observed

### API conventions

- Shared HTTP helpers: `api/_lib/http.js`.
- Bearer authentication and request user validation: `api/_lib/supabase.js`.
- Authenticated user operations use the caller's access token and publishable key for Supabase RPC calls.
- Server-admin operations use a server-only secret/service-role credential.
- The server-admin client bypasses RLS; every such call must be preceded by a verified application authorization boundary.
- CORS origins are configured from `PUBLIC_APP_URL` and `CORS_ALLOWED_ORIGINS`, with local Capacitor/browser development origins handled explicitly.
- API errors suppress internal detail for 5xx responses.
- HTTP methods are explicitly restricted by handlers.
- Netlify adapters should reuse the same tested handler logic rather than fork business rules.

### Configuration conventions

- `PUBLIC_APP_URL`
- `CORS_ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (browser-safe)
- `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY` (backend-only)
- `GROQ_API_KEY` (backend-only)
- Milo model and rate-limit configuration.

The example file contains names/placeholders only. This scan did not read or export any provider secret values.

## 5. Unresolved foundation gates

| ID | Gate | Why it remains open | Safe next step |
|---|---|---|---|
| F1-01 | Netlify production source provenance | Current deploy `6ac32e778f64ae1e8cf84c65` is READY and branch `main`, but commit SHA/URL/message are null | Create a controlled preview from a known SHA and verify its manifest; only then propose a production promotion plan. |
| F1-02 | Main branch protection | PR #108 reports `main.protected=false` and no rulesets; this is a security/repository governance setting | Recheck current state and present exact required checks/review rules. Enabling/changing protection requires owner approval. |
| F1-03 | Staging database baseline | `LMU-V45-TESTING` is empty; production has 97 ledger entries; recovered Git migrations are partial | Owner-controlled schema-only export, sanitisation and review; local PostgreSQL 17 restore/replay first. |
| F1-04 | Backup/restore proof | Documentation describes a safe drill but does not prove a recent backup or successful restore | Owner/provider checks backup availability and runs a restore-to-new-project or disposable logical restore. |
| F1-05 | Local development baseline | Connected GitHub view cannot inspect owner-local Termux/Ubuntu files or uncommitted changes | Compare local branch, status and HEAD with canonical repository before local implementation. |
| F1-06 | Secret inventory and scopes | The source template defines expected names but does not prove configured provider scopes or ownership | Audit secret names/scopes in provider settings without revealing values; no secret values should enter chat or Git. |
| F1-07 | PR dependency/merge sequencing | #115 is stacked on #114; #111 is stacked on #110; #112/#114/#116 remain draft and unmerged | Review each PR's current head, CI and dependencies before preparing a merge sequence. Merging requires review and explicit authorization where it changes production behavior. |
| F1-08 | Production database ownership and parity | Existing central production project is identified, but exact current schema parity/recovery baseline remains incomplete | Keep production read-only; validate only against restored isolated PostgreSQL 17 baseline. |

## 6. Risks and controls

- **BLOCKER for production release:** exact source-to-deploy provenance is absent.
- **BLOCKER for database-dependent implementation:** authoritative schema-only baseline is not yet restored and verified.
- **HIGH:** Milo admin adapters bypass RLS; fail-closed authorization integration is a mandatory security gate.
- **HIGH:** multiple important draft branches create a risk of confusing feature-branch code with production code.
- **HIGH:** no verified backup restore drill.
- **HIGH:** separate ecosystem projects are inactive or absent; do not activate/repurpose them by assumption.
- **MEDIUM:** main branch protection/review rules are not confirmed enabled.
- **MEDIUM:** local Termux working tree not inspected.
- **MEDIUM:** provider secret names/scopes and backup plan entitlements not fully verified.

## 7. Phase 1 exit-gate assessment

**Phase 1 — Foundation and Consolidation: NOT COMPLETE.**

The technical direction, repository, hosting roles, database ownership, API patterns and configuration conventions are now documented from source evidence. The phase cannot be declared complete until the following evidence exists:

1. a known Git SHA is traceably deployed to the canonical Netlify site through an approved release process;
2. main branch protection and required CI/review checks are verified and owner-approved;
3. a reviewed schema-only LMU baseline is restored and replayed successfully in an isolated PostgreSQL 17 environment;
4. backup and recovery are demonstrated in a disposable environment;
5. secret ownership/scopes and environment separation are audited without exposing values;
6. owner-local Termux/Ubuntu state is reconciled with canonical source.

No production migration, production deployment, DNS mutation, provider configuration change, security-setting change or project activation was performed. These are explicit approval/evidence gates, not tasks to bypass.

## 8. Next phase slice

Continue Phase 1 with:
1. read-only verification of current main branch protection and current PR/CI state;
2. prepare a safe owner-run schema-only baseline/recovery checklist from the existing exporter/runbook;
3. map the precise PR dependency sequence and classify each change by whether it is documentation, application runtime, security/auth or database;
4. prepare a preview-first source-provenance procedure for Netlify without promoting production.

Do not merge, deploy, change branch security settings, activate projects or apply migrations without the required approval.

---
This is a point-in-time foundation readiness record, not an approval to make high-impact changes.


## 9. Live verification addendum — 2026-11-19

After the initial record was written, current commit status contexts were checked for the inspected refs:

| Ref | Current Vercel status context | Interpretation |
|---|---|---|
| main `91289ae8796af660c287a8f94936c94b383b9879` | SUCCESS | Vercel CI status is green for the main SHA; this does not prove Netlify production provenance or a live end-to-end release. |
| PR #112 head `fe2f2548def02280960137ed9765f0300e545fba` | SUCCESS | Preview/CI status green; PR remains draft and unmerged. |
| PR #114 head `7c60f1fc7b1ef12ceebcc63c27c5618cbd33bac2` | FAILURE | Status target reports Vercel build-rate-limit/upgrade route. This is not evidence of a source-code test failure; check GitHub Actions for the authoritative repository test result. |
| PR #115 head `efcca89616ddb8dabf9192ce828ac5fa52646132` | SUCCESS | Preview/CI status green; PR remains draft and unmerged. |
| PR #116 head `a5c53eadfd636a0953868418b1d44c91a648f08f` | FAILURE | Status target reports Vercel build-rate-limit/upgrade route. This is not evidence of a source-code test failure; check GitHub Actions for the authoritative repository test result. |

The GitHub integration's read of `GET /repos/{owner}/{repo}/branches/main/protection` returned HTTP 403 (Resource not accessible by integration). Therefore, current branch-protection configuration could not be independently re-read through this connection. PR #108's earlier owner-side evidence reported `main.protected=false`; this remains an unresolved governance finding, not a freshly re-verified current value.

These checks do not change the Phase 1 disposition. Phase 1 remains NOT COMPLETE.

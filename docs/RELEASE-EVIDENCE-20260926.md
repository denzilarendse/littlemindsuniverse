# LittleMindsUniverse Release Evidence — 26 September 2026

## Decision

**RELEASE HOLD — source/build/security foundation green; hosted end-to-end, provider and store/device gates remain unevidenced.**

This is not a failed engineering build. It means the gates that can currently be proven from GitHub, Vercel status and live Supabase have passed, while gates that require the production domain, real test-account credentials, payment-provider state, physical Android tooling/signing or store accounts are not being guessed.

## Canonical source

- Repository: `denzilarendse/littlemindsuniverse`
- Canonical branch: `main`
- Application-code baseline after the current intervention chain: `06b831ce02627e781184b81441fba2c897242d43`
- Generated `dist/` is no longer canonical source; CI/hosting recreates it with `npm run build`.

## Green evidence observed

### Repository / CI

- PR #11 established the LittleMinds Connect backend foundation and retired the WhatsApp runtime/provider dependency.
- PR #12 added the standalone `/connect.html` secure messaging client, read/unread state, replies, duplicate-send protection and conversation-scoped Realtime.
- PR #13 hardened Vercel/Netlify response headers and repaired a live guardian RLS correlation defect.
- PR #14 hardened verified-guardian read boundaries for classroom metadata, weekly reports and private evidence storage.
- PR #15 removed stale generated `dist/` files from source control so deployable output is always rebuilt from canonical source.
- Main workflow run 70 passed clean install, syntax/lint, the complete automated test suite + smoke, production build and deployable-artifact guard.
- Vercel deployment status for `06b831ce...` reported success.

### Live Supabase security

Observed during the 26 September audit:

- public tables without RLS: **0**
- public storage buckets: **0**
- anonymous write grants on public application tables: **0**
- SECURITY DEFINER functions executable by `PUBLIC`: **0**
- SECURITY DEFINER functions missing a controlled search path in the audited set: **0**
- broad `USING (true)` / `WITH CHECK (true)` policies in audited public/storage schemas: **0**
- policy self-equality correlation defects after repair: **0**

The live guardian-correlation repair now binds a guardian relationship to the learner on the submission/recipient row. A second live hardening migration requires verified guardian relationships for classroom visibility, approved reports and private evidence reads; classroom access also requires active membership and an active learner.

### LittleMinds Connect

Live/backend evidence already obtained:

- parent create/open/send/read flow: PASS
- teacher create/open/send/read flow: PASS
- forged learner membership cannot read/send: PASS
- revoking guardian class-message permission invalidates the relationship: PASS
- disabling a classroom invalidates the conversation relationship: PASS
- unrelated learner/classroom conversation creation is denied: PASS
- WhatsApp contact/dispatch access is retired and existing provider opt-ins are disabled while historical records remain preserved.

Current product rule: learner accounts do not receive an unrestricted classroom composer. Connect authorization is relationship-based, not phone-number or public-directory discovery.

### Deployment security

Vercel and Netlify configuration now require a restrictive CSP and matching browser hardening. The CSP allows only the application, the pinned Supabase origin/WSS endpoint, the required jsDelivr Supabase client, private media/data origins and the explicit PayFast form destinations. `unsafe-eval` and wildcard default sources are rejected by regression tests.

## Red -> repair -> green interventions retained as evidence

1. The first Connect CI run still expected the removed WhatsApp API. Root cause: stale smoke-test artifact list. It was corrected to require Connect and explicitly require the WhatsApp endpoint to be absent; full CI was rerun.
2. A Vercel preview then failed because `vercel.json` still referenced the deleted WhatsApp function. The stale deployment entry was removed and regression-tested; GitHub and Vercel returned green.
3. Standalone Connect CI exposed an over-broad entitlement-string test and a stale PWA cache-version assertion. The entitlement test was narrowed to actual data/RPC gates rather than banning explanatory copy, and the cache assertion was updated to the intended new version; full CI returned green.
4. Live policy audit found `gl.learner_id = gl.learner_id` in four RLS predicates. The row correlation was repaired in live Supabase and committed as a migration. A first regression-test run failed because the test matched the historical defect text in an SQL comment; the test was corrected to inspect executable SQL while retaining the security assertions. Full CI and Vercel returned green.
5. Further live policy review found guardian read paths that relied on permission flags without explicitly requiring `verified=true`. Classroom/report/private-evidence policies were hardened live and regression-tested; full CI and Vercel returned green.

At no point was an authorization condition weakened merely to obtain a pass.

## Remaining release gates

| Gate | Current state | Evidence still required |
| --- | --- | --- |
| Canonical repository / source | PASS | Keep release tied to an exact SHA |
| Clean install / lint / tests / build | PASS | Re-run on every release SHA |
| Live RLS/RPC/storage baseline | PASS for audited scope | Continue negative regression with real role sessions during hosted E2E |
| LittleMinds Connect foundation | PASS | Hosted real-account parent/teacher realtime E2E still required |
| WhatsApp retirement | PASS | No new runtime/provider dependency may be added |
| PayFast unit/ITN code | PASS at automated-test layer | Provider-approved/live or sandbox end-to-end settlement evidence required |
| Production domain / HTTPS | UNKNOWN | External fetch/TLS/DNS evidence for the actual production candidate |
| Auth lifecycle on hosted candidate | UNKNOWN | Real learner/parent/teacher/admin test sessions |
| Browser/mobile E2E | UNKNOWN | Navigation, role isolation, submission, reporting, Connect and payments on hosted candidate |
| PWA install/update/offline | UNKNOWN | Real browser/device installation and update/offline evidence |
| Backup / restore / rollback | UNKNOWN | Successful recovery exercise and recorded timings/artifacts |
| Android application ID | NOT FROZEN | Owner-approved permanent package ID |
| Android signing | BLOCKED on owner-controlled key | Keystore/Play App Signing ownership evidence |
| Digital Asset Links | BLOCKED until Android identity/signing | Published `.well-known/assetlinks.json` verified against signing certificate |
| Android target API / signed AAB | BLOCKED | Final Android project/toolchain and signed release build |
| Physical-device test | BLOCKED | Install and exercise the exact release artifact |
| Play internal / pre-launch | BLOCKED | Play Console upload and report |
| Apple / Windows Connect packages | FUTURE RELEASE TRACK | Store identity/signing/package work after web/Android foundation |

## Minimum owner input when the autonomous path reaches a hard external gate

Only request the smallest missing input: real non-production test-account credentials or permission to create dedicated test accounts; PayFast provider state/credentials when settlement testing is reached; production-domain/hosting access if external verification cannot be observed; and Android keystore/Play Console actions when signing and store testing begin.

Until those external gates are evidenced, the correct release decision remains **RELEASE HOLD**, while independent engineering work continues to be driven to green.
